import { screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { PendingDecisionType, TableMode, TurnPhase } from '../../domain/types/game.enums';
import type { GameState } from '../../domain/types/game.interfaces';
import { TEST_IDS } from '../../shared/constants/testIds.constants';
import { renderWithProviders } from '../../test/renderWithProviders';
import { seatInitialState } from '../multiplayer/seatSlice';
import { saveGame } from '../persistence/persistence';
import { GamePage } from './GamePage';

/**
 * The same game rendered twice, from two seats. No transport is involved -
 * which is the point: seat gating is a rendering concern, and testing it
 * through a socket would only be testing the socket.
 */

const onlineGameAwaitingABuy = (): GameState => {
  const game = createGameState(
    {
      name: 'Two Seats',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-09-01T00:00:00.000Z',
      tableMode: TableMode.Online,
    },
    new SeededRandomSource(7)
  );
  const buyer = game.playerOrder[game.activePlayerIndex];
  const street = game.board.find((space) => 'price' in space) as { id: string };

  return {
    ...game,
    pendingDecision: {
      type: PendingDecisionType.LandedUnownedProperty,
      spaceId: street.id,
      playerId: buyer,
    },
    turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
  };
};

/**
 * The page loads the game named in the route, so the save is the fixture. Only
 * the seat comes from preloaded state - it is the one fact that is per-device.
 */
const renderAsSeat = (game: GameState, seatId: string | null) => {
  saveGame(game);
  return renderWithProviders(
    <Routes>
      <Route element={<GamePage />} path="/game/:gameId" />
    </Routes>,
    {
      route: `/game/${game.id}`,
      preloadedState: { seat: { ...seatInitialState, seatId } },
    }
  );
};

describe('one game, two seats', () => {
  it('gives the decision to the player whose decision it is', async () => {
    const game = onlineGameAwaitingABuy();
    const buyer = game.playerOrder[game.activePlayerIndex];

    renderAsSeat(game, buyer);

    await waitFor(() =>
      expect(screen.getByTestId(TEST_IDS.decisionModal)).toBeInTheDocument()
    );
    expect(screen.queryByTestId(TEST_IDS.decisionSpectator)).not.toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.buyButton)).toBeEnabled();
  });

  it('shows everyone else the same decision, inert', async () => {
    const game = onlineGameAwaitingABuy();
    const other = game.playerOrder.find(
      (id) => id !== game.playerOrder[game.activePlayerIndex]
    ) as string;

    renderAsSeat(game, other);
    await screen.findByTestId(TEST_IDS.decisionSpectator);

    // They can see what is happening - a blank screen while somebody else
    // decides is worse than a read-only copy.
    const spectator = screen.getByTestId(TEST_IDS.decisionSpectator);
    expect(spectator).toBeInTheDocument();
    expect(screen.queryByTestId(TEST_IDS.decisionModal)).not.toBeInTheDocument();

    // The headline assertion: nothing in there is clickable. The fieldset does
    // it at the platform level, so a new decision panel cannot forget.
    const buttons = within(spectator).queryAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    buttons.forEach((button) => expect(button).toBeDisabled());
  });

  it('does not let the wrong seat roll', async () => {
    const game = createGameState(
      {
        name: 'Two Seats',
        playerConfigs: [
          { name: 'Asha', tokenId: 'elephant' },
          { name: 'Vikram', tokenId: 'train' },
        ],
        themeId: 'india-edition',
        createdAt: '2026-09-01T00:00:00.000Z',
        tableMode: TableMode.Online,
      },
      new SeededRandomSource(7)
    );
    const other = game.playerOrder.find(
      (id) => id !== game.playerOrder[game.activePlayerIndex]
    ) as string;

    renderAsSeat(game, other);

    expect(await screen.findByTestId(TEST_IDS.rollButton)).toBeDisabled();
  });

  it('lets the seat whose turn it is roll', async () => {
    const game = createGameState(
      {
        name: 'Two Seats',
        playerConfigs: [
          { name: 'Asha', tokenId: 'elephant' },
          { name: 'Vikram', tokenId: 'train' },
        ],
        themeId: 'india-edition',
        createdAt: '2026-09-01T00:00:00.000Z',
        tableMode: TableMode.Online,
      },
      new SeededRandomSource(7)
    );

    renderAsSeat(game, game.playerOrder[game.activePlayerIndex]);

    expect(await screen.findByTestId(TEST_IDS.rollButton)).toBeEnabled();
  });

  it('shows a spectator with no seat the board, and no controls', async () => {
    const game = onlineGameAwaitingABuy();

    renderAsSeat(game, null);

    expect(await screen.findByTestId(TEST_IDS.boardGrid)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.decisionSpectator)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_IDS.rollButton)).toBeDisabled();
  });
});
