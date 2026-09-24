import { StrictMode } from 'react';
import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { indiaTheme as indiaEditionTheme } from '../../domain/themes/india.theme';
import { TableMode, TurnPhase } from '../../domain/types/game.enums';
import type { GameState } from '../../domain/types/game.interfaces';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import { saveGame } from '../persistence/persistence';
import { BOT_MOVE_DELAY_MS } from './game.constants';
import { GamePage } from './GamePage';

/**
 * A bot's turn, through the page it is played on.
 *
 * The policy is unit-tested in `domain/ai` with no store at all; what this
 * covers is the half that cannot be pure - that the page asks, that the answer
 * goes through `runGameCommand` like a click does, and so reaches
 * `localStorage` the same way. A bot whose moves were not saved would be a
 * game that rewound on every refresh.
 */

const seedGame = (bots: boolean[], overrides: Partial<GameState> = {}): GameState => {
  const game: GameState = {
    ...createGameState(
      {
        gameId: `bots-${bots.join('')}-${overrides.tableMode ?? 'hot'}`,
        name: 'Bot game',
        playerConfigs: bots.map((isBot, index) => ({
          name: isBot ? `Bot ${index + 1}` : `Player ${index + 1}`,
          isBot,
        })),
        themeId: indiaEditionTheme.id,
        createdAt: '2026-09-24T00:00:00.000Z',
      },
      new SeededRandomSource(7)
    ),
    ...overrides,
  };
  saveGame(game);
  return game;
};

/** Puts the named player at the top of their own turn. */
const withActive = (game: GameState, playerId: string): GameState => ({
  ...game,
  activePlayerIndex: game.playerOrder.indexOf(playerId),
  turn: { ...game.turn, phase: TurnPhase.AwaitRoll },
});

const storedGame = (gameId: string): GameState =>
  JSON.parse(localStorage.getItem(`monopoly.game.${gameId}.v1`) as string);

const renderPage = (gameId: string) =>
  renderWithProviders(
    <Routes>
      <Route element={<GamePage />} path="/game/:gameId" />
    </Routes>,
    { route: `/game/${gameId}` }
  );

/**
 * The same page under StrictMode, which double-invokes every effect on mount:
 * setup, cleanup, setup. The app runs inside one (`src/index.tsx`) and
 * `renderWithProviders` does not, so this is the only place that difference is
 * visible - and it is a difference that produced a total deadlock, not a
 * warning.
 */
const renderPageStrictly = (gameId: string) =>
  renderWithProviders(
    <StrictMode>
      <Routes>
        <Route element={<GamePage />} path="/game/:gameId" />
      </Routes>
    </StrictMode>,
    { route: `/game/${gameId}` }
  );

/**
 * Long enough that a bot would certainly have moved, and derived rather than
 * guessed: a literal here would quietly stop proving anything the moment the
 * delay was tuned.
 */
const LONGER_THAN_A_BOT_WAITS = BOT_MOVE_DELAY_MS * 2;

const settle = () =>
  new Promise((resolve) => setTimeout(resolve, LONGER_THAN_A_BOT_WAITS));

beforeEach(() => {
  localStorage.clear();
});

describe('a bot at the table', () => {
  /**
   * Asserted against `localStorage` rather than the store, and that is the
   * point of testing this here at all: a bot's move goes through
   * `runGameCommand`, the same thunk a click goes through, so it is saved the
   * same way. A second dispatch path for bots would be a game that plays
   * correctly and remembers nothing - and the symptom is a refresh that rewinds
   * to whenever a person last moved.
   */
  it('plays and saves its own turn without anybody clicking', async () => {
    const game = seedGame([true, false]);
    const botId = game.playerOrder.find((id) => game.players[id].isBot) as string;
    const started = withActive(game, botId);
    saveGame(started);

    renderPage(started.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    // The turn number is the honest witness: it moves only when a turn actually
    // ends, so this says the bot played a whole turn rather than merely
    // dispatched something.
    await waitFor(
      () => {
        const stored = storedGame(started.id);
        expect(stored.turnNumber).toBeGreaterThan(started.turnNumber);
        expect(stored.history.length).toBeGreaterThan(0);
      },
      { timeout: 15000 }
    );
    // A WHOLE turn, which is several bot delays and a token walk end to end -
    // well past vitest's 5s default, and the walk is real time rather than
    // something fake timers can skip.
  }, 20000);

  /**
   * The single most important thing this hook does NOT do. A driver that moved
   * on a person's turn would take the game off them, and the only evidence
   * would be a board that moved while they were reading it.
   */
  it('leaves a human turn completely alone', async () => {
    const game = seedGame([true, false]);
    const humanId = game.playerOrder.find((id) => !game.players[id].isBot) as string;
    const started = withActive(game, humanId);
    saveGame(started);

    renderPage(started.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    await settle();
    expect(storedGame(started.id).turnNumber).toBe(started.turnNumber);
    expect(storedGame(started.id).history).toHaveLength(started.history.length);
  });

  /**
   * A bot has no device, so on an online table there is no answer to "which
   * client sends its commands" that does not make one of them an authority over
   * the running game - which docs/features/multiplayer.md records as a decision
   * not to take. The lobby cannot create a bot; this is the belt to that brace,
   * and it matters because the failure without it is EVERY device driving the
   * same bot and all but one of them losing a conflict.
   */
  it('does not drive a bot that turns up at an online table', async () => {
    const game = seedGame([true, false], { tableMode: TableMode.Online });
    const botId = game.playerOrder.find((id) => game.players[id].isBot) as string;
    const started = withActive(game, botId);
    saveGame(started);

    renderPage(started.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    await settle();
    expect(storedGame(started.id).turnNumber).toBe(started.turnNumber);
  });

  /**
   * The bug this test exists for, and the worst one in the feature: a bot that
   * is active on the FIRST render never moved at all.
   *
   * StrictMode doubles the mount, so the effect ran, cancelled its own pending
   * timer, and ran again - and the guard, which marked the move as sent when it
   * was merely SCHEDULED, made the second run bail. Nothing was ever dispatched.
   *
   * It needed all three of: StrictMode (the app has it, the test harness does
   * not), a bot active at mount (which is just "the bot won the opening roll"),
   * and the guard marking too early. Every other test here passed throughout,
   * and so did the e2e journey - which plays a human turn first, so by the time
   * the bot's turn came the deps had changed and StrictMode was long done.
   *
   * What a player saw: start a solo game, lose the opening roll, and the game
   * is frozen on the first screen with no way to do anything about it.
   */
  it('plays a bot that is already active on the very first render', async () => {
    const game = seedGame([true, false]);
    const botId = game.playerOrder.find((id) => game.players[id].isBot) as string;
    const started = withActive(game, botId);
    saveGame(started);

    renderPageStrictly(started.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    await waitFor(
      () => expect(storedGame(started.id).history.length).toBeGreaterThan(0),
      { timeout: 10000 }
    );
  });
});
