import { describe, expect, it } from 'vitest';
import { GAME_STATE_VERSION } from '../../domain/constants/game.constants';
import { migrateSavedGame, needsMigration } from './migrations';

/**
 * A migration reads data written by an older build, so these fixtures are
 * hand-written v1 shapes rather than anything the current types can produce.
 */

const v1Save = () => ({
  version: 1,
  id: 'game-1',
  players: {
    'player-1': { id: 'player-1', name: 'Asha', jailFreeCards: 2, cash: 1500 },
    'player-2': { id: 'player-2', name: 'Vikram', jailFreeCards: 0, cash: 1500 },
  },
  turn: { phase: 'await_roll', doublesCount: 0, lastRoll: null, canRollAgain: false },
});

describe('migrating a v1 save', () => {
  it('brings it up to the current version', () => {
    const migrated = migrateSavedGame(v1Save()) as { version: number };

    expect(migrated.version).toBe(GAME_STATE_VERSION);
  });

  // The count could not say which deck a card came from, which is exactly why
  // it had to become the cards themselves.
  it('turns a held count into that many cards', () => {
    const migrated = migrateSavedGame(v1Save()) as {
      players: Record<string, { jailFreeCards: { deck: string }[] }>;
    };

    expect(migrated.players['player-1'].jailFreeCards).toHaveLength(2);
    expect(migrated.players['player-2'].jailFreeCards).toHaveLength(0);
    expect(migrated.players['player-1'].jailFreeCards[0].deck).toBe('chance');
  });

  it('adds the Speed Die fields, switched off', () => {
    const migrated = migrateSavedGame(v1Save()) as {
      useSpeedDie: boolean;
      turn: { speedDieFace: string | null };
      players: Record<string, { hasPassedGo: boolean }>;
    };

    expect(migrated.useSpeedDie).toBe(false);
    expect(migrated.turn.speedDieFace).toBeNull();
    expect(migrated.players['player-1'].hasPassedGo).toBe(false);
  });

  it('keeps everything it does not touch', () => {
    const migrated = migrateSavedGame(v1Save()) as {
      id: string;
      players: Record<string, { name: string; cash: number }>;
    };

    expect(migrated.id).toBe('game-1');
    expect(migrated.players['player-2']).toMatchObject({ name: 'Vikram', cash: 1500 });
  });
});

describe('migrateSavedGame', () => {
  it('leaves a current save alone', () => {
    const current = { version: GAME_STATE_VERSION, id: 'game-2' };

    expect(migrateSavedGame(current)).toEqual(current);
  });

  // Guessing at a shape from the future would corrupt it; validation is what
  // decides whether it loads.
  it('passes a future version through untouched', () => {
    const future = { version: GAME_STATE_VERSION + 5, id: 'game-3' };

    expect(migrateSavedGame(future)).toEqual(future);
  });

  it.each([null, undefined, 'not a game', 42])('survives %s', (value) => {
    expect(migrateSavedGame(value)).toBe(value);
  });

  it('knows when a save is behind', () => {
    expect(needsMigration({ version: 1 })).toBe(true);
    expect(needsMigration({ version: GAME_STATE_VERSION })).toBe(false);
    expect(needsMigration(null)).toBe(false);
  });
});

/**
 * A v1 save has to cross two versions to reach the current one, which is the
 * point of keying migrations by the version they upgrade from.
 */
describe('migrating across more than one version', () => {
  it('carries a v1 save the whole way', () => {
    const migrated = migrateSavedGame({
      version: 1,
      players: { 'player-1': { jailFreeCards: 1 } },
      turn: { phase: 'await_roll' },
    }) as {
      version: number;
      useSpeedDie: boolean;
      turn: { speedDieFace: string | null; pendingMonopolyAdvance: boolean };
      players: Record<string, { jailFreeCards: unknown[] }>;
    };

    expect(migrated.version).toBe(GAME_STATE_VERSION);
    // v2's fields and v3's, from one call.
    expect(migrated.useSpeedDie).toBe(false);
    expect(migrated.turn.speedDieFace).toBeNull();
    expect(migrated.turn.pendingMonopolyAdvance).toBe(false);
    expect(migrated.players['player-1'].jailFreeCards).toHaveLength(1);
  });

  it('upgrades a v2 save without touching what v2 already had', () => {
    const migrated = migrateSavedGame({
      version: 2,
      useSpeedDie: true,
      players: { 'player-1': { jailFreeCards: [], hasPassedGo: true } },
      turn: { phase: 'await_roll', speedDieFace: 'bus' },
    }) as {
      version: number;
      useSpeedDie: boolean;
      turn: { speedDieFace: string; pendingMonopolyAdvance: boolean };
      pendingAuctionSpaceIds: string[];
    };

    // Against the constant, not a literal: every later bump would otherwise
    // fail this test for the wrong reason.
    expect(migrated.version).toBe(GAME_STATE_VERSION);
    expect(migrated.useSpeedDie).toBe(true);
    expect(migrated.turn.speedDieFace).toBe('bus');
    expect(migrated.turn.pendingMonopolyAdvance).toBe(false);
    expect(migrated.pendingAuctionSpaceIds).toEqual([]);
  });

  // No save can have been written mid-queue, so it starts empty.
  it('gives a v3 save an empty auction queue', () => {
    const migrated = migrateSavedGame({
      version: 3,
      useSpeedDie: false,
    }) as { version: number; pendingAuctionSpaceIds: string[] };

    expect(migrated.version).toBe(GAME_STATE_VERSION);
    expect(migrated.pendingAuctionSpaceIds).toEqual([]);
  });
});

/**
 * v4 -> v5, and v7 -> v8 on top of it: an event carries its own classification.
 *
 * v5 gave every event a `tone`, read from the wording it was written with. v8
 * widened that into a `cue`, because the same field decides the sound as well as
 * the toast's colour - so a save this old arrives with a cue, and only the three
 * an older build could have known.
 */
describe('giving old events a cue', () => {
  const migrate = (history: { message: string }[]) =>
    migrateSavedGame({ version: 4, history }) as {
      version: number;
      history: { message: string; cue: string; tone?: unknown }[];
    };

  it('reads money leaving a player as a debit', () => {
    const migrated = migrate([
      { message: 'Asha paid the bank ₹100 - Income Tax.' },
      { message: 'Asha bought Delhi for ₹350.' },
    ]);

    expect(migrated.history.map((event) => event.cue)).toEqual(['debit', 'debit']);
  });

  it('reads money arriving as a credit', () => {
    expect(
      migrate([{ message: 'Asha collected ₹200 - passing GO.' }]).history[0].cue
    ).toBe('credit');
  });

  // The finer cues did not exist when these messages were written, so anything
  // that is not plainly money is silent rather than guessed at.
  it('gives anything else no cue at all', () => {
    expect(migrate([{ message: 'Asha rolled 3 and 5.' }]).history[0].cue).toBe('none');
  });

  it('leaves no tone behind', () => {
    const migrated = migrate([{ message: 'Asha collected ₹200 - passing GO.' }]);

    expect(migrated.history[0]).not.toHaveProperty('tone');
  });

  it('copes with a save that has no history at all', () => {
    const migrated = migrateSavedGame({ version: 4 }) as {
      version: number;
      history: unknown[];
    };

    expect(migrated.version).toBe(GAME_STATE_VERSION);
    expect(migrated.history).toEqual([]);
  });
});

/**
 * v5 -> v6: an auction records its own bids and passes.
 *
 * The old shape never kept the sequence, so a save caught mid-auction cannot
 * have its bidding reconstructed - it reopens on the opening line alone.
 */
describe('giving an in-flight auction a ledger', () => {
  const auctionSave = (auctionState: unknown) =>
    migrateSavedGame({ version: 5, auctionState }) as {
      version: number;
      auctionState: {
        ledger?: { kind: string; playerId: null; amount: number }[];
      } | null;
    };

  it('opens the ledger at the price the auction started from', () => {
    const migrated = auctionSave({
      id: 'a',
      spaceId: 'space-1',
      startPrice: 50,
      minIncrement: 1,
      activeBidderOrder: ['player-1', 'player-2'],
      activeBidderIndex: 0,
      highestBid: 120,
      highestBidderId: 'player-2',
      passedPlayerIds: [],
    });

    expect(migrated.version).toBe(GAME_STATE_VERSION);
    expect(migrated.auctionState?.ledger).toEqual([
      { kind: 'start', playerId: null, amount: 50 },
    ]);
  });

  it('leaves a save with no auction running alone', () => {
    const migrated = auctionSave(null);

    expect(migrated.version).toBe(GAME_STATE_VERSION);
    expect(migrated.auctionState).toBeNull();
  });

  // It is reading data an older build wrote, so it cannot trust the shape.
  it('copes with an auction that has no start price', () => {
    const migrated = auctionSave({ id: 'a', spaceId: 'space-1' });

    expect(migrated.auctionState?.ledger).toEqual([
      { kind: 'start', playerId: null, amount: 0 },
    ]);
  });
});

/**
 * v6 -> v7: each player records which way they last travelled.
 *
 * The direction was an argument that went nowhere before this, so an older save
 * cannot say - every player comes back with none, and the animation reads that
 * as forward, which is every ordinary move.
 */
describe('giving players a recorded direction', () => {
  const playersSave = (players: unknown) =>
    migrateSavedGame({ version: 6, players }) as {
      version: number;
      players: Record<string, { lastMove: unknown; cash?: number }>;
    };

  it('gives every player no direction, keeping the rest of them', () => {
    const migrated = playersSave({
      'player-1': { id: 'player-1', cash: 1500, position: 4 },
      'player-2': { id: 'player-2', cash: 900, position: 17 },
    });

    expect(migrated.version).toBe(GAME_STATE_VERSION);
    expect(migrated.players['player-1'].lastMove).toBeNull();
    expect(migrated.players['player-2'].lastMove).toBeNull();
    expect(migrated.players['player-2'].cash).toBe(900);
  });

  it('copes with a save that has no players at all', () => {
    const migrated = migrateSavedGame({ version: 6 }) as { version: number };

    expect(migrated.version).toBe(GAME_STATE_VERSION);
  });
});
