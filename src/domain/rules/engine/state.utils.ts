import { MAX_HISTORY_EVENTS } from '../../constants/game.constants';
import { GameEventCue } from '../../types/game.enums';
import type {
  BoardSpace,
  GameEvent,
  GameState,
  OwnershipState,
  PlayerId,
  PlayerState,
  ThemeConfig,
} from '../../types/game.interfaces';
import { availableThemes, indiaEditionTheme } from '../../themes/indiaEditionTheme';

/**
 * State plumbing: the small, boring operations every other engine module is
 * built from.
 *
 * Nothing here knows a rule. They exist so that the modules that do know rules
 * never have to spread an object by hand, and so "append an event" or "update
 * one player" means exactly one thing everywhere.
 *
 * This module depends on no other engine module, which is what keeps the rest
 * of the engine a directed graph rather than a knot.
 */

/**
 * One history line.
 *
 * `tone` defaults to neutral because most events move no money; the three
 * choke points that do pass it explicitly, which is why nothing else has to
 * remember to.
 */
export const createEvent = (
  turnNumber: number,
  message: string,
  cue: GameEventCue = GameEventCue.None
): GameEvent => ({
  id: crypto.randomUUID(),
  turnNumber,
  createdAt: new Date().toISOString(),
  message,
  cue,
});

/**
 * Money as it appears in an event message. Every amount the engine logs goes
 * through here, so the symbol follows the active theme rather than being
 * written into the sentence.
 */
export const money = (state: GameState, amount: number): string =>
  `${getThemeOrDefault(state.themeId).currencySymbol}${amount}`;

export const getThemeOrDefault = (themeId: string): ThemeConfig =>
  availableThemes.find((theme) => theme.id === themeId) ?? indiaEditionTheme;

export const getPlayerById = (state: GameState, playerId: PlayerId): PlayerState =>
  state.players[playerId];

export const getActivePlayer = (state: GameState): PlayerState =>
  state.players[state.playerOrder[state.activePlayerIndex]];

export const updatePlayer = (
  state: GameState,
  playerId: PlayerId,
  updater: (player: PlayerState) => PlayerState
): GameState => ({
  ...state,
  players: {
    ...state.players,
    [playerId]: updater(state.players[playerId]),
  },
});

export const updateSpaceOwnership = (
  state: GameState,
  spaceId: string,
  updater: (ownership: OwnershipState) => OwnershipState
): GameState => ({
  ...state,
  ownership: {
    ...state.ownership,
    [spaceId]: updater(state.ownership[spaceId]),
  },
});

export const appendEvents = (state: GameState, events: GameEvent[]): GameState => ({
  ...state,
  updatedAt: new Date().toISOString(),
  history: [...events, ...state.history].slice(0, MAX_HISTORY_EVENTS),
});

export const getSpaceById = (state: GameState, spaceId: string): BoardSpace => {
  const space = state.board.find((boardSpace) => boardSpace.id === spaceId);
  if (!space) {
    throw new Error(`Unknown space ${spaceId}`);
  }
  return space;
};

/**
 * The events one command appended.
 *
 * History is newest-first and capped, so normally the delta is the leading
 * slice. Once the cap is reached the length stops growing, and the ids are the
 * only way to tell what is new - which is exactly when a long game would
 * otherwise stop reporting anything.
 */
export const eventsSince = (before: GameEvent[], after: GameEvent[]): GameEvent[] => {
  const added = after.length - before.length;
  if (added > 0) {
    return after.slice(0, added);
  }
  const seen = new Set(before.map((event) => event.id));
  return after.filter((event) => !seen.has(event.id));
};
