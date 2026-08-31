import type {
  SitePanelViewModel,
  SpaceOwnerMark,
} from '../../components/game/overlays/overlays.interfaces';
import { getSiteActions } from '../../domain/rules/playerActions.utils';
import type { BoardSpace, GameState, PlayerId } from '../../domain/types/game.interfaces';

/**
 * What the site panel should show for the picked space.
 *
 * Ownership decides all three states, so it is resolved once here rather than
 * re-derived per prop at the call site.
 */
export const selectSitePanel = (
  game: GameState,
  viewerPlayerId: PlayerId,
  space: BoardSpace | null,
  ownerMarks: Record<string, SpaceOwnerMark>
): SitePanelViewModel => {
  if (!space) {
    return { isOwnedByOpponent: false, siteActions: [], space: null };
  }

  const ownership = game.ownership[space.id];
  const ownerPlayerId = ownership?.ownerPlayerId ?? null;

  return {
    isOwnedByOpponent: Boolean(ownerPlayerId && ownerPlayerId !== viewerPlayerId),
    ownerMark: ownerMarks[space.id],
    ownership,
    siteActions: getSiteActions(game, space.id, viewerPlayerId),
    space,
  };
};
