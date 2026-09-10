import type {
  EligibleSite,
  PlayerActionOption,
  PropertyActionDescriptor,
} from './playerActions.interfaces';

export type {
  EligibleSite,
  PlayerActionOption,
  PropertyActionDescriptor,
} from './playerActions.interfaces';

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
import {
  buildBlockedReason,
  getBuildLevel,
  getSaleRefund,
  sellBlockedReason,
} from './buildings.utils';
import { getPlayerOwnedSpaces, groupHasBuildings, isOwnedBy } from './holdings.utils';
import { isOwnableSpace, isStreetSpace } from './space.utils';
import { nounsFor } from '../themes/nouns.utils';

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

/**
 * The mortgage value plus its interest - what redeeming a site actually costs.
 *
 * Its own function because two callers need the same number and they must not
 * disagree: the refusal is computed from it, and the picker sheet prints it.
 */
export const getRedemptionCost = (space: OwnableSpace): number =>
  space.mortgageValue +
  Math.ceil((space.mortgageValue * MORTGAGE_INTEREST_PERCENT) / 100);

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
  const nouns = nounsFor(state.themeId);

  if (action === PropertyAction.Build || action === PropertyAction.Sell) {
    // Naming the kind of square beats a generic refusal on a railway's panel -
    // and it has to be the edition's own word for it, because this same
    // sentence is read on a board of streets and on a board of cities.
    if (!isStreetSpace(space)) {
      return `Only ${nouns.sites} carry buildings`;
    }
    return action === PropertyAction.Build
      ? buildBlockedReason(state, space.id, playerId)
      : sellBlockedReason(state, space.id, playerId);
  }

  if (action === PropertyAction.Mortgage) {
    if (isMortgaged) {
      return 'Already mortgaged';
    }
    // The rule covers the whole color set, not just this site.
    if (isStreetSpace(space) && groupHasBuildings(state, space.colorGroup)) {
      return 'Sell the buildings in this color set first';
    }
    return '';
  }

  if (!isMortgaged) {
    return `This ${nouns.site} is not mortgaged`;
  }
  return state.players[playerId].cash < getRedemptionCost(space)
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

/**
 * What the rail's five buttons say.
 *
 * One word each, because five of them share the width of a phone. The object
 * the convention wants - "Build on a city" - is in the accessible name, where
 * it costs no pixels; see PlayerActionRail.
 */
const RAIL_LABELS: Record<PropertyAction, string> = {
  [PropertyAction.Build]: 'Build',
  [PropertyAction.Sell]: 'Sell',
  [PropertyAction.Mortgage]: 'Mortgage',
  [PropertyAction.Redeem]: 'Redeem',
};

/**
 * What one site is worth to one action, which is what the picker prints.
 *
 * Build and Sell read the site's own ladder, so a hotel and a house are
 * different numbers on the same square.
 */
const amountFor = (
  state: GameState,
  space: OwnableSpace,
  action: PropertyAction
): number => {
  if (action === PropertyAction.Mortgage) {
    return space.mortgageValue;
  }
  if (action === PropertyAction.Redeem) {
    return getRedemptionCost(space);
  }
  if (!isStreetSpace(space)) {
    return 0;
  }
  if (action === PropertyAction.Sell) {
    return getSaleRefund(state, space);
  }
  return getBuildLevel(state, space.id) === MAX_HOUSES_PER_SITE
    ? space.hotelCost
    : space.houseCost;
};

/**
 * The refusal for a whole action, when no site can take it.
 *
 * Prefers the ONE reason when every holding gives the same one - "Already
 * mortgaged" is more use than a summary of it - and falls back to a summary
 * when they differ, because listing four different reasons on a button is not
 * a refusal, it is a report. Shape per docs/conventions.md section 3d: a
 * fragment, sentence case, no terminal stop, and the square in the edition's
 * own word.
 */
const aggregateReason = (
  themeId: string,
  action: PropertyAction,
  reasons: string[]
): string => {
  const nouns = nounsFor(themeId);
  if (reasons.length === 0) {
    return 'You do not own anything yet';
  }
  const distinct = [...new Set(reasons)];
  if (distinct.length === 1) {
    return distinct[0];
  }
  if (action === PropertyAction.Build) {
    return `No ${nouns.site} of yours can take a building`;
  }
  if (action === PropertyAction.Sell) {
    return 'No building of yours can be sold';
  }
  if (action === PropertyAction.Mortgage) {
    return 'Nothing of yours can be mortgaged';
  }
  return 'No mortgage of yours can be redeemed';
};

/**
 * The four property actions, asked across everything a player holds.
 *
 * The site panel asks the same questions of ONE square; this asks them of all
 * of them, so a rail can offer an action without a spaceId and then supply one
 * from the list. That is the objection that removed the old action rail - "every
 * action it listed needs a spaceId, and the site panel is where one exists" -
 * answered rather than worked around: the spaceId comes from the picker.
 *
 * Every predicate here is `getSiteActions`, unchanged. Nothing about what is
 * legal is restated, so a live button and the command behind it cannot drift.
 */
export const getPlayerActionOptions = (
  state: GameState,
  playerId: PlayerId
): PlayerActionOption[] => {
  const owned = getPlayerOwnedSpaces(state, playerId);

  return SITE_ACTIONS.map((action) => {
    const sites: EligibleSite[] = [];
    const reasons: string[] = [];

    owned.forEach((space) => {
      const descriptor = getSiteActions(state, space.id, playerId).find(
        (candidate) => candidate.action === action
      );
      if (!descriptor) {
        return;
      }
      if (descriptor.isEnabled) {
        sites.push({
          spaceId: space.id,
          name: space.name,
          command: descriptor.command,
          amount: amountFor(state, space, action),
        });
        return;
      }
      reasons.push(descriptor.disabledReason);
    });

    return {
      action,
      // The bare verb. "Build house" vs "Build hotel" is a fact about a SITE,
      // and the rail has not picked one yet - the picker's rows carry it.
      label: RAIL_LABELS[action],
      isEnabled: sites.length > 0,
      disabledReason:
        sites.length > 0 ? '' : aggregateReason(state.themeId, action, reasons),
      sites,
    };
  });
};
