import { describe, expect, it } from 'vitest';
import { createGameState, executeGameCommand } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import {
  GameCommandType,
  PendingDecisionType,
  TurnPhase,
} from '../../domain/types/game.enums';
import { indiaEditionTheme } from '../../domain/themes/indiaEditionTheme';
import type { GameState } from '../../domain/types/game.interfaces';
import {
  makeTokenFinder,
  selectActivePlayer,
  selectPlayerOrderFromActive,
  selectCanEndTurn,
  selectCanRollDice,
  selectDecisionViewModel,
  selectHoldings,
  selectPlayerSummaries,
  selectPlayersByPosition,
} from './gameView.selectors';

const createGame = (): GameState =>
  createGameState(
    {
      name: 'Selector Test',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: indiaEditionTheme.id,
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(7)
  );

describe('selectPlayersByPosition', () => {
  it('groups both starting players on GO', () => {
    const game = createGame();

    const byPosition = selectPlayersByPosition(game);

    expect(byPosition.get(0)).toHaveLength(2);
    expect(byPosition.get(5)).toBeUndefined();
  });
});

describe('selectPlayerSummaries', () => {
  it('returns one summary per player', () => {
    const game = createGame();

    const summaries = selectPlayerSummaries(game, indiaEditionTheme);

    expect(summaries).toHaveLength(2);
    expect(summaries.every((s) => s.propertyCount === 0)).toBe(true);
    expect(summaries[0].token?.emoji).toBeTruthy();
  });

  // The card stack has no active-player marker: the player on top is the active
  // one, so this ordering is the only thing conveying whose turn it is.
  it('puts the active player first', () => {
    const game = createGame();
    game.activePlayerIndex = 1;

    const summaries = selectPlayerSummaries(game, indiaEditionTheme);

    expect(summaries[0].player.id).toBe(game.playerOrder[1]);
    expect(summaries[1].player.id).toBe(game.playerOrder[0]);
  });

  it('leaves the token undefined when no theme is supplied', () => {
    const game = createGame();

    expect(selectPlayerSummaries(game, undefined)[0].token).toBeUndefined();
  });
});

describe('selectPlayerOrderFromActive', () => {
  it('starts at the active player and keeps turn order after them', () => {
    const game = createGame();
    game.activePlayerIndex = 1;

    expect(selectPlayerOrderFromActive(game)).toEqual([
      game.playerOrder[1],
      game.playerOrder[0],
    ]);
  });

  it('is unchanged when the first player is active', () => {
    const game = createGame();
    game.activePlayerIndex = 0;

    expect(selectPlayerOrderFromActive(game)).toEqual(game.playerOrder);
  });

  it('includes every player exactly once', () => {
    const game = createGame();
    game.activePlayerIndex = 1;

    const rotated = selectPlayerOrderFromActive(game);

    expect(new Set(rotated).size).toBe(game.playerOrder.length);
  });
});

describe('selectHoldings', () => {
  it('is empty before anything is bought', () => {
    const game = createGame();

    expect(selectHoldings(game, game.playerOrder[0])).toEqual([]);
  });
});

describe('turn selectors', () => {
  it('allows rolling but not ending the turn at the start', () => {
    const game = createGame();

    expect(game.turn.phase).toBe(TurnPhase.AwaitRoll);
    expect(selectCanRollDice(game)).toBe(true);
    expect(selectCanEndTurn(game)).toBe(false);
  });

  it('names the active player', () => {
    const game = createGame();

    expect(selectActivePlayer(game).id).toBe(game.playerOrder[0]);
  });
});

describe('selectDecisionViewModel', () => {
  it('returns null when nothing is pending', () => {
    expect(selectDecisionViewModel(createGame())).toBeNull();
  });

  it('describes the buy decision after landing on an unowned property', () => {
    const game = createGame();
    game.players[game.playerOrder[game.activePlayerIndex]].position = 0;
    const { nextState } = executeGameCommand(
      game,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(2)
    );

    const decision = selectDecisionViewModel(nextState);

    expect(decision?.type).toBe(PendingDecisionType.LandedUnownedProperty);
    if (decision?.type === PendingDecisionType.LandedUnownedProperty) {
      expect(decision.price).toBeGreaterThan(0);
      expect(decision.spaceName).toBeTruthy();
    }
  });

  it('describes the auction after a decline', () => {
    const game = createGame();
    game.players[game.playerOrder[game.activePlayerIndex]].position = 0;
    const rolled = executeGameCommand(
      game,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(2)
    );
    const declined = executeGameCommand(rolled.nextState, {
      type: GameCommandType.DeclineLandedAsset,
    });

    const decision = selectDecisionViewModel(declined.nextState);

    expect(decision?.type).toBe(PendingDecisionType.AuctionBid);
    if (decision?.type === PendingDecisionType.AuctionBid) {
      expect(decision.minimumBid).toBeGreaterThan(0);
      expect(decision.activeBidderName).toBeTruthy();
    }
  });
});

describe('makeTokenFinder', () => {
  it('finds a token by id and returns undefined for unknown ids', () => {
    const find = makeTokenFinder(indiaEditionTheme);

    expect(find('elephant')?.emoji).toBe('🐘');
    expect(find('not-a-token')).toBeUndefined();
  });
});
