import { getAssetHolderId } from '../../domain/rules/actor.utils';
import type { GameState, ThemeConfig } from '../../domain/types/game.interfaces';
import { selectSpaceOwnerMarks } from './boardOwnership.utils';
import { makeTokenFinder, selectPlayerSummaries } from './gameView.selectors';
import { selectSitePanel } from './sitePanel.utils';
import type { UseGameOverlaysResult } from './hooks/useGameOverlays';

/**
 * Everything the board and its panels are rendered from, derived in one place.
 *
 * A selector rather than a hook, despite being extracted from a component: it
 * holds no state and runs no effect, so naming it `use*` would have made it a
 * hook by convention only - and one called after an early return, which is a
 * rules-of-hooks violation waiting to be reported.
 */
export const selectBoardViewModels = (
  game: GameState,
  theme: ThemeConfig | undefined,
  overlays: UseGameOverlaysResult
) => {
  const findToken = makeTokenFinder(theme);
  const summaries = selectPlayerSummaries(game, theme);
  const selectedSpace =
    game.board.find((space) => space.id === overlays.selectedSpaceId) ?? null;
  const ownerMarks = selectSpaceOwnerMarks(game, findToken);

  return {
    findToken,
    summaries,
    selectedSummary:
      summaries.find((summary) => summary.player.id === overlays.selectedPlayerId) ??
      null,
    ownerMarks,
    // The asset holder, not the active player: during a liquidation the debtor
    // raises the cash, and a collect-from-each card can bill someone whose turn
    // it is not. See actor.utils.
    sitePanel: selectSitePanel(game, getAssetHolderId(game), selectedSpace, ownerMarks),
  };
};
