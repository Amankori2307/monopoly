import { describe, expect, it } from 'vitest';
import { SPEED_DIE_FACES } from '../constants/game.constants';
import { indiaEditionTheme } from '../themes/indiaEditionTheme';
import { SpeedDieFace } from '../types/game.enums';
import type { GameState } from '../types/game.interfaces';
import { createGameState } from './gameEngine';
import { SeededRandomSource } from './rng';
import {
  isSpeedDieActive,
  isTriple,
  rollSpeedDie,
  speedDieSteps,
} from './speedDie.utils';

const createGame = (useSpeedDie: boolean): GameState =>
  createGameState(
    {
      name: 'Speed',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: indiaEditionTheme.id,
      createdAt: '2026-08-29T00:00:00.000Z',
      useSpeedDie,
    },
    new SeededRandomSource(17)
  );

const withPassedGo = (state: GameState, playerIds: string[]): GameState => ({
  ...state,
  players: Object.fromEntries(
    Object.entries(state.players).map(([id, player]) => [
      id,
      { ...player, hasPassedGo: playerIds.includes(id) },
    ])
  ),
});

describe('isSpeedDieActive', () => {
  it('is never active in a game that did not ask for it', () => {
    const game = withPassedGo(createGame(false), ['player-1', 'player-2']);

    expect(isSpeedDieActive(game)).toBe(false);
  });

  // Not used until every player has been round once, which is the printed rule
  // and what stops an early Speed Die running away with the game.
  it('waits until every player has passed GO', () => {
    const game = createGame(true);

    expect(isSpeedDieActive(withPassedGo(game, []))).toBe(false);
    expect(isSpeedDieActive(withPassedGo(game, ['player-1']))).toBe(false);
    expect(isSpeedDieActive(withPassedGo(game, ['player-1', 'player-2']))).toBe(true);
  });

  // A bankrupt player cannot pass GO again, so counting them would freeze the
  // die for the rest of the game.
  it('ignores players who have left the game', () => {
    const game = withPassedGo(createGame(true), ['player-1']);
    const withBankrupt: GameState = {
      ...game,
      players: {
        ...game.players,
        'player-2': { ...game.players['player-2'], isBankrupt: true },
      },
    };

    expect(isSpeedDieActive(withBankrupt)).toBe(true);
  });
});

describe('the die itself', () => {
  // The printed die carries Bus twice, which is why the faces are a list rather
  // than the enum's values.
  it('has six faces, with two buses', () => {
    expect(SPEED_DIE_FACES).toHaveLength(6);
    expect(SPEED_DIE_FACES.filter((face) => face === SpeedDieFace.Bus)).toHaveLength(2);
    expect(SPEED_DIE_FACES).toContain(SpeedDieFace.MrMonopoly);
  });

  it('only ever rolls one of its own faces', () => {
    const source = new SeededRandomSource(23);

    Array.from({ length: 60 }).forEach(() => {
      expect(SPEED_DIE_FACES).toContain(rollSpeedDie(source));
    });
  });

  it('adds nothing for the faces that are not numbers', () => {
    expect(speedDieSteps(SpeedDieFace.One)).toBe(1);
    expect(speedDieSteps(SpeedDieFace.Two)).toBe(2);
    expect(speedDieSteps(SpeedDieFace.Three)).toBe(3);
    expect(speedDieSteps(SpeedDieFace.Bus)).toBe(0);
    expect(speedDieSteps(SpeedDieFace.MrMonopoly)).toBe(0);
    expect(speedDieSteps(null)).toBe(0);
  });
});

describe('isTriple', () => {
  it('is true only when all three show the same number', () => {
    expect(isTriple(2, 2, SpeedDieFace.Two)).toBe(true);
    expect(isTriple(3, 3, SpeedDieFace.Three)).toBe(true);
  });

  it('is false when the white dice match but the Speed Die does not', () => {
    expect(isTriple(2, 2, SpeedDieFace.Three)).toBe(false);
    expect(isTriple(2, 2, SpeedDieFace.Bus)).toBe(false);
    expect(isTriple(5, 5, SpeedDieFace.MrMonopoly)).toBe(false);
  });

  it('is false without a Speed Die at all', () => {
    expect(isTriple(4, 4, null)).toBe(false);
  });

  // Only 1, 2 and 3 are on the die, so 4, 5 and 6 can never triple.
  it('is false for a white pair the die cannot match', () => {
    expect(isTriple(6, 6, SpeedDieFace.Three)).toBe(false);
  });
});
