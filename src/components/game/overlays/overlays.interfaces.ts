import type { PropertyActionDescriptor } from '../../../domain/rules/playerActions.utils';
import type { BoardSpace, OwnershipState } from '../../../domain/types/game.interfaces';
export type { SpaceOwnerMark } from '../board/board.interfaces';
import type { SpaceOwnerMark } from '../board/board.interfaces';

/**
 * Shared shapes for the game overlays.
 *
 * These live in the component layer, not in features/, because presentational
 * components may not import from features - the feature layer builds these and
 * passes them down. See docs/conventions.md section 5.
 */

/** How a toast reads: money out, money in, or anything else. */
export type ToastTone = 'credit' | 'debit' | 'neutral';

export interface Toast {
  /** The originating GameEvent id, so the same event cannot toast twice. */
  id: string;
  message: string;
  tone: ToastTone;
}

/**
 * A space in the context of who owns it, built by the feature layer.
 *
 * Bundled rather than passed as six props: the panel's three states are all
 * decided by ownership, so they travel together.
 */
export interface SitePanelViewModel {
  /** True when someone other than the viewing player owns the space. */
  isOwnedByOpponent: boolean;
  ownerMark?: SpaceOwnerMark;
  ownership?: OwnershipState;
  /** Empty unless the viewing player owns the space. */
  siteActions: PropertyActionDescriptor[];
  space: BoardSpace | null;
}
