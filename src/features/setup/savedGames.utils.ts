import type { StoredGameIndexEntry } from '../../domain/types/game.interfaces';
import { readJoinCode } from '../multiplayer/seatClaim.utils';
import { resumeBlockedReason } from './resume.utils';
import { TABLE_MODE_LABEL } from './tableMode.constants';

/**
 * The two things a saved-game row needs that the index entry cannot carry.
 *
 * Computed here, in a feature, rather than in `RecentGamesList`: that component
 * is presentational and may not reach into `features/` at all (lint-enforced),
 * and a `localStorage` read has no business inside a render of a list.
 */
export const savedGameModeLabels = (
  games: StoredGameIndexEntry[]
): Record<string, string> =>
  Object.fromEntries(games.map((game) => [game.id, TABLE_MODE_LABEL[game.tableMode]]));

/**
 * Whether each save can be reopened. The join code is the part the index does
 * not know: it is per-device, so the same online save is resumable on the
 * device that joined it and not on any other.
 */
export const savedGameBlockedReasons = (
  games: StoredGameIndexEntry[]
): Record<string, string | null> =>
  Object.fromEntries(
    games.map((game) => [
      game.id,
      resumeBlockedReason(game.tableMode, readJoinCode(game.id) !== null),
    ])
  );
