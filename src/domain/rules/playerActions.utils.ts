import type { PropertyActionDescriptor } from './playerActions.interfaces';

export type { PropertyActionDescriptor } from './playerActions.interfaces';

import {
  HOTEL_BUILD_LEVEL,
  MAX_HOUSES_PER_SITE,
  MORTGAGE_INTEREST_PERCENT,
} from '../constants/game.constants';
import { GameCommandType, PropertyAction } from '../types/game.enums';
import type {
  GameState,
  OwnableSpace,
  PlayerId,
  SpaceId,
} from '../types/game.interfaces';
import { buildBlockedReason, getBuildLevel, sellBlockedReason } from './buildings.utils';
import { groupHasBuildings, isOwnedBy } from './holdings.utils';
import { isOwnableSpace, isStreetSpace } from './space.utils';

/**
 * What a player may do with one specific site.
 *
 * The site panel is the only place these are offered, because every property
 * command needs a spaceId and this is where one exists. The rules themselves
 * live in buildings.utils, so a disabled button and a thrown command cannot
 * disagree about why something is not allowed.
 */

/**
 * Why the landed site cannot be bought, or null when it can.
 *
 * Stated once, exactly as the auction's `bidBlockedReason` is: the engine throws
 * this string and the decision panel disables Buy with it, so the button and the
 * command cannot disagree.
 *
 * It used to be an inline comparison in the command alone, which left Buy always
 * live. A player without the cash clicked it, the engine threw, the thunk logged
 * to the console - and the modal stayed up with no way to answer it, so the game
 * looked frozen. Every other affordability rule here was already guarded this
 * way; buying was the one that was not.
 */
export const buyBlockedReason = (buyerCash: number, price: number): string | null =>
  buyerCash < price ? 'Not enough cash to buy it' : null;

/** Build and Sell mean a hotel at the top of the ladder, a house below it. */
const commandFor = (action: PropertyAction, buildLevel: number): GameCommandType => {
  if (action === PropertyAction.Build) {
    return buildLevel === MAX_HOUSES_PER_SITE
      ? GameCommandType.BuildHotel
      : GameCommandType.BuildHouse;
  }
  if (action === PropertyAction.Sell) {
    return buildLevel === HOTEL_BUILD_LEVEL
      ? GameCommandType.SellHotel
      : GameCommandType.SellHouse;
  }
  return action === PropertyAction.Mortgage
    ? GameCommandType.MortgageAsset
    : GameCommandType.UnmortgageAsset;
};

const labelFor = (action: PropertyAction, buildLevel: number): string => {
  if (action === PropertyAction.Build) {
    return buildLevel === MAX_HOUSES_PER_SITE ? 'Build hotel' : 'Build house';
  }
  if (action === PropertyAction.Sell) {
    return buildLevel === HOTEL_BUILD_LEVEL ? 'Sell hotel' : 'Sell house';
  }
  return action === PropertyAction.Mortgage ? 'Mortgage' : 'Redeem';
};

/**
 * Why one action is unavailable on one site, or '' when it is available.
 *
 * Each rule reads as its own line rather than as another branch in a map
 * callback that had grown past the complexity limit.
 */
const siteActionBlockedReason = (
  state: GameState,
  space: OwnableSpace,
  playerId: PlayerId,
  action: PropertyAction
): string => {
  const isMortgaged = state.ownership[space.id].mortgaged;

  if (action === PropertyAction.Build) {
    // Only streets carry buildings, and saying so beats a generic refusal on a
    // railway's panel.
    return isStreetSpace(space)
      ? buildBlockedReason(state, space.id, playerId)
      : 'Only streets can be built on';
  }

  if (action === PropertyAction.Sell) {
    return isStreetSpace(space)
      ? sellBlockedReason(state, space.id, playerId)
      : 'Only streets carry buildings';
  }

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

  if (!isMortgaged) {
    return 'Not mortgaged';
  }
  const redemptionCost =
    space.mortgageValue +
    Math.ceil((space.mortgageValue * MORTGAGE_INTEREST_PERCENT) / 100);
  return state.players[playerId].cash < redemptionCost
    ? 'Not enough cash to redeem it'
    : '';
};

const SITE_ACTIONS: readonly PropertyAction[] = [
  PropertyAction.Build,
  PropertyAction.Sell,
  PropertyAction.Mortgage,
  PropertyAction.Redeem,
];

export const getSiteActions = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): PropertyActionDescriptor[] => {
  const space = state.board.find((candidate) => candidate.id === spaceId);
  if (!space || !isOwnableSpace(space) || !isOwnedBy(state, spaceId, playerId)) {
    return [];
  }

  const buildLevel = getBuildLevel(state, spaceId);

  return SITE_ACTIONS.map((action) => {
    const disabledReason = siteActionBlockedReason(state, space, playerId, action);
    return {
      action,
      label: labelFor(action, buildLevel),
      command: commandFor(action, buildLevel),
      isEnabled: disabledReason === '',
      disabledReason,
    };
  });
};
