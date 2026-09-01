import { describe, expect, it } from 'vitest';
import { MORTGAGE_INTEREST_PERCENT } from '../constants/game.constants';
import { indiaEditionTheme } from '../themes/indiaEditionTheme';
import type { GameState, StreetSpace, TradeState } from '../types/game.interfaces';
import { createGameState } from './gameEngine';
import { SeededRandomSource } from './rng';
import { isStreetSpace } from './space.utils';
import {
  acceptanceBlockedReason,
  getMortgageTransferFee,
  getTradableSites,
  getTransferFees,
  proposalBlockedReason,
} from './trade.utils';

const createGame = (): GameState =>
  createGameState(
    {
      name: 'Trading',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: indiaEditionTheme.id,
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(13)
  );

/** Gives each player one street, far enough apart to be in different groups. */
const withOneSiteEach = (game: GameState) => {
  const streets = game.board.filter(isStreetSpace) as StreetSpace[];
  const [asha, vikram] = game.playerOrder;
  const ashaSite = streets[0];
  const vikramSite = streets[streets.length - 1];

  return {
    ashaSite,
    vikramSite,
    state: {
      ...game,
      ownership: {
        ...game.ownership,
        [ashaSite.id]: { ownerPlayerId: asha, mortgaged: false, buildLevel: 0 },
        [vikramSite.id]: { ownerPlayerId: vikram, mortgaged: false, buildLevel: 0 },
      },
    } as GameState,
  };
};

const makeTrade = (game: GameState, overrides: Partial<TradeState> = {}): TradeState => ({
  proposerPlayerId: game.playerOrder[0],
  recipientPlayerId: game.playerOrder[1],
  offeredCash: 0,
  requestedCash: 0,
  offeredSpaceIds: [],
  requestedSpaceIds: [],
  offeredJailCards: 0,
  requestedJailCards: 0,
  ...overrides,
});

describe('proposalBlockedReason', () => {
  it('allows a site-for-cash swap both sides can cover', () => {
    const { state, ashaSite } = withOneSiteEach(createGame());
    const trade = makeTrade(state, {
      offeredSpaceIds: [ashaSite.id],
      requestedCash: 200,
    });

    expect(proposalBlockedReason(state, trade)).toBe('');
  });

  it('refuses a trade with yourself', () => {
    const state = createGame();
    const trade = makeTrade(state, {
      recipientPlayerId: state.playerOrder[0],
      offeredCash: 10,
    });

    expect(proposalBlockedReason(state, trade)).toMatch(/with yourself/i);
  });

  it('refuses a trade that moves nothing', () => {
    const state = createGame();

    expect(proposalBlockedReason(state, makeTrade(state))).toMatch(/move something/i);
  });

  it('refuses cash the proposer does not have', () => {
    const state = createGame();
    const trade = makeTrade(state, { offeredCash: 999_999 });

    expect(proposalBlockedReason(state, trade)).toMatch(/you does not have|much cash/i);
  });

  // Checked up front rather than at acceptance, so the proposer is not left
  // watching a trade that could never complete.
  it('refuses cash the recipient does not have', () => {
    const state = createGame();
    const trade = makeTrade(state, { requestedCash: 999_999 });

    expect(proposalBlockedReason(state, trade)).toMatch(/much cash/i);
  });

  it('refuses a site the proposer does not own', () => {
    const { state, vikramSite } = withOneSiteEach(createGame());
    const trade = makeTrade(state, { offeredSpaceIds: [vikramSite.id] });

    expect(proposalBlockedReason(state, trade)).toMatch(/not owned/i);
  });

  it('refuses a negative amount', () => {
    const state = createGame();
    const trade = makeTrade(state, { offeredCash: -50 });

    expect(proposalBlockedReason(state, trade)).toMatch(/negative/i);
  });

  it('refuses jail cards a player does not hold', () => {
    const state = createGame();
    const trade = makeTrade(state, { offeredJailCards: 1 });

    expect(proposalBlockedReason(state, trade)).toMatch(/jail free/i);
  });

  // The rule covers the colour group, not the one site being traded.
  it('refuses a site whose colour set holds buildings', () => {
    const game = createGame();
    const streets = game.board.filter(isStreetSpace) as StreetSpace[];
    const site = streets[0];
    const sibling = streets.find(
      (candidate) => candidate.id !== site.id && candidate.colorGroup === site.colorGroup
    ) as StreetSpace;
    const [asha] = game.playerOrder;
    const state: GameState = {
      ...game,
      ownership: {
        ...game.ownership,
        [site.id]: { ownerPlayerId: asha, mortgaged: false, buildLevel: 0 },
        [sibling.id]: { ownerPlayerId: asha, mortgaged: false, buildLevel: 2 },
      },
    };

    expect(
      proposalBlockedReason(state, makeTrade(state, { offeredSpaceIds: [site.id] }))
    ).toMatch(/sell the buildings/i);
  });

  it('refuses a player who has left the game', () => {
    const game = createGame();
    const state: GameState = {
      ...game,
      players: {
        ...game.players,
        [game.playerOrder[1]]: {
          ...game.players[game.playerOrder[1]],
          isBankrupt: true,
        },
      },
    };

    expect(proposalBlockedReason(state, makeTrade(state, { offeredCash: 10 }))).toMatch(
      /left the game/i
    );
  });
});

describe('mortgaged sites in a trade', () => {
  it('charges the receiver 10%, rounded up', () => {
    expect(getMortgageTransferFee(100)).toBe(10);
    expect(getMortgageTransferFee(45)).toBe(
      Math.ceil((45 * MORTGAGE_INTEREST_PERCENT) / 100)
    );
  });

  it('counts the fee only on mortgaged sites', () => {
    const { state, ashaSite, vikramSite } = withOneSiteEach(createGame());
    const mortgaged: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [ashaSite.id]: { ...state.ownership[ashaSite.id], mortgaged: true },
      },
    };

    expect(getTransferFees(mortgaged, [ashaSite.id, vikramSite.id])).toBe(
      getMortgageTransferFee(ashaSite.mortgageValue)
    );
  });

  // The fee is not part of the proposal's checks, so acceptance is where a
  // receiver who cannot cover it has to be caught.
  it('refuses acceptance when the receiver cannot cover the fee', () => {
    const { state, ashaSite } = withOneSiteEach(createGame());
    const [, vikram] = state.playerOrder;
    const broke: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [ashaSite.id]: { ...state.ownership[ashaSite.id], mortgaged: true },
      },
      players: {
        ...state.players,
        [vikram]: { ...state.players[vikram], cash: 0 },
      },
    };
    const trade = makeTrade(broke, { offeredSpaceIds: [ashaSite.id] });

    expect(proposalBlockedReason(broke, trade)).toBe('');
    expect(acceptanceBlockedReason(broke, trade)).toMatch(/mortgage interest/i);
  });
});

describe('getTradableSites', () => {
  it('lists what a player holds and why anything is blocked', () => {
    const { state, ashaSite } = withOneSiteEach(createGame());

    const sites = getTradableSites(state, state.playerOrder[0]);

    expect(sites).toEqual([
      {
        spaceId: ashaSite.id,
        name: ashaSite.name,
        mortgaged: false,
        blockedReason: '',
      },
    ]);
  });
});
