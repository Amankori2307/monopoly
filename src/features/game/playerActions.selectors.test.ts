import { describe, expect, it } from 'vitest';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { PendingDecisionType } from '../../domain/types/game.enums';
import type { GameState } from '../../domain/types/game.interfaces';
import { HOT_SEAT_VIEWER, SPECTATOR } from '../multiplayer/viewer.utils';
import { selectActionRail } from './playerActions.selectors';

const createGame = (): GameState =>
  createGameState(
    {
      name: 'Rail Test',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(11)
  );

const rowFor =
  (game: GameState, viewer = HOT_SEAT_VIEWER) =>
  (label: string) =>
    selectActionRail(game, viewer).find((row) => row.label === label)!;

describe('selectActionRail', () => {
  it('offers five buttons, the fifth of which is not a property action', () => {
    const game = createGame();

    const rows = selectActionRail(game, HOT_SEAT_VIEWER);
    expect(rows.map((row) => row.label)).toEqual([
      'Build',
      'Sell',
      'Mortgage',
      'Redeem',
      'Trade',
    ]);
    expect(rows[4].action).toBeNull();
  });

  /**
   * The rail asks the same question the site panel does, of the same actor -
   * the ASSET HOLDER. During a liquidation the debtor raises the cash, and a
   * collect-from-each card can bill somebody whose turn it is not.
   */
  it('offers the debtor holdings during a liquidation, not the active player', () => {
    const game = createGame();
    const [active, debtor] = game.playerOrder;
    const street = game.board.find((space) => space.kind === 'street')!;
    game.ownership[street.id].ownerPlayerId = debtor;
    game.pendingDecision = {
      type: PendingDecisionType.AssetLiquidation,
      playerId: debtor,
      amountDue: 100,
      creditorPlayerId: active,
      reason: 'rent',
      queued: [],
    };

    const mortgage = rowFor(game)('Mortgage');
    expect(mortgage.isEnabled).toBe(true);
    expect(mortgage.sites.map((site) => site.spaceId)).toEqual([street.id]);
  });

  it('names whoever must act when this device cannot', () => {
    const game = createGame();
    const street = game.board.find((space) => space.kind === 'street')!;
    game.ownership[street.id].ownerPlayerId = game.playerOrder[0];

    const rows = selectActionRail(game, SPECTATOR);
    rows.forEach((row) => {
      expect(row.isEnabled).toBe(false);
      // A name for anybody who is not the reader, and no terminal stop.
      expect(row.disabledReason).toBe(
        `It is ${game.players[game.playerOrder[0]].name}'s move`
      );
    });
  });

  it('names the object in the edition own word, out of the pixels', () => {
    const game = createGame();

    expect(rowFor(game)('Build').accessibleName).toBe('Build on a city');
    expect(rowFor(game)('Mortgage').accessibleName).toBe('Mortgage a city');
    expect(rowFor(game)('Build').label).toBe('Build');
  });

  describe('Trade', () => {
    it('is live on the existence of an opponent, not on owning anything', () => {
      const game = createGame();

      const trade = rowFor(game)('Trade');
      expect(trade.isEnabled).toBe(true);
      // The holder owns nothing at all, and can still ask for something.
      expect(rowFor(game)('Mortgage').isEnabled).toBe(false);
      expect(trade.opponents).toHaveLength(1);
    });

    it('leaves out a bankrupt opponent, and says so when none are left', () => {
      const game = createGame();
      game.players[game.playerOrder[1]].isBankrupt = true;

      const trade = rowFor(game)('Trade');
      expect(trade.opponents).toEqual([]);
      expect(trade.isEnabled).toBe(false);
      expect(trade.disabledReason).toBe('Nobody is left to trade with');
    });
  });
});
