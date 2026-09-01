import {
  AuctionLedgerKind,
  GameCommandType,
  PendingDecisionType,
} from '../../../types/game.enums';
import type { AuctionState } from '../../../types/game.interfaces';
import { appendAuctionEntry, bidBlockedReason } from '../../auctionBids.utils';
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
    // Stated once, in auctionBids.utils - the panel disables its button from
    // the same function, so the two cannot disagree about what is legal.
    const blockedReason = bidBlockedReason(auction, activeBidder.cash, command.amount);
    if (blockedReason) {
      throw new Error(blockedReason);
    }

    nextState = {
      ...nextState,
      auctionState: {
        ...auction,
        highestBid: command.amount,
        highestBidderId: activeBidderId,
        activeBidderIndex: nextActiveBidderIndex(auction),
        ledger: appendAuctionEntry(auction, {
          kind: AuctionLedgerKind.Bid,
          playerId: activeBidderId,
          amount: command.amount,
        }),
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
          ledger: appendAuctionEntry(auction, {
            kind: AuctionLedgerKind.Pass,
            playerId: activeBidderId,
            amount: null,
          }),
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
