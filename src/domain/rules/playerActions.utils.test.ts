import { describe, expect, it } from 'vitest';
import { PropertyAction } from '../types/game.enums';
import type { GameState } from '../types/game.interfaces';
import { createGameState } from './gameEngine';
import { getPropertyActions, getSiteActions } from './playerActions.utils';
import { SeededRandomSource } from './rng';

const createGame = (): GameState =>
  createGameState(
    {
      name: 'Actions Test',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(11)
  );

const giveFirstStreetTo = (game: GameState, playerId: string) => {
  const street = game.board.find((space) => space.kind === 'street');
  game.ownership[street!.id].ownerPlayerId = playerId;
  return street!.id;
};

describe('getPropertyActions', () => {
  it('offers exactly the four property actions', () => {
    const game = createGame();

    expect(getPropertyActions(game, game.playerOrder[0]).map((a) => a.action)).toEqual([
      PropertyAction.Build,
      PropertyAction.Sell,
      PropertyAction.Mortgage,
      PropertyAction.Redeem,
    ]);
  });

  // Every underlying command is still scaffolded in the engine, so the rail must
  // not present them as usable. Delete this expectation as each command lands.
  it('disables every action while its engine command is scaffolded', () => {
    const game = createGame();

    const actions = getPropertyActions(game, game.playerOrder[0]);

    expect(actions.every((action) => !action.isEnabled)).toBe(true);
    expect(actions.every((action) => action.disabledReason.length > 0)).toBe(true);
  });

  it('reports the scaffolded reason even when the player owns property', () => {
    const game = createGame();
    const playerId = game.playerOrder[0];
    giveFirstStreetTo(game, playerId);

    const build = getPropertyActions(game, playerId).find(
      (action) => action.action === PropertyAction.Build
    );

    expect(build?.disabledReason).toBe('Not implemented yet');
  });
});

describe('getSiteActions', () => {
  const firstStreetId = (game: GameState) =>
    game.board.find((space) => space.kind === 'street')!.id;

  // An empty list is what tells the site panel it is not the owner's site, so
  // the three panel states hinge on this.
  it('offers nothing for a space nobody owns', () => {
    const game = createGame();

    expect(getSiteActions(game, firstStreetId(game), game.playerOrder[0])).toEqual([]);
  });

  it('offers nothing for a space another player owns', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[1]);

    expect(getSiteActions(game, spaceId, game.playerOrder[0])).toEqual([]);
  });

  it('offers all four actions on a space the player owns', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[0]);

    expect(
      getSiteActions(game, spaceId, game.playerOrder[0]).map((a) => a.action)
    ).toEqual([
      PropertyAction.Build,
      PropertyAction.Sell,
      PropertyAction.Mortgage,
      PropertyAction.Redeem,
    ]);
  });

  it('offers nothing for a space that cannot be owned at all', () => {
    const game = createGame();
    const chance = game.board.find((space) => space.kind === 'chance')!;

    expect(getSiteActions(game, chance.id, game.playerOrder[0])).toEqual([]);
  });

  it('offers nothing for an unknown space id', () => {
    const game = createGame();

    expect(getSiteActions(game, 'space-does-not-exist', game.playerOrder[0])).toEqual([]);
  });

  // Build and Sell are still scaffolded; mortgage and redeem now work. Delete
  // the Build/Sell half of this as those commands land.
  it('offers mortgage and redeem, and still disables build and sell', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[0]);

    const actions = getSiteActions(game, spaceId, game.playerOrder[0]);
    const byAction = (action: PropertyAction) =>
      actions.find((candidate) => candidate.action === action);

    expect(byAction(PropertyAction.Build)?.disabledReason).toBe('Not implemented yet');
    expect(byAction(PropertyAction.Sell)?.disabledReason).toBe('Not implemented yet');
    // Mortgage is available on an unmortgaged site the player owns.
    expect(byAction(PropertyAction.Mortgage)?.isEnabled).toBe(true);
    // Redeem is not, because there is nothing to redeem.
    expect(byAction(PropertyAction.Redeem)?.disabledReason).toBe('Not mortgaged');
  });

  it('swaps mortgage for redeem once the site is mortgaged', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[0]);
    game.ownership[spaceId].mortgaged = true;

    const actions = getSiteActions(game, spaceId, game.playerOrder[0]);
    const byAction = (action: PropertyAction) =>
      actions.find((candidate) => candidate.action === action);

    expect(byAction(PropertyAction.Mortgage)?.disabledReason).toBe('Already mortgaged');
    expect(byAction(PropertyAction.Redeem)?.isEnabled).toBe(true);
  });

  it('blocks redeeming when the player cannot afford the interest', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[0]);
    game.ownership[spaceId].mortgaged = true;
    game.players[game.playerOrder[0]].cash = 0;

    const redeem = getSiteActions(game, spaceId, game.playerOrder[0]).find(
      (action) => action.action === PropertyAction.Redeem
    );

    expect(redeem?.isEnabled).toBe(false);
    expect(redeem?.disabledReason).toMatch(/not enough cash/i);
  });

  // The rule holds even though nothing can build yet, so the guard is testable.
  it('blocks mortgaging while the colour set holds buildings', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[0]);
    const street = game.board.find((space) => space.id === spaceId);
    const sibling = game.board.find(
      (space) =>
        space.kind === 'street' &&
        space.id !== spaceId &&
        'colorGroup' in space &&
        'colorGroup' in street! &&
        space.colorGroup === street.colorGroup
    );
    game.ownership[sibling!.id].ownerPlayerId = game.playerOrder[0];
    game.ownership[sibling!.id].buildLevel = 1;

    const mortgage = getSiteActions(game, spaceId, game.playerOrder[0]).find(
      (action) => action.action === PropertyAction.Mortgage
    );

    expect(mortgage?.isEnabled).toBe(false);
    expect(mortgage?.disabledReason).toMatch(/sell the buildings/i);
  });
});
