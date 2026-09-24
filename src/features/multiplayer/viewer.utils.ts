import { TableMode } from '../../domain/types/game.enums';
import { getExpectedActorId } from '../../domain/rules/actor.utils';
import type { GameState, PlayerId } from '../../domain/types/game.interfaces';
import { ViewerKind } from './viewer.enums';
import type { Viewer } from './viewer.interfaces';

/**
 * Who is at this screen.
 *
 * The whole of turn gating is built from one union and one predicate, so there
 * is exactly one place that answers "may this device do that".
 *
 * Hot-seat is a member of the union rather than `viewer.playerId ===
 * activePlayer.id`. That shortcut breaks in precisely the two places it
 * matters: the auction's current bidder rotates independently of the turn, and
 * a trade's recipient is never the active player. Making it a member means
 * those cases are handled by construction instead of remembered.
 */

/** The hot-seat viewer, which is every local game. */
export const HOT_SEAT_VIEWER: Viewer = { kind: ViewerKind.HotSeat };

export const SPECTATOR: Viewer = { kind: ViewerKind.Spectator };

/**
 * May this viewer act as `playerId`?
 *
 * Null means "nobody may act", which is not the same as "anybody may" - so it
 * is false even for the hot seat.
 */
export const viewerControls = (viewer: Viewer, playerId: PlayerId | null): boolean => {
  if (playerId === null) {
    return false;
  }
  if (viewer.kind === ViewerKind.HotSeat) {
    return true;
  }
  return viewer.kind === ViewerKind.Seated && viewer.playerId === playerId;
};

/** The seat this viewer holds, or null when they hold no particular one. */
export const viewerSeatId = (viewer: Viewer): PlayerId | null =>
  viewer.kind === ViewerKind.Seated ? viewer.playerId : null;

/**
 * Turns a stored seat claim into a viewer, failing closed at every step.
 *
 * A hot-seat game ignores the claim entirely: `tableMode` is shared state, so
 * one device cannot decide for itself that it controls the table. An online
 * game with a claim naming a player who is not in it degrades to a spectator -
 * never to the active player, which is the failure that would silently hand
 * somebody else's turn to a stranger.
 */
export const resolveViewer = (
  game: GameState | null,
  claimedSeatId: PlayerId | null
): Viewer => {
  if (!game) {
    return SPECTATOR;
  }
  /**
   * While a bot is the one to act, this device is WATCHING.
   *
   * Expressed as the viewer rather than as a clause inside `selectCanRollDice`,
   * and that is not a style choice: `selectHasAvailableAction` - the deadlock
   * detector - calls that selector through `HOT_SEAT_VIEWER` on purpose, so a
   * bot clause inside it would report a deadlock on every single bot turn and
   * log an error for each one. The detector is asking a different question
   * ("does the game have a legal move for whoever owns it"), and a bot's turn
   * has one.
   *
   * Spectator, because that is exactly the standing: nothing to press, and the
   * board still to watch. Without it the hot seat controls every chair
   * including the machine's, so Roll sat live during a bot's turn - and a
   * player who pressed it raced the bot's own pending command, which then
   * arrived into a phase it no longer fitted and threw out of the engine.
   *
   * `getExpectedActorId`, never the active player: the auction's current bidder
   * rotates independently of the turn, and a trade's recipient is never the
   * active player - the two cases this file already exists to get right.
   */
  const actorId = getExpectedActorId(game);
  if (actorId !== null && game.players[actorId]?.isBot) {
    return SPECTATOR;
  }
  if (game.tableMode === TableMode.HotSeat) {
    return HOT_SEAT_VIEWER;
  }
  if (claimedSeatId && game.players[claimedSeatId]) {
    return { kind: ViewerKind.Seated, playerId: claimedSeatId };
  }
  return SPECTATOR;
};
