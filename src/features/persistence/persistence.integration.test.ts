import { beforeEach, describe, expect, it } from 'vitest';
import { createGameState, executeGameCommand } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import {
  CardDeck,
  CardEffectKind,
  DeckName,
  GameCommandType,
  PendingDecisionType,
  SpaceKind,
} from '../../domain/types/game.enums';
import type { DeckCard, GameState } from '../../domain/types/game.interfaces';
import { loadGame, saveGame } from './persistence';

const createGame = (): GameState =>
  createGameState(
    {
      name: 'Persistence Test',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(11)
  );

describe('persistence round trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('restores a saved game unchanged', () => {
    const game = createGame();

    saveGame(game);

    expect(loadGame(game.id)).toEqual(game);
  });

  /**
   * The drawn card lives inside pendingDecision, which schema.ts validates with
   * `.passthrough()`. A top-level GameState field would be silently dropped by
   * the surrounding z.object - a bug that would only surface after a refresh,
   * leaving the player staring at a modal with no card in it.
   */
  it('keeps a drawn card across a save and load', () => {
    const game = createGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const card: DeckCard = {
      id: 'chest-bank-error',
      deck: CardDeck.CommunityChest,
      title: 'Bank error in your favor',
      description: 'Collect ₹200.',
      effect: { kind: CardEffectKind.Collect, amount: 200 },
    };
    const withCard: GameState = {
      ...game,
      pendingDecision: {
        type: PendingDecisionType.CardDraw,
        playerId,
        deck: DeckName.CommunityChest,
        card,
      },
    };

    saveGame(withCard);
    const loaded = loadGame(game.id);

    expect(loaded?.pendingDecision.type).toBe(PendingDecisionType.CardDraw);
    expect(loaded?.pendingDecision).toMatchObject({ card });
  });

  it('rejects a card-draw decision that lost its card', () => {
    const game = createGame();
    saveGame(game);
    const key = `monopoly.game.${game.id}.v1`;
    const stored = JSON.parse(localStorage.getItem(key) as string);
    stored.pendingDecision = { type: PendingDecisionType.CardDraw, playerId: 'player-1' };
    localStorage.setItem(key, JSON.stringify(stored));

    expect(() => loadGame(game.id)).toThrow();
  });

  // The whole path a real turn takes: engine -> save -> load, with the drawn
  // card still pending and its effect still unapplied.
  it('survives the draw, a reload, and then applies the effect once', () => {
    const game = createGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const chanceSpace = game.board.find((space) => space.kind === SpaceKind.Chance);
    if (!chanceSpace) {
      throw new Error('No Chance space on the board');
    }
    const card: DeckCard = {
      id: 'test-collect',
      deck: CardDeck.Chance,
      title: 'Windfall',
      description: 'Collect ₹250.',
      effect: { kind: CardEffectKind.Collect, amount: 250 },
    };
    // Seed 3 rolls 2+4, so start six spaces short of the Chance square.
    const staged: GameState = {
      ...game,
      decks: { ...game.decks, [DeckName.Chance]: [card, ...game.decks.chance] },
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: chanceSpace.index - 6 },
      },
    };
    const cashBefore = staged.players[playerId].cash;

    const drawn = executeGameCommand(
      staged,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(3)
    );
    saveGame(drawn.nextState);

    const reloaded = loadGame(game.id) as GameState;
    expect(reloaded.pendingDecision.type).toBe(PendingDecisionType.CardDraw);
    expect(reloaded.players[playerId].cash).toBe(cashBefore);

    const applied = executeGameCommand(
      reloaded,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    );

    expect(applied.nextState.players[playerId].cash).toBe(cashBefore + 250);
    expect(applied.nextState.pendingDecision.type).toBe(PendingDecisionType.None);
  });

  // Mortgaging flips a flag inside `ownership`, which schema.ts validates as
  // z.record(z.any()) - so it needs no version bump, but it does need proving.
  it('keeps a mortgaged site mortgaged across a save and load', () => {
    const game = createGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const street = game.board.find((space) => space.kind === SpaceKind.Street);
    if (!street) {
      throw new Error('No street on the board');
    }
    const owned: GameState = {
      ...game,
      ownership: {
        ...game.ownership,
        [street.id]: { ownerPlayerId: playerId, mortgaged: false, buildLevel: 0 },
      },
      activePlayerIndex: game.playerOrder.indexOf(playerId),
    };

    const mortgaged = executeGameCommand(
      owned,
      { type: GameCommandType.MortgageAsset, spaceId: street.id },
      new SeededRandomSource(3)
    ).nextState;
    saveGame(mortgaged);

    const loaded = loadGame(game.id) as GameState;

    expect(loaded.ownership[street.id].mortgaged).toBe(true);
    expect(loaded.players[playerId].cash).toBe(
      game.players[playerId].cash + street.mortgageValue
    );
    expect(loaded.version).toBe(mortgaged.version);
  });

  /**
   * The whole point of the step, end to end through the engine and storage: a
   * player who cannot pay raises the cash and settles, and the game continues.
   * Before this, the pending decision could never be cleared.
   */
  it('survives a debt the player cannot pay: mortgage, settle, continue', () => {
    const game = createGame();
    const [debtorId, creditorId] = game.playerOrder;
    const streets = game.board.filter((space) => space.kind === SpaceKind.Street);
    const debt = 200;

    const owing: GameState = {
      ...game,
      players: {
        ...game.players,
        [debtorId]: { ...game.players[debtorId], cash: debt - 1 },
      },
      ownership: {
        ...game.ownership,
        [streets[0].id]: { ownerPlayerId: debtorId, mortgaged: false, buildLevel: 0 },
      },
      activePlayerIndex: game.playerOrder.indexOf(debtorId),
      pendingDecision: {
        type: PendingDecisionType.AssetLiquidation,
        playerId: debtorId,
        amountDue: debt,
        creditorPlayerId: creditorId,
        reason: 'rent',
      },
    };
    saveGame(owing);

    // Reload first, so the debt is proven to survive persistence.
    let state = loadGame(game.id) as GameState;
    expect(state.pendingDecision.type).toBe(PendingDecisionType.AssetLiquidation);

    state = executeGameCommand(
      state,
      { type: GameCommandType.MortgageAsset, spaceId: streets[0].id },
      new SeededRandomSource(3)
    ).nextState;
    saveGame(state);

    // Mortgaging must not have cleared the debt.
    state = loadGame(game.id) as GameState;
    expect(state.pendingDecision.type).toBe(PendingDecisionType.AssetLiquidation);

    state = executeGameCommand(
      state,
      { type: GameCommandType.SettleDebt },
      new SeededRandomSource(3)
    ).nextState;
    saveGame(state);

    const settled = loadGame(game.id) as GameState;
    expect(settled.pendingDecision.type).toBe(PendingDecisionType.None);
    expect(settled.players[creditorId].cash).toBe(game.players[creditorId].cash + debt);
  });
});
