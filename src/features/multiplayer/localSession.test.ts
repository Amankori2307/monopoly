import { describe, expect, it, vi } from 'vitest';
import { createLocalSession } from './localSession';
import { createSessionRegistry } from './sessionRegistry';
import type { GameSession } from './gameSession.interfaces';

/**
 * The local session exists so there is one command path rather than two. It has
 * to be total - no throwing, no nulls a caller must guard - because a hot-seat
 * game must behave identically to how it did before the seam existed, not
 * merely equivalently.
 */

describe('createLocalSession', () => {
  it('is not online, so no online UI is offered for a hot-seat game', () => {
    expect(createLocalSession().isOnline).toBe(false);
  });

  it('accepts every publish without doing anything', async () => {
    const outcome = await createLocalSession().publish({
      game: {} as never,
      baseRevision: 0,
      command: null,
    });

    expect(outcome).toEqual({ status: 'accepted', revision: 0 });
  });

  it('has nowhere to fetch from', async () => {
    await expect(createLocalSession().fetch()).resolves.toBeNull();
  });

  it('returns a working unsubscribe, so a caller cleanup is honest', () => {
    const unsubscribe = createLocalSession().subscribe(() => undefined);

    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });

  it('closes twice without complaint', () => {
    const session = createLocalSession();

    expect(() => {
      session.close();
      session.close();
    }).not.toThrow();
  });
});

describe('createSessionRegistry', () => {
  const fakeSession = (): GameSession => ({
    isOnline: true,
    publish: vi.fn().mockResolvedValue({ status: 'accepted', revision: 1 }),
    fetch: vi.fn().mockResolvedValue(null),
    subscribe: vi.fn().mockReturnValue(() => undefined),
    close: vi.fn(),
  });

  it('starts local, so there is always a session and no caller null-checks', () => {
    expect(createSessionRegistry().current.isOnline).toBe(false);
  });

  it('closes the session it replaces, so a socket is never orphaned', () => {
    const registry = createSessionRegistry();
    const first = fakeSession();
    registry.replace(first);

    registry.replace(fakeSession());

    expect(first.close).toHaveBeenCalledTimes(1);
  });

  it('goes back to a local session on reset, closing the online one', () => {
    const registry = createSessionRegistry();
    const online = fakeSession();
    registry.replace(online);

    registry.reset();

    expect(online.close).toHaveBeenCalledTimes(1);
    expect(registry.current.isOnline).toBe(false);
  });

  it('gives each store its own registry', () => {
    // Two tests in one file would otherwise share a session, which is the
    // reason this is a holder rather than an exported `let`.
    expect(createSessionRegistry()).not.toBe(createSessionRegistry());
  });
});
