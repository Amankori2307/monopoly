import { describe, expect, it } from 'vitest';
import { GameCommandType, PendingDecisionType, TurnPhase } from '../types/game.enums';
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
