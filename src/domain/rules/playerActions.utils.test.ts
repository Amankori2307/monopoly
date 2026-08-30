import { describe, expect, it } from 'vitest';
import { PropertyAction } from '../types/game.enums';
import type { GameState } from '../types/game.interfaces';
import { createGameState } from './gameEngine';
import { getPropertyActions } from './playerActions.utils';
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
