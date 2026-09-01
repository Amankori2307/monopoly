import type { SellableBuilding } from './buildings.interfaces';

export type { SellableBuilding } from './buildings.interfaces';

import { BuildingKind } from '../types/game.enums';
import {
  BUILDING_SELL_PERCENT,
  HOTEL_BUILD_LEVEL,
  MAX_HOUSES_PER_SITE,
} from '../constants/game.constants';
import type { GameState, PlayerId, SpaceId, StreetSpace } from '../types/game.interfaces';
import {
  getPlayerOwnedSpaces,
  ownsEntireColorSet,
  streetsInGroup,
} from './holdings.utils';
import { isStreetSpace } from './space.utils';

/**
 * Building rules, kept pure and out of the engine.
 *
 * `buildLevel` is 0-5: 0-4 houses, and HOTEL_BUILD_LEVEL (5) for a hotel. One
 * scale for both is what makes the even rules a single comparison rather than
 * two rules that have to agree.
 */

export const getBuildLevel = (state: GameState, spaceId: SpaceId): number =>
  state.ownership[spaceId]?.buildLevel ?? 0;

/** Half the purchase price, rounded down - the bank keeps the odd rupee. */
export const getBuildingRefund = (cost: number): number =>
  Math.floor((cost * BUILDING_SELL_PERCENT) / 100);

/**
 * The even rule, in one place: no two sites in a colour group may differ by
 * more than one level. Building and selling are the same rule read in opposite
 * directions, so both ask this about the level they are about to write.
 *
 * It also subsumes "every site must hold four houses before any hotel": going
 * to 5 while another site sits at 3 is a two-level gap.
 */
const wouldStayEven = (
  state: GameState,
  space: StreetSpace,
  nextLevel: number
): boolean => {
  const others = streetsInGroup(state, space.colorGroup)
    .filter((candidate) => candidate.id !== space.id)
    .map((candidate) => getBuildLevel(state, candidate.id));
  if (others.length === 0) return true;
  return others.every((level) => Math.abs(level - nextLevel) <= 1);
};

/**
 * Why this player cannot build one more level here, or '' when they can.
 *
 * A reason string rather than a boolean: every caller - the engine's throw, the
 * site panel's disabled button - needs to say why.
 */
/** What the colour set as a whole says about building on it. */
const colourSetBlockedReason = (
  state: GameState,
  space: StreetSpace,
  playerId: PlayerId
): string => {
  if (!ownsEntireColorSet(state, playerId, space.colorGroup)) {
    return 'You need every site in this colour set';
  }
  return streetsInGroup(state, space.colorGroup).some(
    (site) => state.ownership[site.id].mortgaged
  )
    ? 'Redeem the mortgaged sites in this colour set first'
    : '';
};

/** What the bank and the player's cash say about one more level here. */
const affordabilityBlockedReason = (
  state: GameState,
  space: StreetSpace,
  playerId: PlayerId,
  isHotel: boolean
): string => {
  const cost = isHotel ? space.hotelCost : space.houseCost;
  if (state.players[playerId].cash < cost) return 'Not enough cash';
  if (isHotel && state.bank.hotelsAvailable < 1) return 'The bank has no hotels left';
  if (!isHotel && state.bank.housesAvailable < 1) return 'The bank has no houses left';
  return '';
};

export const buildBlockedReason = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): string => {
  const space = state.board.find((candidate) => candidate.id === spaceId);
  if (!space || !isStreetSpace(space)) return 'Only streets can be built on';
  if (state.ownership[spaceId]?.ownerPlayerId !== playerId) return 'You do not own it';

  const setReason = colourSetBlockedReason(state, space, playerId);
  if (setReason) return setReason;

  const level = getBuildLevel(state, spaceId);
  if (level >= HOTEL_BUILD_LEVEL) return 'A hotel is the most this site can hold';
  if (!wouldStayEven(state, space, level + 1)) {
    return 'Build the rest of the colour set up first';
  }

  return affordabilityBlockedReason(
    state,
    space,
    playerId,
    level === MAX_HOUSES_PER_SITE
  );
};

/**
 * Why this player cannot sell a building here, or '' when they can.
 *
 * A hotel reverts to four houses, so selling one needs four houses in the bank.
 * That is the printed rule and it is the reason a hotel can be stuck.
 */
export const sellBlockedReason = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): string => {
  const space = state.board.find((candidate) => candidate.id === spaceId);
  if (!space || !isStreetSpace(space)) return 'Only streets carry buildings';
  if (state.ownership[spaceId]?.ownerPlayerId !== playerId) return 'You do not own it';

  const level = getBuildLevel(state, spaceId);
  if (level === 0) return 'Nothing built here';
  if (level === HOTEL_BUILD_LEVEL && state.bank.housesAvailable < MAX_HOUSES_PER_SITE) {
    return 'The bank has too few houses to break this hotel';
  }
  if (!wouldStayEven(state, space, level - 1)) {
    return 'Sell the rest of the colour set down first';
  }

  return '';
};

/** What the bank pays for the building currently on top of this site. */
export const getSaleRefund = (state: GameState, space: StreetSpace): number =>
  getBuildLevel(state, space.id) === HOTEL_BUILD_LEVEL
    ? getBuildingRefund(space.hotelCost)
    : getBuildingRefund(space.houseCost);

/**
 * Every building this player could sell right now, and what each pays.
 *
 * Drives the liquidation panel. A player with buildings cannot mortgage that
 * colour set at all, so without this list they would be offered bankruptcy
 * while still holding hotels.
 */
export const getSellableBuildings = (
  state: GameState,
  playerId: PlayerId
): SellableBuilding[] =>
  getPlayerOwnedSpaces(state, playerId)
    .filter(isStreetSpace)
    .filter((space) => sellBlockedReason(state, space.id, playerId) === '')
    .map((space) => ({
      spaceId: space.id,
      name: space.name,
      colorGroup: space.colorGroup,
      buildLevel: getBuildLevel(state, space.id),
      refund: getSaleRefund(state, space),
      isHotel: getBuildLevel(state, space.id) === HOTEL_BUILD_LEVEL,
    }));

/**
 * Everything a player could raise by selling buildings, one level at a time
 * down to bare sites. Used to decide whether a debt is truly unpayable.
 */
export const getBuildingSaleValue = (state: GameState, playerId: PlayerId): number =>
  getPlayerOwnedSpaces(state, playerId)
    .filter(isStreetSpace)
    .reduce((total, space) => {
      const level = getBuildLevel(state, space.id);
      if (level === 0) return total;
      const houses = level === HOTEL_BUILD_LEVEL ? MAX_HOUSES_PER_SITE : level;
      return (
        total +
        houses * getBuildingRefund(space.houseCost) +
        (level === HOTEL_BUILD_LEVEL ? getBuildingRefund(space.hotelCost) : 0)
      );
    }, 0);

/**
 * Everything a player could turn into cash: their buildings sold down, and
 * every unmortgaged site mortgaged after that.
 *
 * Not getRaisableCash: that one answers "what can be mortgaged right now", and
 * a site whose colour set holds buildings cannot be. Judging bankruptcy on it
 * would declare a player with hotels bankrupt while they still held them.
 *
 * It lives here rather than in holdings.utils because it needs the building
 * rules, and holdings.utils is what buildings.utils is built on.
 */
export const getLiquidationValue = (state: GameState, playerId: PlayerId): number =>
  getBuildingSaleValue(state, playerId) +
  getPlayerOwnedSpaces(state, playerId)
    .filter((space) => !state.ownership[space.id]?.mortgaged)
    .reduce((total, space) => total + space.mortgageValue, 0);

/**
 * Players who could legally put a building up right now, ignoring the bank's
 * stock and their own cash.
 *
 * This is the closest a turn-based game can get to the printed rule's "two or
 * more players wish to buy": nobody can be asked what they want on someone
 * else's turn, so the standing is what everyone *could* do. Stock and cash are
 * left out deliberately - stock is the thing being contested, and a player who
 * cannot afford the printed price may still outbid at auction from what they
 * raise.
 */
export const playersWhoCouldBuild = (state: GameState, kind: BuildingKind): PlayerId[] =>
  state.playerOrder.filter((playerId) => {
    if (state.players[playerId].isBankrupt) return false;

    return getPlayerOwnedSpaces(state, playerId)
      .filter(isStreetSpace)
      .some((space) => {
        const level = getBuildLevel(state, space.id);
        const wantsHotel = level === MAX_HOUSES_PER_SITE;
        if (wantsHotel !== (kind === BuildingKind.Hotel)) return false;

        // Every rule except the two this auction exists to settle.
        return (
          colourSetBlockedReason(state, space, playerId) === '' &&
          level < HOTEL_BUILD_LEVEL &&
          wouldStayEven(state, space, level + 1)
        );
      });
  });

/**
 * True when the bank cannot satisfy everyone who could build, which is when the
 * printed rule sends the last buildings to auction rather than to whoever asked
 * first.
 *
 * Zero stock is not contention - there is nothing to bid for, and the build is
 * simply refused.
 */
export const isBuildingStockContested = (
  state: GameState,
  kind: BuildingKind
): boolean => {
  const available =
    kind === BuildingKind.Hotel ? state.bank.hotelsAvailable : state.bank.housesAvailable;

  return available > 0 && available < playersWhoCouldBuild(state, kind).length;
};

/** The sites this player could legally place a won building on. */
export const getPlacementSites = (
  state: GameState,
  playerId: PlayerId,
  kind: BuildingKind
): SellableBuilding[] =>
  getPlayerOwnedSpaces(state, playerId)
    .filter(isStreetSpace)
    .filter((space) => {
      const level = getBuildLevel(state, space.id);
      const wantsHotel = level === MAX_HOUSES_PER_SITE;
      return (
        wantsHotel === (kind === BuildingKind.Hotel) &&
        colourSetBlockedReason(state, space, playerId) === '' &&
        level < HOTEL_BUILD_LEVEL &&
        wouldStayEven(state, space, level + 1)
      );
    })
    .map((space) => ({
      spaceId: space.id,
      name: space.name,
      colorGroup: space.colorGroup,
      buildLevel: getBuildLevel(state, space.id),
      refund: 0,
      isHotel: kind === BuildingKind.Hotel,
    }));
