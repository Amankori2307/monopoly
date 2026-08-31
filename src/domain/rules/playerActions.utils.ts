import type { PropertyActionDescriptor } from './playerActions.interfaces';

export type { PropertyActionDescriptor } from './playerActions.interfaces';

import { GameCommandType, PropertyAction } from '../types/game.enums';
import type { GameState, PlayerId, SpaceId } from '../types/game.interfaces';
import { getPlayerOwnedSpaces, isOwnedBy } from './holdings.utils';
import { isOwnableSpace } from './space.utils';

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

/**
 * What a player may do with one specific site.
 *
 * The rail's getPropertyActions answers "what could this player do at all"; this
 * answers it for a space the player has actually picked, which is what the
 * engine commands need - they all take a spaceId.
 */
export const getSiteActions = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): PropertyActionDescriptor[] => {
  const space = state.board.find((candidate) => candidate.id === spaceId);
  if (!space || !isOwnableSpace(space) || !isOwnedBy(state, spaceId, playerId)) {
    return [];
  }

  const ownership = state.ownership[spaceId];

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
    // Mortgage and redeem are mutually exclusive on one site.
    if (action === PropertyAction.Mortgage && ownership.mortgaged) {
      return {
        action,
        label,
        command,
        isEnabled: false,
        disabledReason: 'Already mortgaged',
      };
    }
    if (action === PropertyAction.Redeem && !ownership.mortgaged) {
      return {
        action,
        label,
        command,
        isEnabled: false,
        disabledReason: 'Not mortgaged',
      };
    }
    return { action, label, command, isEnabled: true, disabledReason: '' };
  });
};
