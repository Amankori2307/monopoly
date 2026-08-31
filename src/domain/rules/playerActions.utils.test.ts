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

  // Every command is still scaffolded, so the panel shows them disabled with a
  // reason rather than pretending they work. Delete as each command lands.
  it('disables every action while its engine command is scaffolded', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[0]);

    const actions = getSiteActions(game, spaceId, game.playerOrder[0]);

    expect(actions.every((action) => !action.isEnabled)).toBe(true);
    expect(
      actions.every((action) => action.disabledReason === 'Not implemented yet')
    ).toBe(true);
  });
});
