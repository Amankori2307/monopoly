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
});
