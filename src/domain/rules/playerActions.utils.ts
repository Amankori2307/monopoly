import { GameCommandType, PropertyAction } from '../types/game.enums';
import type { GameState, PlayerId } from '../types/game.interfaces';
import { getPlayerOwnedSpaces } from './holdings.utils';

export interface PropertyActionDescriptor {
  action: PropertyAction;
  label: string;
  command: GameCommandType;
  isEnabled: boolean;
  /** Why the action is unavailable. Empty when enabled. */
  disabledReason: string;
}

const ACTION_DEFINITIONS: ReadonlyArray<{
  action: PropertyAction;
  label: string;
  command: GameCommandType;
}> = [
  { action: PropertyAction.Build, label: 'Build', command: GameCommandType.BuildHouse },
  { action: PropertyAction.Sell, label: 'Sell', command: GameCommandType.SellHouse },
  {
    action: PropertyAction.Mortgage,
    label: 'Mortgage',
    command: GameCommandType.MortgageAsset,
  },
  {
    action: PropertyAction.Redeem,
    label: 'Redeem',
    command: GameCommandType.UnmortgageAsset,
  },
];

/**
 * Commands the engine accepts today. The others are declared in the command
 * union but scaffolded, so the rail must not offer them as if they worked.
 * Remove an entry from here as its engine case lands.
 */
const SCAFFOLDED_COMMANDS: ReadonlySet<GameCommandType> = new Set([
  GameCommandType.BuildHouse,
  GameCommandType.BuildHotel,
  GameCommandType.SellHouse,
  GameCommandType.SellHotel,
  GameCommandType.MortgageAsset,
  GameCommandType.UnmortgageAsset,
]);

/**
 * Pure: what the action rail should show for a player. Keeping this out of the
 * component means the availability rules are unit-testable on their own.
 */
export const getPropertyActions = (
  state: GameState,
  playerId: PlayerId
): PropertyActionDescriptor[] => {
  const ownsAnything = getPlayerOwnedSpaces(state, playerId).length > 0;

  return ACTION_DEFINITIONS.map(({ action, label, command }) => {
    if (SCAFFOLDED_COMMANDS.has(command)) {
      return {
        action,
        label,
        command,
        isEnabled: false,
        disabledReason: 'Not implemented yet',
      };
    }
    if (!ownsAnything) {
      return {
        action,
        label,
        command,
        isEnabled: false,
        disabledReason: 'You do not own any property yet',
      };
    }
    return { action, label, command, isEnabled: true, disabledReason: '' };
  });
};
