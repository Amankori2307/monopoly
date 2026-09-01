import { GameCommandType, PendingDecisionType } from '../../../types/game.enums';
import type { AuctionState } from '../../../types/game.interfaces';
import { completeAuctionIfPossible, nextActiveBidderIndex } from '../auction.utils';
import {
  appendEvents,
  createEvent,
  getPlayerById,
  getThemeOrDefault,
} from '../state.utils';
import type { CommandHandlers } from './command.interfaces';

/**
 * Bidding, and passing.
 *
 * Neither knows what is being auctioned - a declined property, a bankrupt's
 * holdings, or a building the bank is short of all run through the same loop.
 * Passing is what ends an auction: once one bidder is left the loop settles.
 */

export const auctionCommands: CommandHandlers = {
  [GameCommandType.SubmitAuctionBid]: (state, command, randomSource) => {
    let nextState = state;
    const auction = nextState.auctionState;
    if (!auction || nextState.pendingDecision.type !== PendingDecisionType.AuctionBid) {
      throw new Error('There is no auction in progress.');
    }
    const activeBidderId = auction.activeBidderOrder[auction.activeBidderIndex];
    const activeBidder = getPlayerById(nextState, activeBidderId);
    const minimumBid = Math.max(
      auction.startPrice,
      auction.highestBid + auction.minIncrement
    );
    if (command.amount < minimumBid) {
      throw new Error(`Bid must be at least ${minimumBid}.`);
    }
    if (command.amount > activeBidder.cash) {
      throw new Error('Bid exceeds available cash.');
    }

    nextState = {
      ...nextState,
      auctionState: {
        ...auction,
        highestBid: command.amount,
        highestBidderId: activeBidderId,
        activeBidderIndex: nextActiveBidderIndex(auction),
      },
    };
    nextState = appendEvents(nextState, [
      createEvent(
        nextState.turnNumber,
        `${activeBidder.name} bid ${getThemeOrDefault(nextState.themeId).currencySymbol}${command.amount}.`
      ),
    ]);
    nextState = completeAuctionIfPossible(nextState, randomSource);
    return nextState;
  },
  [GameCommandType.PassAuction]: (state, _command, randomSource) => {
    let nextState = state;
    const auction = nextState.auctionState;
    if (!auction || nextState.pendingDecision.type !== PendingDecisionType.AuctionBid) {
      throw new Error('There is no auction in progress.');
    }
    const activeBidderId = auction.activeBidderOrder[auction.activeBidderIndex];
    nextState = {
      ...nextState,
      auctionState: (() => {
        const withPass: AuctionState = {
          ...auction,
          passedPlayerIds: [...auction.passedPlayerIds, activeBidderId],
        };
        return {
          ...withPass,
          activeBidderIndex: nextActiveBidderIndex(withPass),
        };
      })(),
    };
    nextState = appendEvents(nextState, [
      createEvent(
        nextState.turnNumber,
        `${getPlayerById(nextState, activeBidderId).name} passed in the auction.`
      ),
    ]);
    nextState = completeAuctionIfPossible(nextState, randomSource);
    return nextState;
  },
};
