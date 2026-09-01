import { HOTEL_BUILD_LEVEL } from '../../constants/game.constants';
import { SpaceKind } from '../../types/game.enums';
import type {
  GameState,
  OwnableSpace,
  PlayerId,
  StreetSpace,
} from '../../types/game.interfaces';
import { ownsEntireColorSet } from '../holdings.utils';

/**
 * What is owed for landing on somebody else's space.
 *
 * Split by kind because the three read completely differently: a street's rent
 * comes off a printed table indexed by what is built on it, a railway's off how
 * many the owner holds, and a utility's off the dice that brought the visitor
 * there. A mortgaged space is not handled here at all - the caller skips it,
 * because a mortgaged site collects nothing.
 */

export const getStreetRent = (
  state: GameState,
  space: StreetSpace,
  ownerPlayerId: PlayerId
): number => {
  const buildLevel = state.ownership[space.id]?.buildLevel ?? 0;
  if (buildLevel === HOTEL_BUILD_LEVEL) return space.rents.withHotel;
  if (buildLevel === 4) return space.rents.with4Houses;
  if (buildLevel === 3) return space.rents.with3Houses;
  if (buildLevel === 2) return space.rents.with2Houses;
  if (buildLevel === 1) return space.rents.with1House;
  return ownsEntireColorSet(state, ownerPlayerId, space.colorGroup)
    ? space.rents.monopolyRent
    : space.rents.baseRent;
};

export const getRailwayRent = (state: GameState, playerId: PlayerId): number => {
  const railwaysOwned = state.board.filter(
    (space) =>
      space.kind === SpaceKind.Railway &&
      state.ownership[space.id]?.ownerPlayerId === playerId
  ).length;
  const firstRailway = state.board.find((space) => space.kind === SpaceKind.Railway);
  return firstRailway?.kind === SpaceKind.Railway
    ? (firstRailway.rentByCount[Math.max(railwaysOwned - 1, 0)] ??
        firstRailway.rentByCount[0])
    : 25;
};

export const getUtilityRent = (
  state: GameState,
  playerId: PlayerId,
  diceTotal: number
): number => {
  const utilitiesOwned = state.board.filter(
    (space) =>
      space.kind === SpaceKind.Utility &&
      state.ownership[space.id]?.ownerPlayerId === playerId
  ).length;
  const utility = state.board.find((space) => space.kind === SpaceKind.Utility);
  if (!utility || utility.kind !== SpaceKind.Utility) {
    return 0;
  }
  return (
    diceTotal *
    (utilitiesOwned > 1 ? utility.rentMultiplierBoth : utility.rentMultiplierOne)
  );
};

/** Rent owed on an ownable space, dispatched by the space's kind. */
export const getRentForSpace = (
  state: GameState,
  space: OwnableSpace,
  ownerPlayerId: PlayerId,
  diceTotal: number
): number => {
  if (space.kind === SpaceKind.Street) {
    return getStreetRent(state, space, ownerPlayerId);
  }
  if (space.kind === SpaceKind.Railway) {
    return getRailwayRent(state, ownerPlayerId);
  }
  return getUtilityRent(state, ownerPlayerId, diceTotal);
};
