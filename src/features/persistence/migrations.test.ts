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
