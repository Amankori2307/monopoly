import { describe, expect, it } from 'vitest';
import { indiaTheme } from '../themes/india.theme';
import { ColorGroup } from '../types/game.enums';
import type { AuctionState, GameState, StreetSpace } from '../types/game.interfaces';
import { bidBlockedReason } from './auctionBids.utils';
import { buildBlockedReason, sellBlockedReason } from './buildings.utils';
import { createGameState } from './gameEngine';
import { buyBlockedReason, getSiteActions } from './playerActions.utils';
import { SeededRandomSource } from './rng';
import { isStreetSpace } from './space.utils';
import { tradeBlockedReason } from './trade.utils';

/**
 * The shape of a refusal, guarded.
 *
 * There are more than thirty of these and they had drifted into four registers
 * and two punctuation styles: fragments ('Already mortgaged'), second person
 * ('You do not own it'), imperatives ('Sell the buildings in this color set
 * first') and third person ('The bank has no houses left'), with a terminal
 * full stop on four of them and not on the rest. They all render in the same
 * slot, so the inconsistency is visible to one player in one session.
 *
 * See docs/conventions.md section 3d. This guard checks what a machine can:
 * a refusal is a FRAGMENT completing "you cannot, because…", so it carries no
 * terminal full stop, and it starts with a capital because it begins its line.
 *
 * The connection banner is the one deliberate exception and is not collected
 * here - `offlineBlockedReason` is read as a banner as well as a refusal, and
 * a banner speaks in sentences.
 */

const createGame = (): GameState =>
  createGameState(
    {
      name: 'Refusals',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: indiaTheme.id,
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(11)
  );

const groupOf = (state: GameState, group: ColorGroup): StreetSpace[] =>
  state.board.filter(
    (space): space is StreetSpace => isStreetSpace(space) && space.colorGroup === group
  );

/** Owns the whole group for the first player, at the given build levels. */
const withGroup = (state: GameState, levels: number[], cash: number): GameState => {
  const sites = groupOf(state, ColorGroup.Brown);
  const ownerId = state.playerOrder[0];
  const ownership = { ...state.ownership };
  sites.forEach((site, index) => {
    ownership[site.id] = {
      ownerPlayerId: ownerId,
      mortgaged: false,
      buildLevel: levels[index] ?? 0,
    };
  });
  return {
    ...state,
    ownership,
    players: { ...state.players, [ownerId]: { ...state.players[ownerId], cash } },
  };
};

/**
 * Every refusal the pure rules can produce over a spread of states.
 *
 * Swept over the whole board rather than listed, so a branch nobody thought to
 * enumerate is still covered - and a new refusal written in the wrong voice is
 * caught without anybody adding it here.
 */
const collectReasons = (): string[] => {
  const base = createGame();
  const [owner, other] = base.playerOrder;
  const states: GameState[] = [
    base,
    withGroup(base, [0, 0], 5000),
    withGroup(base, [0, 0], 0),
    withGroup(base, [1, 2], 5000),
    withGroup(base, [4, 4], 5000),
    withGroup(base, [5, 4], 5000),
    // A bank out of stock, at both ends of the ladder.
    {
      ...withGroup(base, [0, 0], 5000),
      bank: { ...base.bank, housesAvailable: 0 },
    },
    {
      ...withGroup(base, [4, 4], 5000),
      bank: { ...base.bank, hotelsAvailable: 0 },
    },
  ];

  const reasons: string[] = [];
  states.forEach((state) => {
    state.board.forEach((space) => {
      [owner, other].forEach((playerId) => {
        reasons.push(buildBlockedReason(state, space.id, playerId));
        reasons.push(sellBlockedReason(state, space.id, playerId));
        reasons.push(tradeBlockedReason(state, space.id, playerId));
        if (state.ownership[space.id]?.ownerPlayerId === playerId) {
          getSiteActions(state, space.id, playerId).forEach((action) =>
            reasons.push(action.disabledReason)
          );
        }
      });
    });
  });

  // An incomplete set, and a mortgaged site the owner cannot redeem: two
  // branches no ownership spread above reaches, because withGroup always hands
  // over the whole group unmortgaged.
  const [brownOne] = groupOf(base, ColorGroup.Brown);
  const partial: GameState = {
    ...base,
    ownership: {
      ...base.ownership,
      [brownOne.id]: { ownerPlayerId: owner, mortgaged: false, buildLevel: 0 },
    },
    players: { ...base.players, [owner]: { ...base.players[owner], cash: 0 } },
  };
  reasons.push(buildBlockedReason(partial, brownOne.id, owner));
  const mortgaged: GameState = {
    ...partial,
    ownership: {
      ...partial.ownership,
      [brownOne.id]: { ownerPlayerId: owner, mortgaged: true, buildLevel: 0 },
    },
  };
  getSiteActions(mortgaged, brownOne.id, owner).forEach((action) =>
    reasons.push(action.disabledReason)
  );

  // The mortgaged-set branch, which no ownership spread above reaches.
  const mortgagedSet = withGroup(base, [0, 0], 5000);
  const [firstBrown, secondBrown] = groupOf(mortgagedSet, ColorGroup.Brown);
  reasons.push(
    buildBlockedReason(
      {
        ...mortgagedSet,
        ownership: {
          ...mortgagedSet.ownership,
          [secondBrown.id]: {
            ...mortgagedSet.ownership[secondBrown.id],
            mortgaged: true,
          },
        },
      },
      firstBrown.id,
      owner
    )
  );

  reasons.push(buyBlockedReason(0, 100) ?? '');
  const auction: AuctionState = {
    id: 'auction-1',
    spaceId: firstBrown.id,
    startPrice: 10,
    minIncrement: 1,
    highestBid: 100,
    highestBidderId: other,
    activeBidderOrder: [owner, other],
    activeBidderIndex: 0,
    passedPlayerIds: [],
    ledger: [],
  };
  reasons.push(bidBlockedReason(auction, 500, Number.NaN, '₹') ?? '');
  reasons.push(bidBlockedReason(auction, 500, 50, '₹') ?? '');
  reasons.push(bidBlockedReason(auction, 5, 500, '₹') ?? '');

  reasons.push(tradeBlockedReason(base, 'no-such-space', owner));

  return [...new Set(reasons.filter((reason) => reason !== ''))];
};

describe('every blocked reason reads the same way', () => {
  const reasons = collectReasons();

  // Without this the rules below could pass on an empty list.
  it('sweeps a real spread of refusals', () => {
    expect(reasons.length).toBeGreaterThanOrEqual(20);
  });

  it('is a fragment, so it carries no terminal full stop', () => {
    const withStops = reasons.filter((reason) => reason.endsWith('.'));
    expect(withStops).toEqual([]);
  });

  it('starts with a capital, because it begins its own line', () => {
    const lowercase = reasons.filter((reason) => reason[0] !== reason[0].toUpperCase());
    expect(lowercase).toEqual([]);
  });

  it('is one clause, not two sentences', () => {
    const multiSentence = reasons.filter((reason) => reason.includes('. '));
    expect(multiSentence).toEqual([]);
  });
});
