import type { GameState } from '../../domain/types/game.interfaces';
import { logger } from '../../shared/utils/logger.utils';
import type { DecodedGameState } from './decodeGameState.interfaces';
import { migrateSavedGame, needsMigration } from './migrations';
import { gameStateSchema } from './schema';

/**
 * Turns an untrusted blob into a GameState, or explains why it cannot.
 *
 * Extracted out of `loadGame` so that a state arriving over the network gets
 * byte-identical treatment to one read off disk: the same migrations in the
 * same order, then the same schema, including the cross-field refinements that
 * a hand-rolled network check would inevitably forget. Two decoders would drift
 * the first time a shape changed, and only one of them would be the one an
 * attacker sends to.
 *
 * Migrations run BEFORE validation, because the schema describes the current
 * shape only - an older save has to be brought up to it or it fails to parse
 * and the game is lost.
 */

/**
 * zod's own `message` is a JSON dump of every issue - useful in a log, useless
 * on screen. The caller gets what is wrong and where; the full report goes to
 * the logger for whoever has to fix it.
 */
export const decodeGameState = (raw: unknown, source: string): DecodedGameState => {
  const wasBehind = needsMigration(raw);
  const result = gameStateSchema.safeParse(migrateSavedGame(raw));

  if (result.success) {
    return { game: result.data as GameState, wasBehind };
  }

  const [first] = result.error.issues;
  const where = first?.path.join('.') || 'the game';
  logger.error('persistence', `a game from ${source} failed validation`, {
    issues: result.error.issues,
  });

  throw new Error(
    `This game is damaged: ${first?.message ?? 'unexpected shape'} (at ${where}).`
  );
};
