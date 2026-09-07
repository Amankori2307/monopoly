import { describe, expect, it } from 'vitest';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { TableMode } from '../../domain/types/game.enums';
import type { GameState } from '../../domain/types/game.interfaces';
import { ViewerKind } from './viewer.enums';
import {
  HOT_SEAT_VIEWER,
  resolveViewer,
  viewerControls,
  viewerSeatId,
} from './viewer.utils';

/**
 * All of turn gating is built from one union and one predicate, so this is
 * where the rules about who may act are actually decided.
 */

const game = (over: Partial<GameState> = {}): GameState => ({
  ...createGameState(
    {
      name: 'Viewer Test',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    new SeededRandomSource(7)
  ),
  ...over,
});

describe('viewerControls', () => {
  it('lets the hot seat act as anybody, because it is everybody', () => {
    expect(viewerControls(HOT_SEAT_VIEWER, 'player-1')).toBe(true);
    expect(viewerControls(HOT_SEAT_VIEWER, 'player-2')).toBe(true);
  });

  it('lets a seated player act only as themselves', () => {
    const seated = { kind: ViewerKind.Seated, playerId: 'player-1' } as const;

    expect(viewerControls(seated, 'player-1')).toBe(true);
    expect(viewerControls(seated, 'player-2')).toBe(false);
  });

  it('lets a spectator act as nobody', () => {
    expect(viewerControls({ kind: ViewerKind.Spectator }, 'player-1')).toBe(false);
  });

  it('treats "nobody may act" as false even for the hot seat', () => {
    // Null is not a wildcard. Game over has no owner, and reading it as "anyone"
    // would re-enable controls the engine throws on.
    expect(viewerControls(HOT_SEAT_VIEWER, null)).toBe(false);
  });
});

describe('viewerSeatId', () => {
  it('is the seat for a seated viewer and null otherwise', () => {
    expect(viewerSeatId({ kind: ViewerKind.Seated, playerId: 'player-2' })).toBe(
      'player-2'
    );
    expect(viewerSeatId(HOT_SEAT_VIEWER)).toBeNull();
    expect(viewerSeatId({ kind: ViewerKind.Spectator })).toBeNull();
  });
});

describe('resolveViewer', () => {
  it('ignores a stored claim in a hot-seat game', () => {
    // tableMode is shared state on purpose: one device must not be able to
    // decide for itself that it controls the whole table.
    const viewer = resolveViewer(game({ tableMode: TableMode.HotSeat }), 'player-1');

    expect(viewer.kind).toBe(ViewerKind.HotSeat);
  });

  it('seats a viewer whose claim names a real player', () => {
    const online = game({ tableMode: TableMode.Online });

    expect(resolveViewer(online, online.playerOrder[1])).toEqual({
      kind: ViewerKind.Seated,
      playerId: online.playerOrder[1],
    });
  });

  it('degrades a claim naming somebody who is not in the game', () => {
    const viewer = resolveViewer(game({ tableMode: TableMode.Online }), 'player-ghost');

    // Never to the active player: that is the failure that would hand a
    // stranger somebody else's turn.
    expect(viewer.kind).toBe(ViewerKind.Spectator);
  });

  it('degrades an online game with no claim at all', () => {
    expect(resolveViewer(game({ tableMode: TableMode.Online }), null).kind).toBe(
      ViewerKind.Spectator
    );
  });

  it('has no viewer without a game', () => {
    expect(resolveViewer(null, 'player-1').kind).toBe(ViewerKind.Spectator);
  });
});
