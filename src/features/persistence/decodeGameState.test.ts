import { describe, expect, it, vi } from 'vitest';
import { GAME_STATE_VERSION } from '../../domain/constants/game.constants';
import { PendingDecisionType } from '../../domain/types/game.enums';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { decodeGameState } from './decodeGameState';

/**
 * The decoder is now the front door for two very different callers: a save off
 * this device's disk, and a state another player published. It has to treat
 * them identically - the moment there are two decoders, the one an attacker
 * sends to is the one that drifts.
 */

const validGame = () =>
  JSON.parse(
    JSON.stringify(
      createGameState(
        {
          name: 'Decode Test',
          playerConfigs: [
            { name: 'Asha', tokenId: 'elephant' },
            { name: 'Vikram', tokenId: 'train' },
          ],
          themeId: 'india-edition',
          createdAt: '2026-09-01T00:00:00.000Z',
        },
        new SeededRandomSource(5)
      )
    )
  );

describe('decodeGameState', () => {
  it('accepts a current game and reports it was not behind', () => {
    const { game, wasBehind } = decodeGameState(validGame(), 'a test');

    expect(game.version).toBe(GAME_STATE_VERSION);
    expect(wasBehind).toBe(false);
  });

  it('migrates an older shape and says so', () => {
    const old = validGame();
    old.version = 1;
    old.players[old.playerOrder[0]].jailFreeCards = 1;
    delete old.useSpeedDie;

    const { game, wasBehind } = decodeGameState(old, 'a test');

    expect(wasBehind).toBe(true);
    expect(game.version).toBe(GAME_STATE_VERSION);
    expect(Array.isArray(game.players[game.playerOrder[0]].jailFreeCards)).toBe(true);
  });

  it('enforces the cross-field checks, not just the field shapes', () => {
    // The refinements are the reason a network path must reuse this rather
    // than re-deriving a "looks like a game" check: a board of 39 spaces has
    // no individually invalid field in it.
    const short = validGame();
    short.board = short.board.slice(0, 39);

    expect(() => decodeGameState(short, 'another device')).toThrow(/40 spaces/i);
  });

  it('refuses a playerOrder naming somebody who is not there', () => {
    const orphan = validGame();
    orphan.playerOrder = [...orphan.playerOrder, 'player-ghost'];

    expect(() => decodeGameState(orphan, 'another device')).toThrow(/does not contain/i);
  });

  it('strips a key hung off a pending decision', () => {
    const injected = validGame();
    injected.pendingDecision = {
      type: PendingDecisionType.JailChoice,
      playerId: injected.playerOrder[0],
      __injected: 'nope',
    };

    const { game } = decodeGameState(injected, 'another device');

    expect(game.pendingDecision).not.toHaveProperty('__injected');
  });

  it('names its source in the log, so a bad save and a bad peer are tellable apart', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => decodeGameState({ nonsense: true }, 'another device')).toThrow();

    const logged = error.mock.calls.flat().join(' ');
    expect(logged).toContain('another device');
    error.mockRestore();
  });

  it('reports damage as a sentence rather than a zod dump', () => {
    expect(() => decodeGameState({ nonsense: true }, 'a test')).toThrow(
      /This game is damaged/
    );
  });
});
