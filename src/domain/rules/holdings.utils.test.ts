import { describe, expect, it } from 'vitest';
import { ColorGroup, SpaceKind } from '../types/game.enums';
import type { GameState, StreetSpace } from '../types/game.interfaces';
import { createGameState } from './gameEngine';
import {
  getColorGroupProgress,
  getGroupedHoldings,
  getMortgagedCount,
  getNetWorth,
  getPlayerOwnedSpaces,
  ownsEntireColorSet,
} from './holdings.utils';
import { SeededRandomSource } from './rng';
import { isStreetSpace } from './space.utils';

const createGame = (): GameState =>
  createGameState(
    {
      name: 'Holdings Test',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-08-30T00:00:00.000Z',
    },
    new SeededRandomSource(9)
  );

const streetsOf = (game: GameState, group: ColorGroup): StreetSpace[] =>
  game.board.filter(
    (space): space is StreetSpace => isStreetSpace(space) && space.colorGroup === group
  );

const give = (game: GameState, spaceId: string, playerId: string) => {
  game.ownership[spaceId].ownerPlayerId = playerId;
};

describe('ownsEntireColorSet', () => {
  it('is false while the set is incomplete', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    const browns = streetsOf(game, ColorGroup.Brown);
    give(game, browns[0].id, player);

    expect(ownsEntireColorSet(game, player, ColorGroup.Brown)).toBe(false);
  });

  it('is true once every street in the group is owned', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    streetsOf(game, ColorGroup.Brown).forEach((space) => give(game, space.id, player));

    expect(ownsEntireColorSet(game, player, ColorGroup.Brown)).toBe(true);
  });

  // `[].every()` is true, so an empty group would otherwise read as owned by all.
  it('is false for a group with no streets on the board', () => {
    const game = createGame();
    const boardWithoutBrown = game.board.filter(
      (space) => !(isStreetSpace(space) && space.colorGroup === ColorGroup.Brown)
    );

    expect(
      ownsEntireColorSet(
        { ...game, board: boardWithoutBrown },
        game.playerOrder[0],
        ColorGroup.Brown
      )
    ).toBe(false);
  });
});

describe('getNetWorth', () => {
  it('is just cash before anything is bought', () => {
    const game = createGame();
    const [player] = game.playerOrder;

    expect(getNetWorth(game, player)).toBe(game.players[player].cash);
  });

  it('adds the site price of an unmortgaged holding', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    const street = streetsOf(game, ColorGroup.Brown)[0];
    give(game, street.id, player);

    expect(getNetWorth(game, player)).toBe(game.players[player].cash + street.price);
  });

  // Mortgaging draws cash against the site, so it is worth the mortgage value.
  it('counts a mortgaged site at its mortgage value', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    const street = streetsOf(game, ColorGroup.Brown)[0];
    give(game, street.id, player);
    game.ownership[street.id].mortgaged = true;

    expect(getNetWorth(game, player)).toBe(
      game.players[player].cash + street.mortgageValue
    );
  });

  it('adds buildings at what they cost', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    const street = streetsOf(game, ColorGroup.Brown)[0];
    give(game, street.id, player);
    game.ownership[street.id].buildLevel = 3;

    expect(getNetWorth(game, player)).toBe(
      game.players[player].cash + street.price + street.houseCost * 3
    );
  });

  it('ignores another player’s holdings', () => {
    const game = createGame();
    const [first, second] = game.playerOrder;
    give(game, streetsOf(game, ColorGroup.Brown)[0].id, second);

    expect(getNetWorth(game, first)).toBe(game.players[first].cash);
  });
});

describe('getMortgagedCount', () => {
  it('counts only mortgaged holdings', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    const browns = streetsOf(game, ColorGroup.Brown);
    browns.forEach((space) => give(game, space.id, player));
    game.ownership[browns[0].id].mortgaged = true;

    expect(getMortgagedCount(game, player)).toBe(1);
  });

  it('is zero when nothing is mortgaged', () => {
    const game = createGame();

    expect(getMortgagedCount(game, game.playerOrder[0])).toBe(0);
  });
});

describe('getColorGroupProgress', () => {
  it('omits groups the player holds nothing in', () => {
    const game = createGame();

    expect(getColorGroupProgress(game, game.playerOrder[0])).toEqual([]);
  });

  it('reports partial progress', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    const browns = streetsOf(game, ColorGroup.Brown);
    give(game, browns[0].id, player);

    const [progress] = getColorGroupProgress(game, player);
    expect(progress.group).toBe(ColorGroup.Brown);
    expect(progress.owned).toBe(1);
    expect(progress.total).toBe(browns.length);
    expect(progress.isComplete).toBe(false);
  });

  it('reports a complete set', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    streetsOf(game, ColorGroup.Brown).forEach((space) => give(game, space.id, player));

    const [progress] = getColorGroupProgress(game, player);
    expect(progress.isComplete).toBe(true);
    expect(progress.owned).toBe(progress.total);
  });
});

describe('getGroupedHoldings', () => {
  it('is empty before anything is bought', () => {
    const game = createGame();

    expect(getGroupedHoldings(game, game.playerOrder[0])).toEqual([]);
  });

  // Colour groups in board order, then railways, then utilities.
  it('orders colour groups by the board, with railways and utilities last', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    // Own one of each, deliberately assigned out of order.
    game.board
      .filter((s) => s.kind === SpaceKind.Utility)
      .forEach((s) => give(game, s.id, player));
    game.board
      .filter((s) => s.kind === SpaceKind.Railway)
      .forEach((s) => give(game, s.id, player));
    streetsOf(game, ColorGroup.DarkBlue).forEach((s) => give(game, s.id, player));
    streetsOf(game, ColorGroup.Brown).forEach((s) => give(game, s.id, player));

    const ids = getGroupedHoldings(game, player).map((section) => section.id);

    expect(ids).toEqual([ColorGroup.Brown, ColorGroup.DarkBlue, 'railway', 'utility']);
  });

  it('labels a group and marks a completed set', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    streetsOf(game, ColorGroup.DarkBlue).forEach((s) => give(game, s.id, player));

    const [section] = getGroupedHoldings(game, player);
    expect(section.label).toBe('Dark Blue');
    expect(section.colorGroup).toBe(ColorGroup.DarkBlue);
    expect(section.isComplete).toBe(true);
    expect(section.spaces).toHaveLength(section.total);
  });

  it('reports a partial group with the full set total', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    const browns = streetsOf(game, ColorGroup.Brown);
    give(game, browns[0].id, player);

    const [section] = getGroupedHoldings(game, player);
    expect(section.owned).toBe(1);
    expect(section.total).toBe(browns.length);
    expect(section.isComplete).toBe(false);
  });

  it('contains every space the player owns, once', () => {
    const game = createGame();
    const [player] = game.playerOrder;
    streetsOf(game, ColorGroup.Brown).forEach((s) => give(game, s.id, player));
    game.board
      .filter((s) => s.kind === SpaceKind.Railway)
      .forEach((s) => give(game, s.id, player));

    const grouped = getGroupedHoldings(game, player).flatMap((s) => s.spaces);

    expect(grouped).toHaveLength(getPlayerOwnedSpaces(game, player).length);
    expect(new Set(grouped.map((s) => s.id)).size).toBe(grouped.length);
  });
});
