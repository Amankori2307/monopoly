import type { GameCommandType, PropertyAction } from '../types/game.enums';

/** Shapes returned by playerActions.utils.ts. */

export interface PropertyActionDescriptor {
  action: PropertyAction;
  label: string;
  command: GameCommandType;
  isEnabled: boolean;
  /** Why the action is unavailable. Empty when enabled. */
  disabledReason: string;
}
