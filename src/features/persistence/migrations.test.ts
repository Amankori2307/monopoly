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
