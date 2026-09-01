import {
  AUCTION_MIN_INCREMENT,
  AUCTION_START_PRICE,
} from '../../constants/game.constants';
import { PendingDecisionType, TurnPhase } from '../../types/game.enums';
import type { BuildingKind } from '../../types/game.enums';
import type { AuctionState, DebtRecord, GameState } from '../../types/game.interfaces';
import { openingLedgerEntry } from '../auctionBids.utils';
import { playersWhoCouldBuild } from '../buildings.utils';
import type { RandomSource } from '../rng';
import { nextDecisionAfterDebt, resolveBankPayment } from './money.utils';
import {
  appendEvents,
  createEvent,
  getSpaceById,
  updateSpaceOwnership,
} from './state.utils';
import { resumeTurnAfterDecision } from './turn.utils';

/**
 * The auction loop, and the queue behind it.
 *
 * One set of machinery serves three callers: a declined property, every
 * property a bankruptcy hands back to the bank, and a building the bank is too
 * short of to give to whoever asked first. Only the eligible bidders, the
 * opening price and what the winner receives differ.
 *
 * Only one auction can run at a time, which is what pendingAuctionSpaceIds is
 * for - as each finishes the next opens by itself, and the turn resumes when
 * the queue is empty.
 */

/**
 * The next bidder who has not already passed.
 *
 * Advancing by one and wrapping is not enough: bidding advances the index too,
 * so a bid/pass interleave can land the turn back on someone who has left the
 * auction. They were then asked to act again, and could bid their way back in.
 */
export const nextActiveBidderIndex = (auction: AuctionState): number => {
  const { activeBidderOrder, activeBidderIndex, passedPlayerIds } = auction;

  for (let step = 1; step <= activeBidderOrder.length; step += 1) {
    const candidate = (activeBidderIndex + step) % activeBidderOrder.length;
    if (!passedPlayerIds.includes(activeBidderOrder[candidate])) {
      return candidate;
    }
  }

  // Everyone has passed; completeAuctionIfPossible ends the auction next.
  return activeBidderIndex;
};

/**
 * Starts the next queued auction, or hands the turn back when the queue is
 * empty.
 *
 * A bankruptcy to the bank returns everything at once and the printed rule has
 * each property auctioned, so they are sold in turn. An auction with nobody
 * left to bid is skipped rather than stalling - the property just stays
 * unowned, to be bought by whoever lands on it.
 */
export const startNextQueuedAuction = (
  state: GameState,
  randomSource: RandomSource
): GameState => {
  const [nextSpaceId, ...rest] = state.pendingAuctionSpaceIds;

  if (!nextSpaceId) {
    return resumeTurnAfterDecision(
      { ...state, pendingDecision: { type: PendingDecisionType.None } },
      randomSource
    );
  }

  const solventPlayers = state.playerOrder.filter(
    (playerId) => !state.players[playerId].isBankrupt
  );
  if (solventPlayers.length === 0) {
    return startNextQueuedAuction(
      { ...state, pendingAuctionSpaceIds: rest },
      randomSource
    );
  }

  return startAuction({ ...state, pendingAuctionSpaceIds: rest }, nextSpaceId);
};

/**
 * What happens once a liquidation has been answered: the next debt from the
 * same card, then any queued auction, then the turn itself.
 *
 * One function so settling and going bankrupt cannot disagree about the order -
 * and the order matters, because an unpaid debt has to be answered before the
 * bank starts selling anyone's property.
 */
export const afterDecisionResolved = (
  state: GameState,
  queued: DebtRecord[] | undefined,
  randomSource: RandomSource
): GameState => {
  const nextDebt = nextDecisionAfterDebt(state, queued);

  if (nextDebt.type === PendingDecisionType.AssetLiquidation) {
    return {
      ...state,
      pendingDecision: nextDebt,
      turn: { ...state.turn, phase: TurnPhase.AwaitDecision },
    };
  }

  return startNextQueuedAuction(
    { ...state, pendingDecision: { type: PendingDecisionType.None } },
    randomSource
  );
};

export const completeAuctionIfPossible = (
  state: GameState,
  randomSource: RandomSource
): GameState => {
  const auction = state.auctionState;
  if (!auction) {
    return state;
  }

  const remainingPlayers = auction.activeBidderOrder.filter(
    (playerId) => !auction.passedPlayerIds.includes(playerId)
  );

  if (remainingPlayers.length > 1) {
    return state;
  }

  // Nobody bid, so the property simply stays unowned and the next one comes up.
  if (remainingPlayers.length === 0 || !auction.highestBidderId) {
    return startNextQueuedAuction({ ...state, auctionState: null }, randomSource);
  }

  const winnerId = auction.highestBidderId;
  const space = getSpaceById(state, auction.spaceId);
  // Same reason as buying: the primitive is what logs it.
  let nextState = resolveBankPayment(
    state,
    winnerId,
    auction.highestBid,
    auction.buildingKind
      ? `won a ${auction.buildingKind} at auction`
      : `won the auction for ${space.name}`
  );

  // A building auction sells the building, not the site: the winner picks which
  // of their own sites it goes on.
  if (auction.buildingKind) {
    return {
      ...nextState,
      auctionState: null,
      pendingDecision: {
        type: PendingDecisionType.BuildingPlacement,
        playerId: winnerId,
        buildingKind: auction.buildingKind,
        paidAmount: auction.highestBid,
      },
      turn: { ...nextState.turn, phase: TurnPhase.AwaitDecision },
    };
  }

  nextState = updateSpaceOwnership(nextState, auction.spaceId, (ownership) => ({
    ...ownership,
    ownerPlayerId: winnerId,
  }));

  return startNextQueuedAuction({ ...nextState, auctionState: null }, randomSource);
};

export const startAuction = (
  state: GameState,
  spaceId: string,
  // A building auction is the same machinery with a different subject: only the
  // eligible bidders, the opening price and what the winner receives differ.
  building?: { buildingKind: BuildingKind; startPrice: number }
): GameState => {
  const eligiblePlayers = building
    ? playersWhoCouldBuild(state, building.buildingKind)
    : state.playerOrder.filter((playerId) => !state.players[playerId].isBankrupt);
  const auctionState: AuctionState = {
    id: crypto.randomUUID(),
    spaceId,
    buildingKind: building?.buildingKind,
    startPrice: building?.startPrice ?? AUCTION_START_PRICE,
    minIncrement: AUCTION_MIN_INCREMENT,
    activeBidderOrder: eligiblePlayers,
    activeBidderIndex: 0,
    highestBid: 0,
    highestBidderId: null,
    passedPlayerIds: [],
    // The panel opens on this line, so a bidder sees the price before any bid.
    ledger: [openingLedgerEntry(building?.startPrice ?? AUCTION_START_PRICE)],
  };

  return appendEvents(
    {
      ...state,
      auctionState,
      pendingDecision: {
        type: PendingDecisionType.AuctionBid,
        auctionId: auctionState.id,
      },
      turn: {
        ...state.turn,
        phase: TurnPhase.AwaitDecision,
        reason: 'Auction in progress',
      },
    },
    [
      createEvent(
        state.turnNumber,
        building
          ? `The bank is short of ${building.buildingKind}s - one goes to auction.`
          : `Auction started for ${getSpaceById(state, spaceId).name}.`
      ),
    ]
  );
};
