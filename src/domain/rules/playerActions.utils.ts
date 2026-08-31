import type { PropertyActionDescriptor } from './playerActions.interfaces';

export type { PropertyActionDescriptor } from './playerActions.interfaces';

import { MORTGAGE_INTEREST_PERCENT } from '../constants/game.constants';
import { GameCommandType, PropertyAction } from '../types/game.enums';
import type {
  GameState,
  OwnableSpace,
  PlayerId,
  SpaceId,
} from '../types/game.interfaces';
import { getPlayerOwnedSpaces, groupHasBuildings, isOwnedBy } from './holdings.utils';
import { isOwnableSpace, isStreetSpace } from './space.utils';

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
/**
 * Why one action is unavailable on one site, or '' when it is available.
 *
 * Extracted from getSiteActions so each rule reads as its own line rather than
 * as another branch in a map callback that had grown past the complexity limit.
 */
const siteActionBlockedReason = (
  state: GameState,
  space: OwnableSpace,
  playerId: PlayerId,
  action: PropertyAction,
  command: GameCommandType
): string => {
  if (SCAFFOLDED_COMMANDS.has(command)) {
    return 'Not implemented yet';
  }

  const isMortgaged = state.ownership[space.id].mortgaged;

  if (action === PropertyAction.Mortgage) {
    if (isMortgaged) {
      return 'Already mortgaged';
    }
    // The rule covers the whole colour set, not just this site.
    if (isStreetSpace(space) && groupHasBuildings(state, space.colorGroup)) {
      return 'Sell the buildings in this colour set first';
    }
    return '';
  }

  if (action === PropertyAction.Redeem) {
    if (!isMortgaged) {
      return 'Not mortgaged';
    }
    const redemptionCost =
      space.mortgageValue +
      Math.ceil((space.mortgageValue * MORTGAGE_INTEREST_PERCENT) / 100);
    return state.players[playerId].cash < redemptionCost
      ? 'Not enough cash to redeem it'
      : '';
  }

  return '';
};

export const getSiteActions = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): PropertyActionDescriptor[] => {
  const space = state.board.find((candidate) => candidate.id === spaceId);
  if (!space || !isOwnableSpace(space) || !isOwnedBy(state, spaceId, playerId)) {
    return [];
  }

  return ACTION_DEFINITIONS.map(({ action, label, command }) => {
    const disabledReason = siteActionBlockedReason(
      state,
      space,
      playerId,
      action,
      command
    );
    return { action, label, command, isEnabled: disabledReason === '', disabledReason };
  });
};
