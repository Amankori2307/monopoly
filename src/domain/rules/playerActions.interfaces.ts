import type { GameCommandType, PropertyAction } from '../types/game.enums';
import type { SpaceId } from '../types/game.interfaces';

/** Shapes returned by playerActions.utils.ts. */

export interface PropertyActionDescriptor {
  action: PropertyAction;
  label: string;
  command: GameCommandType;
  isEnabled: boolean;
  /** Why the action is unavailable. Empty when enabled. */
  disabledReason: string;
}

/** One site an action can legally be taken on right now, and what it is worth. */
export interface EligibleSite {
  spaceId: SpaceId;
  name: string;
  /** Build/Sell mean a hotel at the top of the ladder, a house below it. */
  command: GameCommandType;
  /** What this row costs, or pays. */
  amount: number;
}

/**
 * One action offered across a player's whole holding, rather than on one site.
 *
 * The action rail needs this shape and the site panel needs
 * `PropertyActionDescriptor`; both are derived from the same per-site rules, so
 * a live button in either place is a command that will succeed.
 */
export interface PlayerActionOption {
  action: PropertyAction;
  label: string;
  isEnabled: boolean;
  /** Why the whole action is unavailable. Empty when it is not. */
  disabledReason: string;
  sites: EligibleSite[];
}
