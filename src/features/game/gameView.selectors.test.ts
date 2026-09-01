import { describe, expect, it } from 'vitest';
import { createGameState, executeGameCommand } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import {
  GameCommandType,
  GameStatus,
  PendingDecisionType,
  SpaceKind,
  TurnPhase,
} from '../../domain/types/game.enums';
import { indiaEditionTheme } from '../../domain/themes/indiaEditionTheme';
import { isStreetSpace } from '../../domain/rules/space.utils';
import { selectIsJailRoll } from './gameView.selectors';
import type { GameState, OwnableSpace } from '../../domain/types/game.interfaces';
import {
  makeTokenFinder,
  selectHasAvailableAction,
  selectActivePlayer,
  selectPlayerOrderFromActive,
  selectCanEndTurn,
  selectCanRollDice,
  selectDecisionViewModel,
  selectGroupedHoldings,
  selectPlayerSummaries,
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
      // The whole space travels with the decision so the UI can show the deed.
      expect(decision.space.price).toBeGreaterThan(0);
      expect(decision.space.name).toBeTruthy();
      expect(decision.space.id).toBeTruthy();
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

describe('a jailed player always has something to do', () => {
  const jailedGame = (): GameState => {
    const game = createGame();
    const activeId = game.playerOrder[game.activePlayerIndex];
    game.players[activeId].inJail = true;
    return game;
  };

  // Regression: `pendingDecision` and the player's `inJail` drifted apart. The
  // UI keyed jail actions off the flag, so the player was offered a plain roll
  // the engine rejected - and once that was guarded, nothing at all: a deadlock.
  it('offers the jail decision even when pendingDecision drifted to none', () => {
    const game = jailedGame();
    game.pendingDecision = { type: PendingDecisionType.None };
    game.turn = { ...game.turn, phase: TurnPhase.AwaitRoll };

    const decision = selectDecisionViewModel(game);

    expect(decision?.type).toBe(PendingDecisionType.JailChoice);
    expect(selectCanRollDice(game)).toBe(true);
    expect(selectHasAvailableAction(game)).toBe(true);
  });

  it('routes the roll to the jail attempt, not a plain roll', () => {
    const game = jailedGame();
    game.pendingDecision = { type: PendingDecisionType.None };

    expect(selectIsJailRoll(game)).toBe(true);
  });

  it('still offers the jail decision with the flag set', () => {
    const game = jailedGame();
    game.pendingDecision = {
      type: PendingDecisionType.JailChoice,
      playerId: game.playerOrder[game.activePlayerIndex],
    };

    expect(selectDecisionViewModel(game)?.type).toBe(PendingDecisionType.JailChoice);
  });

  it('does not offer a roll while a blocking decision is open', () => {
    const game = jailedGame();
    game.pendingDecision = {
      type: PendingDecisionType.AssetLiquidation,
      playerId: game.playerOrder[game.activePlayerIndex],
      amountDue: 50,
      creditorPlayerId: null,
      reason: 'Jail fine',
    };

    expect(selectCanRollDice(game)).toBe(false);
  });
});

describe('selectHasAvailableAction', () => {
  it('is true for a fresh game', () => {
    expect(selectHasAvailableAction(createGame())).toBe(true);
  });

  it('is true at every phase of an ordinary turn', () => {
    const game = createGame();

    for (const phase of [
      TurnPhase.AwaitRoll,
      TurnPhase.AwaitExtraRollOrEnd,
      TurnPhase.TurnComplete,
    ]) {
      expect(selectHasAvailableAction({ ...game, turn: { ...game.turn, phase } })).toBe(
        true
      );
    }
  });
});

describe('selectGroupedHoldings', () => {
  it('is empty before anything is bought', () => {
    const game = createGame();

    expect(selectGroupedHoldings(game, game.playerOrder[0])).toEqual([]);
  });

  // The holdings drawer draws one deck rather than per-group lists, so the
  // grouping only survives if the selector emits colour groups contiguously in
  // board order. This is the seam the drawer relies on.
  it('groups a mixed portfolio into contiguous colour sets, then railways', () => {
    const game = createGame();
    const owner = game.playerOrder[0];
    const streets = game.board.filter(isStreetSpace);
    const railway = game.board.find(
      (space) => space.kind === SpaceKind.Railway
    ) as OwnableSpace;

    // Interleave the picks so a selector that merely preserved input order
    // would fail: two groups taken alternately, plus a railway in the middle.
    const [firstA, secondA] = streets.filter(
      (s) => s.colorGroup === streets[0].colorGroup
    );
    const otherGroup = streets.find((s) => s.colorGroup !== streets[0].colorGroup);
    if (!firstA || !secondA || !otherGroup) {
      throw new Error('Board has too few streets to group');
    }
    const owned: GameState = {
      ...game,
      ownership: { ...game.ownership },
    };
    for (const space of [firstA, otherGroup, railway, secondA]) {
      owned.ownership[space.id] = {
        ...owned.ownership[space.id],
        ownerPlayerId: owner,
      };
    }

    const sections = selectGroupedHoldings(owned, owner);
    const flattened = sections.flatMap((section) => section.spaces);

    // Same-colour sites end up adjacent even though they were bought apart...
    expect(flattened.map((space) => space.id)).toEqual([
      firstA.id,
      secondA.id,
      otherGroup.id,
      railway.id,
    ]);
    // ...and railways sort after every street group, never among them.
    expect(sections[sections.length - 1].spaces).toEqual([railway]);
    expect(flattened).toHaveLength(4);
  });
});

describe('a finished game', () => {
  const finishedGame = (): GameState => {
    const game = createGame();
    return {
      ...game,
      status: GameStatus.Completed,
      winnerPlayerId: game.playerOrder[1],
      pendingDecision: { type: PendingDecisionType.GameOver },
      turn: { ...game.turn, phase: TurnPhase.TurnComplete, canRollAgain: false },
    };
  };

  // The phase sits at TurnComplete when a game ends, which used to read as
  // "you may end your turn" - and the engine throws on every command once the
  // game is complete, so that button was a crash waiting to be clicked.
  it('offers no way to end the turn', () => {
    expect(selectCanEndTurn(finishedGame())).toBe(false);
  });

  it('offers no roll', () => {
    expect(selectCanRollDice(finishedGame())).toBe(false);
  });

  it('shows the winner', () => {
    const game = finishedGame();
    const decision = selectDecisionViewModel(game);

    expect(decision).toEqual({
      type: PendingDecisionType.GameOver,
      winnerName: game.players[game.playerOrder[1]].name,
    });
  });
});
