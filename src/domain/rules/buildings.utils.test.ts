import { describe, expect, it } from 'vitest';
import { HOTEL_BUILD_LEVEL, MAX_HOUSES_PER_SITE } from '../constants/game.constants';
import { indiaEditionTheme } from '../themes/indiaEditionTheme';
import { ColorGroup } from '../types/game.enums';
import type { GameState, StreetSpace } from '../types/game.interfaces';
import {
  buildBlockedReason,
  getBuildingRefund,
  getBuildingSaleValue,
  getSellableBuildings,
  sellBlockedReason,
} from './buildings.utils';
import { createGameState } from './gameEngine';
import { SeededRandomSource } from './rng';
import { isStreetSpace } from './space.utils';

/**
 * The even rules are the part of Monopoly most often got wrong, so they are
 * tested as a table of levels rather than through the engine.
 */

const createGame = (): GameState =>
  createGameState(
    {
      name: 'Buildings',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: indiaEditionTheme.id,
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(11)
  );

/** The two-site Brown group is the smallest complete set to reason about. */
const groupOf = (state: GameState, group: ColorGroup): StreetSpace[] =>
  state.board.filter(
    (space): space is StreetSpace => isStreetSpace(space) && space.colorGroup === group
  );

/** Owns the whole group for the first player, at the given build levels. */
const withGroup = (
  state: GameState,
  group: ColorGroup,
  levels: number[],
  cash = 5000
): GameState => {
  const sites = groupOf(state, group);
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

describe('buildBlockedReason', () => {
  it('allows a build on a complete, unmortgaged, even colour set', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [0, 0]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(buildBlockedReason(state, first.id, state.playerOrder[0])).toBe('');
  });

  it('refuses a site whose colour set is incomplete', () => {
    const base = createGame();
    const [first] = groupOf(base, ColorGroup.Brown);
    const state: GameState = {
      ...base,
      ownership: {
        ...base.ownership,
        [first.id]: {
          ownerPlayerId: base.playerOrder[0],
          mortgaged: false,
          buildLevel: 0,
        },
      },
    };

    expect(buildBlockedReason(state, first.id, state.playerOrder[0])).toMatch(
      /every site in this colour set/i
    );
  });

  it('refuses a build while any site in the set is mortgaged', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [0, 0]);
    const [first, second] = groupOf(state, ColorGroup.Brown);
    const mortgaged: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [second.id]: { ...state.ownership[second.id], mortgaged: true },
      },
    };

    expect(buildBlockedReason(mortgaged, first.id, state.playerOrder[0])).toMatch(
      /mortgaged/i
    );
  });

  // The even rule: a second house here while the other site has none is the
  // classic illegal build.
  it('refuses a build that would open a two-level gap', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [1, 0]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(buildBlockedReason(state, first.id, state.playerOrder[0])).toMatch(
      /rest of the colour set up first/i
    );
  });

  it('allows the build that levels the set up', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [1, 0]);
    const [, second] = groupOf(state, ColorGroup.Brown);

    expect(buildBlockedReason(state, second.id, state.playerOrder[0])).toBe('');
  });

  // "Every site must hold four houses before any hotel" falls out of the same
  // comparison: going to 5 beside a 3 is a two-level gap.
  it('refuses a hotel while another site is short of four houses', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [MAX_HOUSES_PER_SITE, 3]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(buildBlockedReason(state, first.id, state.playerOrder[0])).toMatch(
      /rest of the colour set up first/i
    );
  });

  it('allows a hotel once the whole set holds four houses', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [
      MAX_HOUSES_PER_SITE,
      MAX_HOUSES_PER_SITE,
    ]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(buildBlockedReason(state, first.id, state.playerOrder[0])).toBe('');
  });

  it('refuses building past a hotel', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [
      HOTEL_BUILD_LEVEL,
      MAX_HOUSES_PER_SITE,
    ]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(buildBlockedReason(state, first.id, state.playerOrder[0])).toMatch(
      /most this site can hold/i
    );
  });

  it('refuses a build the player cannot pay for', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [0, 0], 5);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(buildBlockedReason(state, first.id, state.playerOrder[0])).toMatch(
      /not enough cash/i
    );
  });

  it('refuses a build once the bank is out of houses', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [0, 0]);
    const [first] = groupOf(state, ColorGroup.Brown);
    const empty: GameState = { ...state, bank: { ...state.bank, housesAvailable: 0 } };

    expect(buildBlockedReason(empty, first.id, state.playerOrder[0])).toMatch(
      /no houses left/i
    );
  });

  it('refuses a hotel once the bank is out of hotels', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [
      MAX_HOUSES_PER_SITE,
      MAX_HOUSES_PER_SITE,
    ]);
    const [first] = groupOf(state, ColorGroup.Brown);
    const empty: GameState = { ...state, bank: { ...state.bank, hotelsAvailable: 0 } };

    expect(buildBlockedReason(empty, first.id, state.playerOrder[0])).toMatch(
      /no hotels left/i
    );
  });

  it('refuses a site the player does not own', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [0, 0]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(buildBlockedReason(state, first.id, state.playerOrder[1])).toMatch(
      /do not own/i
    );
  });

  it('refuses a space that is not a street', () => {
    const state = createGame();

    expect(buildBlockedReason(state, state.board[0].id, state.playerOrder[0])).toMatch(
      /only streets/i
    );
  });
});

describe('sellBlockedReason', () => {
  it('allows selling down from an even set', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [2, 2]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(sellBlockedReason(state, first.id, state.playerOrder[0])).toBe('');
  });

  // Even selling, in reverse: 2/1 -> 1/1 is fine, 1/2 -> 0/2 is not.
  it('refuses a sale that would open a two-level gap', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [1, 2]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(sellBlockedReason(state, first.id, state.playerOrder[0])).toMatch(
      /down first/i
    );
  });

  it('refuses selling from a bare site', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [0, 0]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(sellBlockedReason(state, first.id, state.playerOrder[0])).toMatch(
      /nothing built/i
    );
  });

  // A hotel reverts to four houses, so the bank must have four to give.
  it('refuses breaking a hotel the bank cannot cover in houses', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [
      HOTEL_BUILD_LEVEL,
      MAX_HOUSES_PER_SITE,
    ]);
    const [first] = groupOf(state, ColorGroup.Brown);
    const short: GameState = { ...state, bank: { ...state.bank, housesAvailable: 3 } };

    expect(sellBlockedReason(short, first.id, state.playerOrder[0])).toMatch(
      /too few houses/i
    );
  });
});

describe('what a player can raise from buildings', () => {
  it('lists only the buildings that can legally be sold', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [1, 2]);
    const sellable = getSellableBuildings(state, state.playerOrder[0]);

    expect(sellable.map((entry) => entry.buildLevel)).toEqual([2]);
  });

  it('refunds half the build cost, rounded down', () => {
    expect(getBuildingRefund(50)).toBe(25);
    expect(getBuildingRefund(25)).toBe(12);
  });

  it('values every level down to a bare site', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [2, 0]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(getBuildingSaleValue(state, state.playerOrder[0])).toBe(
      2 * getBuildingRefund(first.houseCost)
    );
  });

  it('counts a hotel as its four houses plus itself', () => {
    const state = withGroup(createGame(), ColorGroup.Brown, [HOTEL_BUILD_LEVEL, 0]);
    const [first] = groupOf(state, ColorGroup.Brown);

    expect(getBuildingSaleValue(state, state.playerOrder[0])).toBe(
      MAX_HOUSES_PER_SITE * getBuildingRefund(first.houseCost) +
        getBuildingRefund(first.hotelCost)
    );
  });
});
