import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import type { GameState } from '../../domain/types/game.interfaces';
import { createJoinCode, createOnlineSession } from './onlineSession';

/**
 * The session's job is to make a shared game behave. Two things matter most and
 * both are asserted here: a conflict hands back the truth rather than an error,
 * and nothing that happens on the network can throw into the command path - the
 * move has already been applied locally by the time any of this runs.
 */

vi.mock('@supabase/realtime-js', () => ({
  // The doorbell is transport, tested against the live project rather than
  // simulated here. Failing the import exercises the degrade-to-polling path.
  RealtimeClient: class {
    channel() {
      return {
        on: () => this,
        subscribe: () => this,
        send: () => undefined,
        unsubscribe: () => undefined,
      };
    }
    disconnect() {}
  },
}));

const config = { url: 'https://example.supabase.co', anonKey: 'anon' };

const aGame = (): GameState =>
  createGameState(
    {
      name: 'Online Test',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    new SeededRandomSource(3)
  );

const session = () =>
  createOnlineSession({
    config,
    gameId: 'game-1',
    joinCode: 'ABC123',
    seatId: 'player-1',
    deviceId: 'device-1',
  });

const respondWith = (body: unknown, ok = true) =>
  vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('publish', () => {
  it('reports an accepted write with its new revision', async () => {
    vi.stubGlobal('fetch', respondWith({ accepted: true, revision: 4 }));

    const outcome = await session().publish({
      game: aGame(),
      baseRevision: 3,
      command: null,
    });

    expect(outcome).toEqual({ status: 'accepted', revision: 4 });
  });

  it('hands back the authoritative game on a conflict', async () => {
    const theirs = { ...aGame(), turnNumber: 12 };
    vi.stubGlobal(
      'fetch',
      respondWith({ accepted: false, notFound: false, revision: 9, state: theirs })
    );

    const outcome = await session().publish({
      game: aGame(),
      baseRevision: 3,
      command: null,
    });

    expect(outcome.status).toBe('conflict');
    if (outcome.status !== 'conflict') return;
    expect(outcome.revision).toBe(9);
    // Decoded through the same path a disk load takes, not trusted raw.
    expect(outcome.game.turnNumber).toBe(12);
  });

  it('distinguishes a game that is gone from one that merely moved on', async () => {
    // A conflict means adopt what came back; `gone` means stop writing.
    vi.stubGlobal('fetch', respondWith({ accepted: false, notFound: true }));

    const outcome = await session().publish({
      game: aGame(),
      baseRevision: 3,
      command: null,
    });

    expect(outcome).toEqual({ status: 'gone' });
  });

  it('reports a transport failure instead of throwing into the command path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const outcome = await session().publish({
      game: aGame(),
      baseRevision: 3,
      command: null,
    });

    // The move is already applied and saved locally. A connection problem must
    // never surface as a refused command.
    expect(outcome.status).toBe('failed');
  });

  it('refuses a conflicting state this build cannot read, rather than adopting it', async () => {
    vi.stubGlobal(
      'fetch',
      respondWith({
        accepted: false,
        notFound: false,
        revision: 9,
        state: { junk: true },
      })
    );

    const outcome = await session().publish({
      game: aGame(),
      baseRevision: 3,
      command: null,
    });

    // Staying put beats adopting a half-understood game.
    expect(outcome.status).toBe('failed');
  });
});

describe('fetch', () => {
  it('returns null for a game that is not there, or a wrong code', async () => {
    vi.stubGlobal('fetch', respondWith(null));

    await expect(session().fetch()).resolves.toBeNull();
  });

  it('decodes what it is given', async () => {
    const game = aGame();
    vi.stubGlobal('fetch', respondWith({ revision: 2, state: game }));

    const update = await session().fetch();

    expect(update?.revision).toBe(2);
    expect(update?.game.id).toBe(game.id);
  });
});

describe('subscribe', () => {
  it('polls as a backstop, so a silent socket cannot freeze the game', async () => {
    const game = aGame();
    const stub = respondWith({ revision: 6, state: game });
    vi.stubGlobal('fetch', stub);
    const heard: number[] = [];

    const stop = session().subscribe((revision) => heard.push(revision));
    await vi.advanceTimersByTimeAsync(31_000);

    expect(heard).toContain(6);
    stop();
  });

  it('stops polling when the last listener goes', async () => {
    vi.stubGlobal('fetch', respondWith({ revision: 6, state: aGame() }));
    const heard: number[] = [];

    const stop = session().subscribe((revision) => heard.push(revision));
    stop();
    await vi.advanceTimersByTimeAsync(65_000);

    expect(heard).toHaveLength(0);
  });
});

describe('createJoinCode', () => {
  it('avoids characters that are misread aloud', () => {
    const codes = Array.from({ length: 200 }, () => createJoinCode());

    // No O/0, I/1 confusion - these get read out over a phone.
    expect(codes.join('')).not.toMatch(/[O0I1]/);
  });

  it('is six characters by default', () => {
    expect(createJoinCode()).toHaveLength(6);
  });
});
