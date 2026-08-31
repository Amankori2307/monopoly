import type { ColorGroupProgress, HoldingsSection } from './holdings.interfaces';

export type { ColorGroupProgress, HoldingsSection } from './holdings.interfaces';

import { ColorGroup, SpaceKind } from '../types/game.enums';
import type {
  GameState,
  OwnableSpace,
  PlayerId,
  StreetSpace,
} from '../types/game.interfaces';
import { isOwnableSpace, isStreetSpace } from './space.utils';

const RAILWAY_SECTION_ID = 'railway';
const UTILITY_SECTION_ID = 'utility';

/** `dark-blue` -> `Dark Blue`, so labels need no hardcoded lookup table. */
const toTitleCase = (value: string) =>
  value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const streetsInGroup = (state: GameState, group: ColorGroup): StreetSpace[] =>
  state.board.filter(
    (space): space is StreetSpace => isStreetSpace(space) && space.colorGroup === group
  );

const spacesOfKind = (state: GameState, kind: SpaceKind): OwnableSpace[] =>
  state.board.filter(
    (space): space is OwnableSpace => isOwnableSpace(space) && space.kind === kind
  );

export const isOwnedBy = (state: GameState, spaceId: string, playerId: PlayerId) =>
  state.ownership[spaceId]?.ownerPlayerId === playerId;

/**
 * Whether a player holds every street in a colour group, which doubles base rent
 * and unlocks building.
 *
 * Guards against an empty group: `[].every()` is `true`, so a group with no
 * streets would otherwise report as owned by everyone.
 */
export const ownsEntireColorSet = (
  state: GameState,
  playerId: PlayerId,
  colorGroup: ColorGroup
): boolean => {
  const streets = streetsInGroup(state, colorGroup);
  return (
    streets.length > 0 && streets.every((space) => isOwnedBy(state, space.id, playerId))
  );
};

export const getPlayerOwnedSpaces = (
  state: GameState,
  playerId: PlayerId
): OwnableSpace[] =>
  state.board.filter(
    (space): space is OwnableSpace =>
      isOwnableSpace(space) && isOwnedBy(state, space.id, playerId)
  );

export const getMortgagedCount = (state: GameState, playerId: PlayerId): number =>
  getPlayerOwnedSpaces(state, playerId).filter(
    (space) => state.ownership[space.id]?.mortgaged
  ).length;

/**
 * Cash plus what everything they own is worth.
 *
 * Cash alone misleads: a player can be nearly broke while holding most of the
 * board. Mortgaged sites count at their mortgage value, since that is what has
 * already been drawn against them. Buildings count at what they cost.
 */
export const getNetWorth = (state: GameState, playerId: PlayerId): number => {
  const player = state.players[playerId];
  if (!player) {
    return 0;
  }

  return getPlayerOwnedSpaces(state, playerId).reduce((total, space) => {
    const ownership = state.ownership[space.id];
    const siteValue = ownership?.mortgaged ? space.mortgageValue : space.price;
    const buildings = isStreetSpace(space)
      ? (ownership?.buildLevel ?? 0) * space.houseCost
      : 0;
    return total + siteValue + buildings;
  }, player.cash);
};

/**
 * Colour groups the player holds at least one street in, with how far towards a
 * full set they are. Groups they hold nothing in are omitted - there is nothing
 * to report.
 */
export const getColorGroupProgress = (
  state: GameState,
  playerId: PlayerId
): ColorGroupProgress[] =>
  Object.values(ColorGroup)
    .map((group) => {
      const streets = streetsInGroup(state, group);
      const owned = streets.filter((space) =>
        isOwnedBy(state, space.id, playerId)
      ).length;
      return {
        group,
        owned,
        total: streets.length,
        isComplete: streets.length > 0 && owned === streets.length,
      };
    })
    .filter((progress) => progress.owned > 0);

/**
 * A player's holdings grouped for display: colour groups in board order, then
 * railways, then utilities.
 *
 * The colour order is read off the board rather than hardcoded, so it stays
 * correct if the board data changes.
 */
export const getGroupedHoldings = (
  state: GameState,
  playerId: PlayerId
): HoldingsSection[] => {
  const owned = getPlayerOwnedSpaces(state, playerId);

  const colorOrder: ColorGroup[] = [];
  for (const space of state.board) {
    if (isStreetSpace(space) && !colorOrder.includes(space.colorGroup)) {
      colorOrder.push(space.colorGroup);
    }
  }

  const streetSections = colorOrder
    .map((group) => {
      const spaces = owned.filter(
        (space) => isStreetSpace(space) && space.colorGroup === group
      );
      const total = streetsInGroup(state, group).length;
      return {
        id: group,
        label: toTitleCase(group),
        colorGroup: group,
        spaces,
        owned: spaces.length,
        total,
        isComplete: total > 0 && spaces.length === total,
      };
    })
    .filter((section) => section.owned > 0);

  const kindSection = (
    id: string,
    label: string,
    kind: SpaceKind
  ): HoldingsSection | null => {
    const spaces = owned.filter((space) => space.kind === kind);
    if (spaces.length === 0) {
      return null;
    }
    const total = spacesOfKind(state, kind).length;
    return {
      id,
      label,
      spaces,
      owned: spaces.length,
      total,
      isComplete: total > 0 && spaces.length === total,
    };
  };

  return [
    ...streetSections,
    kindSection(RAILWAY_SECTION_ID, 'Railways', SpaceKind.Railway),
    kindSection(UTILITY_SECTION_ID, 'Utilities', SpaceKind.Utility),
  ].filter((section): section is HoldingsSection => section !== null);
};
