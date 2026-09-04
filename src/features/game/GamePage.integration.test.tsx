import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { indiaEditionTheme } from '../../domain/themes/indiaEditionTheme';
import { PendingDecisionType, TurnPhase } from '../../domain/types/game.enums';
import type { GameState } from '../../domain/types/game.interfaces';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import { saveGame } from '../persistence/persistence';
import { GamePage } from './GamePage';

/**
 * The page as a whole: route -> load -> render -> command -> save.
 *
 * The e2e suite drives the real browser; this covers the same wiring where a
 * failure is cheap to diagnose, and is the only place that asserts the store
 * and localStorage agree after a click.
 */

const seedGame = (overrides: Partial<GameState> = {}): GameState => {
  const game = {
    ...createGameState(
      {
        gameId: 'page-test',
        name: 'Page Test',
        playerConfigs: [
          { name: 'Asha', tokenId: 'elephant' },
          { name: 'Vikram', tokenId: 'train' },
        ],
        themeId: indiaEditionTheme.id,
        createdAt: '2026-09-01T00:00:00.000Z',
      },
      new SeededRandomSource(7)
    ),
    ...overrides,
  };
  saveGame(game);
  return game;
};

const renderPage = (gameId: string) =>
  renderWithProviders(
    <Routes>
      <Route element={<GamePage />} path="/game/:gameId" />
    </Routes>,
    { route: `/game/${gameId}` }
  );

const storedGame = (gameId: string) =>
  JSON.parse(localStorage.getItem(`monopoly.game.${gameId}.v1`) as string);

beforeEach(() => {
  localStorage.clear();
});

describe('loading the game named in the route', () => {
  it('renders the board for a game that exists', async () => {
    const game = seedGame();

    renderPage(game.id);

    expect(await screen.findByTestId(TEST_IDS.boardGrid)).toBeInTheDocument();
  });

  it('shows both players', async () => {
    const game = seedGame();

    renderPage(game.id);

    const panel = await screen.findByTestId(TEST_IDS.playersPanel);
    // The name sits beside its token emoji in one node, so this matches the
    // panel's text rather than looking for a node of exactly "Asha".
    expect(panel).toHaveTextContent('Asha');
    expect(panel).toHaveTextContent('Vikram');
  });

  it('puts the loaded game in the store', async () => {
    const game = seedGame();

    const { store } = renderPage(game.id);

    await waitFor(() => expect(store.getState().game.activeGame?.id).toBe(game.id));
  });

  // A route pointing at nothing must say so rather than render an empty board.
  it('says so when the game is not there', async () => {
    renderPage('no-such-game');

    expect(await screen.findByText(/no saved game found/i)).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_IDS.boardGrid)).not.toBeInTheDocument();
  });
});

describe('taking a turn from the page', () => {
  it('rolls, and the store and the save agree afterwards', async () => {
    const game = seedGame();
    const { store } = renderPage(game.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    fireEvent.click(screen.getByTestId(TEST_IDS.rollButton));

    // The dock tumbles the dice before committing, so the command lands a beat
    // after the click - see DICE_ROLL_DURATION_MS.
    await waitFor(
      () =>
        expect(store.getState().game.activeGame?.turn.phase).not.toBe(
          TurnPhase.AwaitRoll
        ),
      { timeout: 3000 }
    );
    const inStore = store.getState().game.activeGame;
    expect(storedGame(game.id).turn.lastRoll).toEqual(inStore?.turn.lastRoll);
    expect(storedGame(game.id).history.length).toBe(inStore?.history.length);
  });

  /**
   * The doubles complaint. A double leaves the turn in AwaitExtraRollOrEnd the
   * instant the engine resolves, so the button came back live while the token
   * was still walking - and the second roll then restarted the walk from
   * wherever the token had got to, cutting both legs short.
   */
  it('will not offer another roll while the token is still walking', async () => {
    const game = seedGame();
    const { store } = renderPage(game.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    fireEvent.click(screen.getByTestId(TEST_IDS.rollButton));
    await waitFor(
      () =>
        expect(store.getState().game.activeGame?.turn.phase).not.toBe(
          TurnPhase.AwaitRoll
        ),
      { timeout: 3000 }
    );

    // The engine has moved them; the token has not caught up yet.
    expect(screen.getByTestId(TEST_IDS.rollButton)).toBeDisabled();
  });

  it('offers the roll again once the token has landed', async () => {
    const game = seedGame();
    const { store } = renderPage(game.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    fireEvent.click(screen.getByTestId(TEST_IDS.rollButton));
    await waitFor(
      () =>
        expect(store.getState().game.activeGame?.turn.phase).not.toBe(
          TurnPhase.AwaitRoll
        ),
      { timeout: 3000 }
    );

    // Either the walk finishes and the extra roll is offered, or the turn had no
    // extra roll to give - both are settled states, neither is mid-walk.
    await waitFor(
      () => {
        const canRollAgain = store.getState().game.activeGame?.turn.canRollAgain;
        const rollButton = screen.getByTestId(TEST_IDS.rollButton);
        expect(canRollAgain ? !rollButton.hasAttribute('disabled') : true).toBe(true);
      },
      { timeout: 5000 }
    );
  });

  it('shows the roll in the activity feed as a toast', async () => {
    const game = seedGame();
    const { store } = renderPage(game.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    fireEvent.click(screen.getByTestId(TEST_IDS.rollButton));

    await waitFor(() => expect(store.getState().ui.toasts.length).toBeGreaterThan(0), {
      timeout: 3000,
    });
  });

  /**
   * The order the player sees: roll, walk, then what the space did about it.
   *
   * The engine resolves all three in one synchronous step, and the toasts used
   * to go up with it - rent charged for a site the token had not reached yet.
   * They queue instead, and the gate drains the queue when the walk settles.
   */
  it('holds the toast until the token has finished walking', async () => {
    const game = seedGame();
    const { store } = renderPage(game.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    fireEvent.click(screen.getByTestId(TEST_IDS.rollButton));

    // The command has landed and has something to say...
    await waitFor(() =>
      expect(store.getState().ui.pendingFeedback.toasts.length).toBeGreaterThan(0)
    );
    // ...and while the walk is on, none of it is on screen.
    expect(screen.getByTestId(TEST_IDS.gameLayout)).toHaveAttribute(
      'data-moving',
      'true'
    );
    expect(store.getState().ui.toasts).toEqual([]);

    // Then the walk settles and everything arrives at once.
    await waitFor(
      () => {
        expect(screen.getByTestId(TEST_IDS.gameLayout)).toHaveAttribute(
          'data-moving',
          'false'
        );
        expect(store.getState().ui.toasts.length).toBeGreaterThan(0);
        expect(store.getState().ui.pendingFeedback.toasts).toEqual([]);
      },
      { timeout: 5000 }
    );
  });

  // The invariant the fix is for, sampled the whole way through a turn rather
  // than at two chosen moments: no toast is ever on screen mid-walk.
  it('never shows a toast while a token is moving', async () => {
    const game = seedGame();
    const { store } = renderPage(game.id);
    await screen.findByTestId(TEST_IDS.boardGrid);

    const layout = screen.getByTestId(TEST_IDS.gameLayout);
    let violations = 0;
    const sample = () => {
      if (
        layout.getAttribute('data-moving') === 'true' &&
        store.getState().ui.toasts.length > 0
      ) {
        violations += 1;
      }
    };

    fireEvent.click(screen.getByTestId(TEST_IDS.rollButton));

    // Polled by waitFor, which re-runs its callback until it stops throwing -
    // so the sampling happens on every interval of the walk, not just at its
    // ends. It settles on the toasts arriving, which is the walk being over.
    await waitFor(
      () => {
        sample();
        expect(store.getState().ui.toasts.length).toBeGreaterThan(0);
      },
      { interval: 10, timeout: 5000 }
    );

    expect(violations).toBe(0);
  });
});

describe('a pending decision', () => {
  // The decision modal takes over the screen; it is deliberately not
  // dismissible, so the board behind it must not offer a roll.
  it('takes over the screen and withholds the roll', async () => {
    const base = seedGame();
    const street = base.board.find((space) => space.kind === 'street');
    const game = seedGame({
      pendingDecision: {
        type: PendingDecisionType.LandedUnownedProperty,
        playerId: base.playerOrder[0],
        spaceId: street?.id ?? '',
      },
      turn: { ...base.turn, phase: TurnPhase.AwaitDecision },
    });

    renderPage(game.id);

    expect(await screen.findByTestId(TEST_IDS.decisionModal)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.rollButton)).toBeDisabled();
  });

  it('clears once the decision is answered', async () => {
    const base = seedGame();
    const street = base.board.find((space) => space.kind === 'street');
    const game = seedGame({
      pendingDecision: {
        type: PendingDecisionType.LandedUnownedProperty,
        playerId: base.playerOrder[0],
        spaceId: street?.id ?? '',
      },
      turn: { ...base.turn, phase: TurnPhase.AwaitDecision },
    });
    const { store } = renderPage(game.id);
    await screen.findByTestId(TEST_IDS.decisionModal);

    fireEvent.click(screen.getByTestId(TEST_IDS.declineButton));

    // Declining sends it to auction, so a decision is still pending - but a
    // different one, which is what proves the command went through.
    await waitFor(() =>
      expect(store.getState().game.activeGame?.pendingDecision.type).not.toBe(
        PendingDecisionType.LandedUnownedProperty
      )
    );
  });
});
