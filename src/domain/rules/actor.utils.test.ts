import { describe, expect, it } from 'vitest';
import { GameCommandType, PendingDecisionType, SpaceKind } from '../types/game.enums';
import type {
  GameState,
  OwnableSpace,
  PlayerId,
  StreetSpace,
} from '../types/game.interfaces';
import {
  actorBlockedReason,
  commandActorId,
  decisionOwnerOf,
  getAssetHolderId,
  getExpectedActorId,
} from './actor.utils';
import { createGameState, executeGameCommand } from './gameEngine';
import { SeededRandomSource } from './rng';
import { isOwnableSpace, isStreetSpace } from './space.utils';

/**
 * Every command handler derives its actor from the state, never from the
 * caller. In one browser that is correct by construction; the moment a command
 * can arrive from another device it is not, and this is the predicate that
 * makes the caller checkable.
 */

const baseGame = (): GameState =>
  createGameState(
    {
      name: 'Test Game',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
        { name: 'Meera', tokenId: 'ship' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(7)
  );

const activeIdOf = (state: GameState): PlayerId =>
  state.playerOrder[state.activePlayerIndex];

const otherIdOf = (state: GameState): PlayerId =>
  state.playerOrder.find((id) => id !== activeIdOf(state)) as PlayerId;

describe('decisionOwnerOf', () => {
  it('names nobody while nothing is pending', () => {
    expect(decisionOwnerOf(baseGame())).toBeNull();
  });

  it('names nobody once the game is over', () => {
    const state = baseGame();
    expect(
      decisionOwnerOf({
        ...state,
        pendingDecision: { type: PendingDecisionType.GameOver },
      })
    ).toBeNull();
  });

  it('names the recipient of a trade, who is never the proposer', () => {
    const state = baseGame();
    const proposer = activeIdOf(state);
    const recipient = otherIdOf(state);

    const owner = decisionOwnerOf({
      ...state,
      pendingDecision: {
        type: PendingDecisionType.TradeResponse,
        proposerPlayerId: proposer,
        recipientPlayerId: recipient,
      },
    });

    expect(owner).toBe(recipient);
    expect(owner).not.toBe(proposer);
  });

  it('names the debtor of a liquidation, active or not', () => {
    const state = baseGame();
    const debtor = otherIdOf(state);

    expect(
      decisionOwnerOf({
        ...state,
        pendingDecision: {
          type: PendingDecisionType.AssetLiquidation,
          playerId: debtor,
          amountDue: 100,
          creditorPlayerId: activeIdOf(state),
          reason: 'a card',
          queued: [],
        },
      })
    ).toBe(debtor);
  });

  // The load-bearing case. Bidding rotates independently of the turn, so
  // "the viewer is the active player" - the obvious shortcut - is wrong here.
  it('names the current bidder even after the active player has passed', () => {
    const state = baseGame();
    const active = activeIdOf(state);
    const bidder = otherIdOf(state);

    const owner = decisionOwnerOf({
      ...state,
      auctionState: {
        id: 'auction-1',
        spaceId: 'space-1',
        startPrice: 10,
        minIncrement: 1,
        activeBidderOrder: [active, bidder],
        activeBidderIndex: 1,
        highestBid: 10,
        highestBidderId: null,
        passedPlayerIds: [active],
        ledger: [],
      },
      pendingDecision: {
        type: PendingDecisionType.AuctionBid,
        auctionId: 'auction-1',
      },
    });

    expect(owner).toBe(bidder);
    expect(owner).not.toBe(active);
  });

  it('names nobody when the decision points at a different auction', () => {
    // A queued bankruptcy auction replaces its predecessor. Matching on
    // "there is an auction" rather than on its id would hand the controls to
    // the previous lot's bidder.
    const state = baseGame();
    const owner = decisionOwnerOf({
      ...state,
      auctionState: {
        id: 'auction-2',
        spaceId: 'space-1',
        startPrice: 10,
        minIncrement: 1,
        activeBidderOrder: state.playerOrder,
        activeBidderIndex: 0,
        highestBid: 10,
        highestBidderId: null,
        passedPlayerIds: [],
        ledger: [],
      },
      pendingDecision: {
        type: PendingDecisionType.AuctionBid,
        auctionId: 'auction-1',
      },
    });

    expect(owner).toBeNull();
  });
});

describe('getExpectedActorId', () => {
  it('falls back to whoever is having their turn when nothing is pending', () => {
    const state = baseGame();
    expect(getExpectedActorId(state)).toBe(activeIdOf(state));
  });

  it('defers to the decision owner when there is one', () => {
    const state = baseGame();
    const recipient = otherIdOf(state);

    expect(
      getExpectedActorId({
        ...state,
        pendingDecision: {
          type: PendingDecisionType.TradeResponse,
          proposerPlayerId: activeIdOf(state),
          recipientPlayerId: recipient,
        },
      })
    ).toBe(recipient);
  });
});

describe('getAssetHolderId', () => {
  it('is the active player ordinarily', () => {
    const state = baseGame();
    expect(getAssetHolderId(state)).toBe(activeIdOf(state));
  });

  it('is the debtor while a liquidation is pending', () => {
    const state = baseGame();
    const debtor = otherIdOf(state);

    expect(
      getAssetHolderId({
        ...state,
        pendingDecision: {
          type: PendingDecisionType.AssetLiquidation,
          playerId: debtor,
          amountDue: 100,
          creditorPlayerId: activeIdOf(state),
          reason: 'a card',
          queued: [],
        },
      })
    ).toBe(debtor);
  });

  // Deliberately unchanged: mortgaging mid-auction is the active player's,
  // exactly as it was before the asset holder existed.
  it('stays the active player during an auction, not the bidder', () => {
    const state = baseGame();
    const bidder = otherIdOf(state);

    const withAuction: GameState = {
      ...state,
      auctionState: {
        id: 'auction-1',
        spaceId: 'space-1',
        startPrice: 10,
        minIncrement: 1,
        activeBidderOrder: [activeIdOf(state), bidder],
        activeBidderIndex: 1,
        highestBid: 10,
        highestBidderId: null,
        passedPlayerIds: [],
        ledger: [],
      },
      pendingDecision: {
        type: PendingDecisionType.AuctionBid,
        auctionId: 'auction-1',
      },
    };

    expect(getAssetHolderId(withAuction)).toBe(activeIdOf(state));
    expect(getExpectedActorId(withAuction)).toBe(bidder);
  });
});

describe('actorBlockedReason', () => {
  it('lets the expected actor through', () => {
    const state = baseGame();
    expect(
      actorBlockedReason(state, { type: GameCommandType.RollTurnDice }, activeIdOf(state))
    ).toBeNull();
  });

  it('names the player whose move it is when somebody else asks', () => {
    const state = baseGame();
    const reason = actorBlockedReason(
      state,
      { type: GameCommandType.RollTurnDice },
      otherIdOf(state)
    );

    expect(reason).toBe(`It is ${state.players[activeIdOf(state)].name}'s move`);
  });

  it('refuses everyone once the game is over', () => {
    const state = baseGame();
    const over: GameState = {
      ...state,
      pendingDecision: { type: PendingDecisionType.GameOver },
    };

    expect(
      actorBlockedReason(over, { type: GameCommandType.EndTurn }, activeIdOf(state))
    ).toBe('No one can act right now');
  });

  it('routes a cash-raising command to the debtor, not the active player', () => {
    const state = baseGame();
    const debtor = otherIdOf(state);
    const inDebt: GameState = {
      ...state,
      pendingDecision: {
        type: PendingDecisionType.AssetLiquidation,
        playerId: debtor,
        amountDue: 100,
        creditorPlayerId: activeIdOf(state),
        reason: 'a card',
        queued: [],
      },
    };
    const mortgage = { type: GameCommandType.MortgageAsset, spaceId: 'space-1' } as const;

    expect(commandActorId(inDebt, mortgage)).toBe(debtor);
    expect(actorBlockedReason(inDebt, mortgage, debtor)).toBeNull();
    expect(actorBlockedReason(inDebt, mortgage, activeIdOf(state))).not.toBeNull();
  });
});

/**
 * The bug this module was written out of, and it is not a network one: a
 * collect-from-each card bills every player, so someone who is not the active
 * player can be left owing money. Mortgaging and selling are the documented
 * ways out, and both read the active player - so the debtor was told they did
 * not own their own site, and bankruptcy was their only exit.
 */
describe('a debtor who is not the active player can raise cash', () => {
  const inLiquidation = (state: GameState, debtor: PlayerId): GameState => ({
    ...state,
    pendingDecision: {
      type: PendingDecisionType.AssetLiquidation,
      playerId: debtor,
      amountDue: 100,
      creditorPlayerId: activeIdOf(state),
      reason: 'a card they could not pay',
      queued: [],
    },
  });

  it('mortgages their own site', () => {
    const state = baseGame();
    const debtor = otherIdOf(state);
    const site = state.board.find(isOwnableSpace) as OwnableSpace;

    const next = executeGameCommand(
      inLiquidation(
        {
          ...state,
          ownership: {
            ...state.ownership,
            [site.id]: { ...state.ownership[site.id], ownerPlayerId: debtor },
          },
        },
        debtor
      ),
      { type: GameCommandType.MortgageAsset, spaceId: site.id },
      new SeededRandomSource(1)
    ).nextState;

    expect(next.ownership[site.id].mortgaged).toBe(true);
    expect(next.players[debtor].cash).toBe(
      state.players[debtor].cash + site.mortgageValue
    );
  });

  it('sells a building off their own street', () => {
    const state = baseGame();
    const debtor = otherIdOf(state);
    const street = state.board.find(
      (space) => space.kind === SpaceKind.Street
    ) as StreetSpace;
    // Own the whole colour set, evenly built, so sellBlockedReason is happy.
    const group = state.board.filter(
      (space) => isStreetSpace(space) && space.colorGroup === street.colorGroup
    );

    const owned: GameState = {
      ...state,
      ownership: group.reduce(
        (ownership, space) => ({
          ...ownership,
          [space.id]: { ...ownership[space.id], ownerPlayerId: debtor, buildLevel: 1 },
        }),
        state.ownership
      ),
    };

    const next = executeGameCommand(
      inLiquidation(owned, debtor),
      { type: GameCommandType.SellHouse, spaceId: street.id },
      new SeededRandomSource(1)
    ).nextState;

    expect(next.ownership[street.id].buildLevel).toBe(0);
    expect(next.players[debtor].cash).toBeGreaterThan(state.players[debtor].cash);
  });
});
