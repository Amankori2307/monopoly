import { SpaceKind } from '../types/game.enums';
import type { BoardSpace, OwnableSpace, StreetSpace } from '../types/game.interfaces';

/** Spaces a player can buy, mortgage, or owe rent on. */
const OWNABLE_SPACE_KINDS: ReadonlySet<SpaceKind> = new Set([
  SpaceKind.Street,
  SpaceKind.Railway,
  SpaceKind.Utility,
]);

/**
 * Type guard for buyable spaces. Use this instead of spelling out
 * `kind === Street || kind === Railway || kind === Utility` at each call site -
 * it narrows the type as well as answering the question.
 */
export const isOwnableSpace = (space: BoardSpace): space is OwnableSpace =>
  OWNABLE_SPACE_KINDS.has(space.kind);

export const isStreetSpace = (space: BoardSpace): space is StreetSpace =>
  space.kind === SpaceKind.Street;

export const isCornerSpace = (space: BoardSpace, cornerPositions: readonly number[]) =>
  cornerPositions.includes(space.index);
