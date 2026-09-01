import { describe, expect, it } from 'vitest';
import { createGameState, executeGameCommand } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { indiaEditionTheme } from '../../domain/themes/indiaEditionTheme';
import {
  AuctionLedgerKind,
  GameCommandType,
  PendingDecisionType,
  SpaceKind,
  TurnPhase,
} from '../../domain/types/game.enums';
import type { GameState } from '../../domain/types/game.interfaces';
import {
  auctionBidKey,
  selectAuctionDecision,
  selectBidField,
} from './auctionViewModel.selectors';
import { makeTokenFinder } from './gameView.selectors';

const findToken = makeTokenFinder(indiaEditionTheme);

const threePlayerGame = (): GameState =>
  createGameState(
    {
      name: 'Auction View',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
        { name: 'Meera', tokenId: 'auto' },
      ],
      themeId: indiaEditionTheme.id,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    new SeededRandomSource(5)
  );

/** Declines the first street, which opens an auction over all three players. */
const openAuction = (): GameState => {
  const base = threePlayerGame();
  const street = base.board.find((space) => space.kind === SpaceKind.Street);
  if (!street) {
    throw new Error('No street on the board');
  }
  const activePlayerId = base.playerOrder[base.activePlayerIndex];

  return executeGameCommand(
    {
      ...base,
      players: {
        ...base.players,
        [activePlayerId]: { ...base.players[activePlayerId], position: street.index },
      },
      pendingDecision: {
        type: PendingDecisionType.LandedUnownedProperty,
        spaceId: street.id,
        playerId: activePlayerId,
      },
      turn: { ...base.turn, phase: TurnPhase.AwaitDecision },
    },
    { type: GameCommandType.DeclineLandedAsset },
    new SeededRandomSource(3)
  ).nextState;
};

const bid = (game: GameState, amount: number): GameState =>
  executeGameCommand(
    game,
    { type: GameCommandType.SubmitAuctionBid, amount },
    new SeededRandomSource(3)
  ).nextState;

const pass = (game: GameState): GameState =>
  executeGameCommand(
    game,
    { type: GameCommandType.PassAuction },
    new SeededRandomSource(3)
  ).nextState;

describe('selectAuctionDecision', () => {
  it('is null when no auction is running', () => {
    expect(selectAuctionDecision(threePlayerGame(), findToken)).toBeNull();
  });

  // The panel shows the deed, so the space travels with the decision.
  it('carries the space being auctioned, not just its name', () => {
    const view = selectAuctionDecision(openAuction(), findToken);

    expect(view?.space.id).toBe(view?.auction.spaceId);
    expect(view?.spaceName).toBe(view?.space.name);
  });

  it('names the bidder being asked, with their token and cash', () => {
    const game = openAuction();
    const view = selectAuctionDecision(game, findToken);
    const bidderId =
      game.auctionState?.activeBidderOrder[game.auctionState.activeBidderIndex];

    expect(view?.activeBidder.playerId).toBe(bidderId);
    expect(view?.activeBidder.name).toBe(view?.activeBidderName);
    expect(view?.activeBidder.token).toBeDefined();
    expect(view?.activeBidder.cash).toBe(game.players[bidderId as string].cash);
  });

  it('moves the named bidder on as the turn passes', () => {
    const opened = openAuction();
    const first = selectAuctionDecision(opened, findToken)?.activeBidder.playerId;

    const next = selectAuctionDecision(pass(opened), findToken)?.activeBidder.playerId;

    expect(next).not.toBe(first);
  });

  it('carries the standing high bid, and the minimum above it', () => {
    const view = selectAuctionDecision(bid(openAuction(), 40), findToken);

    expect(view?.highestBid).toBe(40);
    expect(view?.minimumBid).toBe(41);
  });

  it('resolves every ledger line to the player who made it', () => {
    const game = bid(bid(openAuction(), 20), 50);
    const view = selectAuctionDecision(game, findToken);

    expect(view?.ledger.map((line) => line.kind)).toEqual([
      AuctionLedgerKind.Start,
      AuctionLedgerKind.Bid,
      AuctionLedgerKind.Bid,
    ]);
    // The opening line is the bank's, and belongs to no player.
    expect(view?.ledger[0].bidder).toBeNull();
    expect(view?.ledger[1].bidder?.name).toBeTruthy();
    expect(view?.ledger[1].amount).toBe(20);
  });

  it('opens the minimum at the start price, then a bid above the standing one', () => {
    const opened = openAuction();
    expect(selectAuctionDecision(opened, findToken)?.minimumBid).toBe(10);

    expect(selectAuctionDecision(bid(opened, 100), findToken)?.minimumBid).toBe(101);
  });
});

describe('selectBidField', () => {
  const auctionOf = (game: GameState) => {
    const auction = game.auctionState;
    if (!auction) {
      throw new Error('No auction in progress');
    }
    return auction;
  };

  /**
   * The bug this fixes: the field used to hold 10 for ever, so once the high bid
   * was 100 the player had to guess a legal number and was shown an error for
   * getting it wrong.
   */
  it('prefills the minimum legal bid when nothing has been typed', () => {
    const auction = auctionOf(bid(openAuction(), 100));

    expect(selectBidField(auction, 1500, null)).toMatchObject({
      amount: 101,
      minimumBid: 101,
      blockedReason: null,
    });
  });

  it('keeps what the bidder typed while it still belongs to this moment', () => {
    const auction = auctionOf(openAuction());

    expect(
      selectBidField(auction, 1500, { key: auctionBidKey(auction), amount: 250 }).amount
    ).toBe(250);
  });

  // The heart of the prefill: a typed amount goes stale by itself, so there is
  // no effect to fire and nothing to reset between queued auctions.
  it('discards what was typed once a bid lands, and prefills again', () => {
    const opened = openAuction();
    const typed = { key: auctionBidKey(auctionOf(opened)), amount: 250 };
    const after = auctionOf(bid(opened, 300));

    expect(selectBidField(after, 1500, typed).amount).toBe(301);
  });

  it('discards what was typed once the turn passes to the next bidder', () => {
    const opened = openAuction();
    const typed = { key: auctionBidKey(auctionOf(opened)), amount: 250 };
    const after = auctionOf(pass(opened));

    expect(auctionBidKey(after)).not.toBe(typed.key);
    expect(selectBidField(after, 1500, typed).amount).toBe(10);
  });

  it('reports the bidder’s cash as the ceiling', () => {
    const auction = auctionOf(openAuction());

    expect(selectBidField(auction, 640, null).maximumBid).toBe(640);
  });

  it('states why a typed bid cannot be submitted', () => {
    const auction = auctionOf(bid(openAuction(), 100));
    const key = auctionBidKey(auction);

    expect(selectBidField(auction, 1500, { key, amount: 50 }).blockedReason).toBe(
      'Bid must be at least 101.'
    );
    expect(selectBidField(auction, 120, { key, amount: 200 }).blockedReason).toBe(
      'Bid exceeds available cash.'
    );
  });

  // A bidder too poor to make the minimum still gets a legal-looking field; the
  // reason says why they cannot use it, and Pass is what is left to them.
  it('blocks the prefilled amount when the bidder cannot afford the minimum', () => {
    const auction = auctionOf(bid(openAuction(), 100));

    expect(selectBidField(auction, 40, null)).toMatchObject({
      amount: 101,
      blockedReason: 'Bid exceeds available cash.',
    });
  });
});
