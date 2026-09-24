import { SpaceKind } from '../types/game.enums';
import type {
  GameState,
  OwnableSpace,
  PlayerId,
  SpaceId,
} from '../types/game.interfaces';
import { isOwnedBy, streetsInGroup } from '../rules/holdings.utils';
import { isOwnableSpace, isStreetSpace } from '../rules/space.utils';
import { getSpaceById } from '../rules/engine/state.utils';
import {
  BOT_AUCTION_CEILING_ORDINARY,
  BOT_AUCTION_CEILING_WANTED,
  BOT_CASH_RESERVE,
} from './bot.constants';

/**
 * What a square is worth to a bot, which is not what it costs.
 *
 * Kept apart from the policy that acts on it: the policy is about which command
 * to send, and this is about whether a square is worth having. They change for
 * different reasons, and a valuation is the half worth testing on its own.
 *
 * Pure, like everything under `domain/`, and it reads nothing but the state it
 * is handed - no randomness at all, so the same board is always valued the same
 * way and a failing game can be reproduced from its save.
 */

/** The ownable square a bot is being asked about, or null for anything else. */
const ownableAt = (state: GameState, spaceId: SpaceId): OwnableSpace | null => {
  const space = getSpaceById(state, spaceId);
  return isOwnableSpace(space) ? space : null;
};

/**
 * Whether taking this square would finish a colour set for the player.
 *
 * The one thing the printed price cannot know: a square costs the same whether
 * the buyer holds the other two or none of them, and a set is what makes money
 * in this game. It is also what makes a bot worth playing against - one that
 * values every square at its face price never chases anything.
 *
 * Railways and utilities are not colour sets and get no such bonus. Their rent
 * does climb with the count, but never to a scale that justifies overpaying.
 */
export const completesColorSet = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): boolean => {
  const space = ownableAt(state, spaceId);
  if (!space || !isStreetSpace(space)) {
    return false;
  }
  const group = streetsInGroup(state, space.colorGroup);
  // Every other street in the group is already theirs, so this is the last one.
  return group
    .filter((street) => street.id !== spaceId)
    .every((street) => isOwnedBy(state, street.id, playerId));
};

/**
 * Whether the player already holds at least one other square of this kind.
 *
 * A second railway doubles the first one's rent, so a bot that holds one wants
 * the next more than the printed price says. The same is true of the two
 * utilities, where the multiplier goes from four to ten.
 */
export const extendsHolding = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): boolean => {
  const space = ownableAt(state, spaceId);
  if (!space) {
    return false;
  }
  if (space.kind === SpaceKind.Street) {
    return streetsInGroup(state, space.colorGroup).some(
      (street) => street.id !== spaceId && isOwnedBy(state, street.id, playerId)
    );
  }
  return state.board.some(
    (candidate) =>
      candidate.kind === space.kind &&
      candidate.id !== spaceId &&
      isOwnedBy(state, candidate.id, playerId)
  );
};

/**
 * Whether a bot wants this square enough to dig into its float for it.
 *
 * The reserve exists for the next rent bill, so spending through it has to buy
 * something the bot cannot get later - and a colour set is exactly that: the
 * other three players will not sell it back, and there is no second chance at
 * the last street of a group.
 */
export const isWorthTheReserve = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): boolean => completesColorSet(state, spaceId, playerId);

/**
 * Whether a bot should buy a square at its printed price, given its cash.
 *
 * Affordability is NOT decided here. `buyBlockedReason` is the rule and the
 * engine throws from it; this only ever says whether the bot *wants* to, and
 * the policy asks both. Restating "can they afford it" would be a second copy
 * of a rule that already exists, which is the drift the `*BlockedReason`
 * arrangement exists to stop.
 */
export const wantsToBuy = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): boolean => {
  const space = ownableAt(state, spaceId);
  if (!space) {
    return false;
  }
  const cash = state.players[playerId].cash;

  if (isWorthTheReserve(state, spaceId, playerId)) {
    return cash >= space.price;
  }
  return cash - space.price >= BOT_CASH_RESERVE;
};

/**
 * The most a bot will bid for a square, in cash.
 *
 * Above the printed price for a square that completes a set and below it
 * otherwise - an auction only happens because somebody declined at the printed
 * price, so paying that in full is paying for the privilege of bidding.
 *
 * Capped at what the bot is actually holding, because an auction has no credit.
 * That cap is a convenience for the caller rather than a rule: `bidBlockedReason`
 * refuses a bid over the bidder's cash, and the policy reads it.
 */
export const auctionCeilingFor = (
  state: GameState,
  spaceId: SpaceId,
  playerId: PlayerId
): number => {
  const space = ownableAt(state, spaceId);
  const cash = state.players[playerId].cash;
  if (!space) {
    // A building auction: the square only set the opening price, and the winner
    // picks their own site. Worth bidding out of cash, with no printed price to
    // scale against.
    return Math.max(0, cash - BOT_CASH_RESERVE);
  }

  const wanted =
    completesColorSet(state, spaceId, playerId) ||
    extendsHolding(state, spaceId, playerId);
  const ceiling = Math.floor(
    space.price * (wanted ? BOT_AUCTION_CEILING_WANTED : BOT_AUCTION_CEILING_ORDINARY)
  );
  return Math.min(ceiling, cash);
};
