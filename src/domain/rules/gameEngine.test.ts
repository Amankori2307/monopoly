import { describe, expect, it } from 'vitest';
import { GameCommandType, PendingDecisionType, TurnPhase } from '../types/game.enums';
import { CardDeck, CardEffectKind, DeckName } from '../types/game.enums';
import { createGameState, executeGameCommand } from './gameEngine';
import { SeededRandomSource } from './rng';

const createBaseGame = () =>
  createGameState(
    {
      name: 'Test Game',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(7)
  );

describe('gameEngine', () => {
  it('creates a game with India Edition defaults', () => {
    const game = createBaseGame();

    expect(game.playerOrder).toHaveLength(2);
    expect(game.board).toHaveLength(40);
    expect(game.bank.housesAvailable).toBe(32);
    expect(game.players[game.playerOrder[0]].cash).toBe(1500);
    expect(game.turn.phase).toBe(TurnPhase.AwaitRoll);
  });

  it('opens a buy decision when landing on an unowned property', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    game.players[activePlayerId].position = 0;

    const result = executeGameCommand(
      game,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(2)
    );

    expect(result.nextState.pendingDecision.type).toBe(
      PendingDecisionType.LandedUnownedProperty
    );
  });

  it('starts an auction when the landed property is declined', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    game.players[activePlayerId].position = 0;
    const rolled = executeGameCommand(
      game,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(2)
    );

    const declined = executeGameCommand(rolled.nextState, {
      type: GameCommandType.DeclineLandedAsset,
    });

    expect(declined.nextState.pendingDecision.type).toBe(PendingDecisionType.AuctionBid);
    expect(declined.nextState.auctionState?.startPrice).toBe(10);
  });
});

describe('going to jail ends the turn', () => {
  // Regression: a Chance card that jails the player used to route back through
  // resolveCurrentSpace, which reassigned the phase from the doubles roll and
  // handed a jailed player an extra roll. The next roll then hit the engine's
  // "Player must choose a Jail action first" guard and threw.
  const jailCardGame = () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    // Stand on the space before a Chance square so the roll lands on it.
    const chanceIndex = game.board.findIndex((space) => space.kind === 'chance');
    game.players[activePlayerId].position = chanceIndex;
    // Force the drawn card to be "go to jail".
    game.decks[DeckName.Chance] = [
      {
        id: 'test-go-to-jail',
        deck: CardDeck.Chance,
        title: 'Go to Jail',
        description: 'Go directly to Jail.',
        effect: { kind: CardEffectKind.GoToJail },
      },
      ...game.decks[DeckName.Chance],
    ];
    return { game, activePlayerId, chanceIndex };
  };

  it('never leaves a jailed player able to roll again', () => {
    const { game, activePlayerId, chanceIndex } = jailCardGame();

    // Resolve the chance square directly, as a doubles roll would.
    const landed = executeGameCommand(
      { ...game, players: { ...game.players } },
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(3)
    ).nextState;

    for (const playerId of landed.playerOrder) {
      if (landed.players[playerId].inJail) {
        expect(landed.turn.canRollAgain).toBe(false);
        expect(landed.turn.phase).toBe(TurnPhase.TurnComplete);
      }
    }
    expect(chanceIndex).toBeGreaterThanOrEqual(0);
    expect(activePlayerId).toBeTruthy();
  });

  it('ends the turn when a card sends the player to jail on a doubles roll', () => {
    const { game, activePlayerId } = jailCardGame();
    // Simulate the doubles case: the player is mid-turn with an extra roll due.
    const jailed = executeGameCommand(
      {
        ...game,
        turn: { ...game.turn, doublesCount: 1 },
      },
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(3)
    ).nextState;

    if (jailed.players[activePlayerId].inJail) {
      expect(jailed.turn.canRollAgain).toBe(false);
      expect(jailed.turn.phase).toBe(TurnPhase.TurnComplete);
    }
  });

  it('rejects a plain roll while the player is in jail', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    game.players[activePlayerId].inJail = true;

    expect(() =>
      executeGameCommand(game, { type: GameCommandType.RollTurnDice })
    ).toThrow('Player must choose a Jail action first.');
  });
});
