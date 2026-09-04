import { describe, expect, it } from 'vitest';
import { HOTEL_BUILD_LEVEL } from '../constants/game.constants';
import { GameCommandType, PropertyAction } from '../types/game.enums';
import type { GameState } from '../types/game.interfaces';
import { createGameState } from './gameEngine';
import { buyBlockedReason, getSiteActions } from './playerActions.utils';
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

  it('states the real reason for every action on a lone site', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[0]);

    const actions = getSiteActions(game, spaceId, game.playerOrder[0]);
    const byAction = (action: PropertyAction) =>
      actions.find((candidate) => candidate.action === action);

    // One site out of its colour set: nothing to build on, nothing built.
    expect(byAction(PropertyAction.Build)?.disabledReason).toMatch(/colour set/i);
    expect(byAction(PropertyAction.Sell)?.disabledReason).toMatch(/nothing built/i);
    // Mortgage is available on an unmortgaged site the player owns.
    expect(byAction(PropertyAction.Mortgage)?.isEnabled).toBe(true);
    // Redeem is not, because there is nothing to redeem.
    expect(byAction(PropertyAction.Redeem)?.disabledReason).toBe('Not mortgaged');
  });

  // The label and the command both follow the build level, so one button can
  // mean a house at level 0 and a hotel at level 4.
  it('turns Build into a hotel once the site holds four houses', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[0]);
    game.ownership[spaceId].buildLevel = 4;

    const build = getSiteActions(game, spaceId, game.playerOrder[0]).find(
      (action) => action.action === PropertyAction.Build
    );

    expect(build?.label).toBe('Build hotel');
    expect(build?.command).toBe(GameCommandType.BuildHotel);
  });

  it('turns Sell into a hotel sale once a hotel stands there', () => {
    const game = createGame();
    const spaceId = giveFirstStreetTo(game, game.playerOrder[0]);
    game.ownership[spaceId].buildLevel = HOTEL_BUILD_LEVEL;

    const sell = getSiteActions(game, spaceId, game.playerOrder[0]).find(
      (action) => action.action === PropertyAction.Sell
    );

    expect(sell?.label).toBe('Sell hotel');
    expect(sell?.command).toBe(GameCommandType.SellHotel);
  });

  it('offers no building actions on a railway', () => {
    const game = createGame();
    const railway = game.board.find((space) => space.kind === 'railway')!;
    game.ownership[railway.id].ownerPlayerId = game.playerOrder[0];

    const actions = getSiteActions(game, railway.id, game.playerOrder[0]);
    const byAction = (action: PropertyAction) =>
      actions.find((candidate) => candidate.action === action);

    expect(byAction(PropertyAction.Build)?.disabledReason).toMatch(/only streets/i);
    expect(byAction(PropertyAction.Sell)?.disabledReason).toMatch(/only streets/i);
    expect(byAction(PropertyAction.Mortgage)?.isEnabled).toBe(true);
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

/**
 * The rule behind both the disabled Buy button and the engine's throw.
 *
 * It was an inline comparison in the command alone, so the button was always
 * live: a player without the cash clicked Buy, the engine threw, and the modal
 * stayed up with nothing on screen saying why. Every other affordability rule
 * here was already guarded this way.
 */
describe('buyBlockedReason', () => {
  it('allows a purchase the player can afford', () => {
    expect(buyBlockedReason(200, 100)).toBeNull();
  });

  // The boundary is the one worth pinning: exactly the price is affordable,
  // and the engine's guard has to agree with the button on it.
  it('allows a purchase that spends the player out exactly', () => {
    expect(buyBlockedReason(100, 100)).toBeNull();
  });

  it('blocks a purchase one rupee short, and says why', () => {
    expect(buyBlockedReason(99, 100)).toMatch(/not enough cash/i);
  });

  it('blocks a broke player', () => {
    expect(buyBlockedReason(0, 60)).toMatch(/not enough cash/i);
  });
});
