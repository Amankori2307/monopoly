import { describe, expect, it } from 'vitest';
import { createGameState } from '../../domain/rules/gameEngine';
import { SeededRandomSource } from '../../domain/rules/rng';
import { indiaEditionTheme } from '../../domain/themes/indiaEditionTheme';
import type { GameState } from '../../domain/types/game.interfaces';
import { gameStateSchema } from './schema';

/**
 * The schema used to validate players, the board, ownership, the decks and both
 * in-flight states as `z.any()`. Every case here is corruption it waved through
 * — it passed validation and failed later, in whichever component happened to
 * read it first.
 */

const validGame = (): GameState =>
  createGameState(
    {
      gameId: 'schema-test',
      name: 'Schema Test',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: indiaEditionTheme.id,
      createdAt: '2026-09-01T00:00:00.000Z',
    },
    new SeededRandomSource(3)
  );

/**
 * Corrupts a deep-cloned save, so each case starts from a valid one.
 *
 * The clone is typed loosely on purpose: the whole point is to write shapes the
 * types forbid and check the schema catches them.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any --
   Deliberately loose: these cases write shapes the types forbid, which is
   exactly what the schema has to catch. */
type LooseSave = Record<string, any>;

const corrupt = (mutate: (game: LooseSave) => void) => {
  const game = JSON.parse(JSON.stringify(validGame()));
  mutate(game);
  return gameStateSchema.safeParse(game);
};

describe('a game the engine just made', () => {
  it('validates', () => {
    expect(
      gameStateSchema.safeParse(JSON.parse(JSON.stringify(validGame()))).success
    ).toBe(true);
  });
});

describe('players', () => {
  it('refuses a player missing their cash', () => {
    const result = corrupt((game) => {
      delete game.players[game.playerOrder[0]].cash;
    });

    expect(result.success).toBe(false);
  });

  it('refuses cash that is not a number', () => {
    expect(
      corrupt((game) => {
        game.players[game.playerOrder[0]].cash = '1500';
      }).success
    ).toBe(false);
  });

  it('refuses a negative board position', () => {
    expect(
      corrupt((game) => {
        game.players[game.playerOrder[0]].position = -1;
      }).success
    ).toBe(false);
  });

  // The old count-shaped field is exactly what the v1 migration exists to
  // convert; a save still carrying it has not been migrated.
  it('refuses jail cards as a bare count', () => {
    expect(
      corrupt((game) => {
        game.players[game.playerOrder[0]].jailFreeCards = 2;
      }).success
    ).toBe(false);
  });

  it('refuses a jail card with no deck on it', () => {
    expect(
      corrupt((game) => {
        game.players[game.playerOrder[0]].jailFreeCards = [{ id: 'x', title: 'x' }];
      }).success
    ).toBe(false);
  });

  it('refuses a player order naming somebody who is not there', () => {
    expect(
      corrupt((game) => {
        game.playerOrder.push('ghost');
      }).success
    ).toBe(false);
  });

  it('refuses an active index past the end of the order', () => {
    expect(
      corrupt((game) => {
        game.activePlayerIndex = 9;
      }).success
    ).toBe(false);
  });

  it('refuses a one-player game', () => {
    expect(
      corrupt((game) => {
        game.playerOrder = [game.playerOrder[0]];
      }).success
    ).toBe(false);
  });
});

describe('the board', () => {
  it('refuses a board that is not 40 spaces', () => {
    expect(
      corrupt((game) => {
        game.board = game.board.slice(0, 39);
      }).success
    ).toBe(false);
  });

  // The engine reads space.rents on a street without checking, so a street with
  // no rent table is a crash waiting for somebody to land on it.
  it('refuses a street with no rent table', () => {
    expect(
      corrupt((game) => {
        const street = game.board.find(
          (space: { kind: string }) => space.kind === 'street'
        );
        delete street.rents;
      }).success
    ).toBe(false);
  });

  it('refuses a rent table missing a tier', () => {
    expect(
      corrupt((game) => {
        const street = game.board.find(
          (space: { kind: string }) => space.kind === 'street'
        );
        delete street.rents.withHotel;
      }).success
    ).toBe(false);
  });

  it('refuses a space of an unknown kind', () => {
    expect(
      corrupt((game) => {
        game.board[5].kind = 'casino';
      }).success
    ).toBe(false);
  });

  it('refuses a street in a colour group that does not exist', () => {
    expect(
      corrupt((game) => {
        const street = game.board.find(
          (space: { kind: string }) => space.kind === 'street'
        );
        street.colorGroup = 'chartreuse';
      }).success
    ).toBe(false);
  });

  it('refuses a railway whose rent tiers are the wrong length', () => {
    expect(
      corrupt((game) => {
        const railway = game.board.find(
          (space: { kind: string }) => space.kind === 'railway'
        );
        railway.rentByCount = [25, 50];
      }).success
    ).toBe(false);
  });

  it('refuses a tax square with no amount', () => {
    expect(
      corrupt((game) => {
        const tax = game.board.find((space: { kind: string }) => space.kind === 'tax');
        delete tax.amount;
      }).success
    ).toBe(false);
  });
});

describe('ownership', () => {
  it('refuses a build level beyond a hotel', () => {
    expect(
      corrupt((game) => {
        game.ownership[game.board[1].id].buildLevel = 6;
      }).success
    ).toBe(false);
  });

  it('refuses a missing mortgaged flag', () => {
    expect(
      corrupt((game) => {
        delete game.ownership[game.board[1].id].mortgaged;
      }).success
    ).toBe(false);
  });
});

describe('the decks', () => {
  it('refuses a card with an unknown effect', () => {
    expect(
      corrupt((game) => {
        game.decks.chance[0].effect = { kind: 'teleport' };
      }).success
    ).toBe(false);
  });

  it('refuses a pay card with no amount', () => {
    expect(
      corrupt((game) => {
        game.decks.chance[0].effect = { kind: 'pay' };
      }).success
    ).toBe(false);
  });
});

describe('in-flight state', () => {
  it('refuses an auction with no bidder order', () => {
    expect(
      corrupt((game) => {
        game.auctionState = { id: 'a', spaceId: 'x', startPrice: 10 };
      }).success
    ).toBe(false);
  });

  it('accepts a building auction, which carries a building kind', () => {
    const result = corrupt((game) => {
      game.auctionState = {
        id: 'a',
        spaceId: game.board[1].id,
        buildingKind: 'house',
        startPrice: 50,
        minIncrement: 1,
        activeBidderOrder: game.playerOrder,
        activeBidderIndex: 0,
        highestBid: 0,
        highestBidderId: null,
        passedPlayerIds: [],
        ledger: [{ kind: 'start', playerId: null, amount: 50 }],
      };
    });

    expect(result.success).toBe(true);
  });

  it('refuses an auction with no ledger', () => {
    expect(
      corrupt((game) => {
        game.auctionState = {
          id: 'a',
          spaceId: game.board[1].id,
          startPrice: 10,
          minIncrement: 1,
          activeBidderOrder: game.playerOrder,
          activeBidderIndex: 0,
          highestBid: 0,
          highestBidderId: null,
          passedPlayerIds: [],
        };
      }).success
    ).toBe(false);
  });

  it('refuses a ledger line with an unknown kind', () => {
    expect(
      corrupt((game) => {
        game.auctionState = {
          id: 'a',
          spaceId: game.board[1].id,
          startPrice: 10,
          minIncrement: 1,
          activeBidderOrder: game.playerOrder,
          activeBidderIndex: 0,
          highestBid: 0,
          highestBidderId: null,
          passedPlayerIds: [],
          ledger: [{ kind: 'shouted', playerId: null, amount: 10 }],
        };
      }).success
    ).toBe(false);
  });

  it('refuses a trade missing one side', () => {
    expect(
      corrupt((game) => {
        game.tradeState = { proposerPlayerId: game.playerOrder[0] };
      }).success
    ).toBe(false);
  });
});

describe('the pending decision, which stays loose on purpose', () => {
  // .passthrough() is what lets a decision carry its own payload through a
  // round trip - the drawn card, a liquidation's queued debts.
  it('keeps a payload the schema does not describe', () => {
    const result = corrupt((game) => {
      game.pendingDecision = {
        type: 'asset-liquidation',
        playerId: game.playerOrder[0],
        amountDue: 100,
        creditorPlayerId: null,
        reason: 'rent',
        queued: [{ playerId: game.playerOrder[1], amountDue: 50 }],
      };
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    const decision = result.data.pendingDecision as unknown as {
      queued: unknown[];
    };
    expect(decision.queued).toHaveLength(1);
  });

  it('still refuses a card draw with no card', () => {
    expect(
      corrupt((game) => {
        game.pendingDecision = { type: 'card-draw', playerId: 'p', deck: 'chance' };
      }).success
    ).toBe(false);
  });

  it('refuses a liquidation with no amount owed', () => {
    expect(
      corrupt((game) => {
        game.pendingDecision = { type: 'asset-liquidation', playerId: 'p' };
      }).success
    ).toBe(false);
  });

  it('refuses a decision type the game does not have', () => {
    expect(
      corrupt((game) => {
        game.pendingDecision = { type: 'summon-banker' };
      }).success
    ).toBe(false);
  });
});
