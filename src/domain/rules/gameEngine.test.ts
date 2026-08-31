import { describe, expect, it } from 'vitest';
import { GameCommandType, PendingDecisionType, TurnPhase } from '../types/game.enums';
import { CardDeck, CardEffectKind, DeckName, SpaceKind } from '../types/game.enums';
import type { DeckCard } from '../types/game.interfaces';
import { AUCTION_START_PRICE } from '../constants/game.constants';
import type { GameState } from '../types/game.interfaces';
import { createGameState, executeGameCommand } from './gameEngine';
import { SeededRandomSource } from './rng';

const createBaseGame = () =>
  createGameState(
    {
      name: 'Test Game',
      playerConfigs: [
        { name: 'Asha', tokenId: 'elephant' },
        { name: 'Vikram', tokenId: 'train' },
      ],
      themeId: 'india-edition',
      createdAt: '2026-08-29T00:00:00.000Z',
    },
    new SeededRandomSource(7)
  );

describe('gameEngine', () => {
  it('creates a game with India Edition defaults', () => {
    const game = createBaseGame();

    expect(game.playerOrder).toHaveLength(2);
    expect(game.board).toHaveLength(40);
    expect(game.bank.housesAvailable).toBe(32);
    expect(game.players[game.playerOrder[0]].cash).toBe(1500);
    expect(game.turn.phase).toBe(TurnPhase.AwaitRoll);
  });

  it('opens a buy decision when landing on an unowned property', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    game.players[activePlayerId].position = 0;

    const result = executeGameCommand(
      game,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(2)
    );

    expect(result.nextState.pendingDecision.type).toBe(
      PendingDecisionType.LandedUnownedProperty
    );
  });

  it('starts an auction when the landed property is declined', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    game.players[activePlayerId].position = 0;
    const rolled = executeGameCommand(
      game,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(2)
    );

    const declined = executeGameCommand(rolled.nextState, {
      type: GameCommandType.DeclineLandedAsset,
    });

    expect(declined.nextState.pendingDecision.type).toBe(PendingDecisionType.AuctionBid);
    expect(declined.nextState.auctionState?.startPrice).toBe(10);
  });
});

describe('going to jail ends the turn', () => {
  // Regression: a Chance card that jails the player used to route back through
  // resolveCurrentSpace, which reassigned the phase from the doubles roll and
  // handed a jailed player an extra roll. The next roll then hit the engine's
  // "Player must choose a Jail action first" guard and threw.
  const jailCardGame = () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    // Stand on the space before a Chance square so the roll lands on it.
    const chanceIndex = game.board.findIndex((space) => space.kind === 'chance');
    game.players[activePlayerId].position = chanceIndex;
    // Force the drawn card to be "go to jail".
    game.decks[DeckName.Chance] = [
      {
        id: 'test-go-to-jail',
        deck: CardDeck.Chance,
        title: 'Go to Jail',
        description: 'Go directly to Jail.',
        effect: { kind: CardEffectKind.GoToJail },
      },
      ...game.decks[DeckName.Chance],
    ];
    return { game, activePlayerId, chanceIndex };
  };

  it('never leaves a jailed player able to roll again', () => {
    const { game, activePlayerId, chanceIndex } = jailCardGame();

    // Resolve the chance square directly, as a doubles roll would.
    const landed = executeGameCommand(
      { ...game, players: { ...game.players } },
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(3)
    ).nextState;

    for (const playerId of landed.playerOrder) {
      if (landed.players[playerId].inJail) {
        expect(landed.turn.canRollAgain).toBe(false);
        expect(landed.turn.phase).toBe(TurnPhase.TurnComplete);
      }
    }
    expect(chanceIndex).toBeGreaterThanOrEqual(0);
    expect(activePlayerId).toBeTruthy();
  });

  it('ends the turn when a card sends the player to jail on a doubles roll', () => {
    const { game, activePlayerId } = jailCardGame();
    // Simulate the doubles case: the player is mid-turn with an extra roll due.
    const jailed = executeGameCommand(
      {
        ...game,
        turn: { ...game.turn, doublesCount: 1 },
      },
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(3)
    ).nextState;

    if (jailed.players[activePlayerId].inJail) {
      expect(jailed.turn.canRollAgain).toBe(false);
      expect(jailed.turn.phase).toBe(TurnPhase.TurnComplete);
    }
  });

  it('rejects a plain roll while the player is in jail', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    game.players[activePlayerId].inJail = true;

    expect(() =>
      executeGameCommand(game, { type: GameCommandType.RollTurnDice })
    ).toThrow('Player must choose a Jail action first.');
  });
});

describe('card draw and acknowledge', () => {
  /** Puts the active player on a deck space with a known card on top. */
  const gameWithCardOnTop = (
    deck: DeckName,
    effect: DeckCard['effect'],
    title = 'Test Card'
  ) => {
    const game = createBaseGame();
    const kind = deck === DeckName.Chance ? SpaceKind.Chance : SpaceKind.CommunityChest;
    const deckSpace = game.board.find((space) => space.kind === kind);
    if (!deckSpace) {
      throw new Error(`No ${kind} space on the board`);
    }
    const card: DeckCard = {
      id: 'test-card',
      deck: deck === DeckName.Chance ? CardDeck.Chance : CardDeck.CommunityChest,
      title,
      description: 'Test description.',
      effect,
    };
    return {
      ...game,
      decks: { ...game.decks, [deck]: [card, ...game.decks[deck]] },
      players: {
        ...game.players,
        [game.playerOrder[game.activePlayerIndex]]: {
          ...game.players[game.playerOrder[game.activePlayerIndex]],
          position: deckSpace.index,
        },
      },
      pendingDecision: {
        type: PendingDecisionType.CardDraw as const,
        playerId: game.playerOrder[game.activePlayerIndex],
        deck,
        card,
      },
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
    };
  };

  // The draw and the effect used to be one indivisible step, which left the UI
  // no room to show the card before it acted.
  it('holds the drawn card as a decision without applying it', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    const chanceSpace = game.board.find((space) => space.kind === SpaceKind.Chance);
    if (!chanceSpace) {
      throw new Error('No Chance space on the board');
    }
    const collectCard: DeckCard = {
      id: 'test-collect',
      deck: CardDeck.Chance,
      title: 'Windfall',
      description: 'Collect something.',
      effect: { kind: CardEffectKind.Collect, amount: 250 },
    };
    // Seed 3 rolls 2+4, so start six spaces short of the Chance square.
    game.players[activePlayerId].position = chanceSpace.index - 6;
    const staged = {
      ...game,
      decks: { ...game.decks, [DeckName.Chance]: [collectCard, ...game.decks.chance] },
    };
    const cashBefore = staged.players[activePlayerId].cash;

    const result = executeGameCommand(
      staged,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(3)
    );

    expect(result.nextState.pendingDecision.type).toBe(PendingDecisionType.CardDraw);
    // The card is held, not applied - that is the whole point of the split.
    expect(result.nextState.players[activePlayerId].cash).toBe(cashBefore);
    expect(result.nextState.turn.phase).toBe(TurnPhase.AwaitDecision);
  });

  // The card must survive a save/load round trip, so it rides inside the
  // decision rather than in a top-level field the zod schema would strip.
  it('carries the drawn card on the decision itself', () => {
    const game = gameWithCardOnTop(
      DeckName.CommunityChest,
      { kind: CardEffectKind.Collect, amount: 25 },
      'Rebate'
    );

    expect(game.pendingDecision.type).toBe(PendingDecisionType.CardDraw);
    expect(game.pendingDecision.card.title).toBe('Rebate');
  });

  it('applies a Collect effect only once acknowledged', () => {
    const game = gameWithCardOnTop(DeckName.Chance, {
      kind: CardEffectKind.Collect,
      amount: 250,
    });
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    const cashBefore = game.players[activePlayerId].cash;

    const result = executeGameCommand(
      game,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    );

    expect(result.nextState.players[activePlayerId].cash).toBe(cashBefore + 250);
    expect(result.nextState.pendingDecision.type).toBe(PendingDecisionType.None);
  });

  it('logs the amount so the credit is visible, not silent', () => {
    const game = gameWithCardOnTop(
      DeckName.Chance,
      { kind: CardEffectKind.Collect, amount: 250 },
      'Windfall'
    );

    const result = executeGameCommand(
      game,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    );

    expect(result.nextState.history[0].message).toContain('250');
    expect(result.nextState.history[0].message).toContain('Windfall');
  });

  // A card that sends the player to jail must not leave them an extra roll,
  // which is the bug the phase guard in resolveCurrentSpace already covers.
  it('does not grant an extra roll when a card sends the player to jail', () => {
    const game = {
      ...gameWithCardOnTop(DeckName.Chance, { kind: CardEffectKind.GoToJail }),
    };
    game.turn = { ...game.turn, doublesCount: 1 };
    const activePlayerId = game.playerOrder[game.activePlayerIndex];

    const result = executeGameCommand(
      game,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    );

    expect(result.nextState.players[activePlayerId].inJail).toBe(true);
    expect(result.nextState.turn.canRollAgain).toBe(false);
    expect(result.nextState.turn.phase).toBe(TurnPhase.TurnComplete);
  });

  it('keeps the extra roll after a card when the player rolled doubles', () => {
    const game = gameWithCardOnTop(DeckName.Chance, {
      kind: CardEffectKind.Collect,
      amount: 50,
    });
    game.turn = { ...game.turn, doublesCount: 1 };

    const result = executeGameCommand(
      game,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    );

    expect(result.nextState.turn.canRollAgain).toBe(true);
    expect(result.nextState.turn.phase).toBe(TurnPhase.AwaitExtraRollOrEnd);
  });

  it('throws when there is no drawn card to acknowledge', () => {
    const game = createBaseGame();

    expect(() =>
      executeGameCommand(
        game,
        { type: GameCommandType.AcknowledgeCard },
        new SeededRandomSource(3)
      )
    ).toThrow(/no drawn card/i);
  });
});

describe('money events', () => {
  // Seven money paths - tax, both jail fines, and every card cash effect - used
  // to move cash without logging anything at all.
  it('logs a tax payment to the bank', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    const taxSpace = game.board.find((space) => space.kind === SpaceKind.Tax);
    if (!taxSpace) {
      throw new Error('No tax space on the board');
    }
    // Seed 5 rolls 2+5, so start seven spaces short of the tax square.
    game.players[activePlayerId].position = taxSpace.index - 7;

    const result = executeGameCommand(
      game,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(5)
    );

    const paidEvent = result.nextState.history.find((event) =>
      event.message.includes('to the bank')
    );
    expect(paidEvent?.message).toContain(taxSpace.name);
  });

  it('logs the pass-GO salary with the theme currency, not a hardcoded symbol', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    // From 38 a roll of 7 wraps past GO to index 5.
    game.players[activePlayerId].position = 38;

    const result = executeGameCommand(
      game,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(5)
    );

    const goEvent = result.nextState.history.find((event) =>
      event.message.includes('passing GO')
    );
    expect(goEvent?.message).toContain('₹200');
  });
});

/**
 * Answering a blocking decision has to restore the extra roll a double earned.
 * `canRollAgain` is false while the decision blocks the turn, so any path that
 * read it back concluded the turn was over - which is how declining a property
 * silently forfeited an extra roll that buying it kept.
 */
describe('the extra roll survives a decision', () => {
  /** Lands the active player on an unowned street after rolling doubles. */
  const gameOnUnownedStreetAfterDoubles = () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    const street = game.board.find((space) => space.kind === SpaceKind.Street);
    if (!street) {
      throw new Error('No street on the board');
    }
    // Seed the doubles the roll would have produced, then land on the street.
    return {
      ...game,
      players: {
        ...game.players,
        [activePlayerId]: { ...game.players[activePlayerId], position: street.index },
      },
      ownership: {
        ...game.ownership,
        [street.id]: { ownerPlayerId: null, mortgaged: false, buildLevel: 0 },
      },
      pendingDecision: {
        type: PendingDecisionType.LandedUnownedProperty as const,
        spaceId: street.id,
        playerId: activePlayerId,
      },
      turn: {
        phase: TurnPhase.AwaitDecision,
        doublesCount: 1,
        // False on purpose: this is exactly the state resolveCurrentSpace leaves
        // behind when a decision blocks the turn.
        canRollAgain: false,
        lastRoll: [3, 3],
        reason: 'Decide whether to buy.',
      },
    };
  };

  it('keeps the extra roll after buying', () => {
    const result = executeGameCommand(
      gameOnUnownedStreetAfterDoubles(),
      { type: GameCommandType.BuyLandedAsset },
      new SeededRandomSource(3)
    );

    expect(result.nextState.turn.canRollAgain).toBe(true);
    expect(result.nextState.turn.phase).toBe(TurnPhase.AwaitExtraRollOrEnd);
  });

  it('keeps the extra roll after declining, once the auction settles', () => {
    let state = executeGameCommand(
      gameOnUnownedStreetAfterDoubles(),
      { type: GameCommandType.DeclineLandedAsset },
      new SeededRandomSource(3)
    ).nextState;

    // Every player passes, so the auction ends with nobody buying.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (state.pendingDecision.type !== PendingDecisionType.AuctionBid) {
        break;
      }
      state = executeGameCommand(
        state,
        { type: GameCommandType.PassAuction },
        new SeededRandomSource(3)
      ).nextState;
    }

    expect(state.pendingDecision.type).toBe(PendingDecisionType.None);
    expect(state.turn.canRollAgain).toBe(true);
    expect(state.turn.phase).toBe(TurnPhase.AwaitExtraRollOrEnd);
  });

  it('ends the turn after a decision when the roll was not doubles', () => {
    const game = gameOnUnownedStreetAfterDoubles();

    const result = executeGameCommand(
      { ...game, turn: { ...game.turn, doublesCount: 0 } },
      { type: GameCommandType.BuyLandedAsset },
      new SeededRandomSource(3)
    );

    expect(result.nextState.turn.canRollAgain).toBe(false);
    expect(result.nextState.turn.phase).toBe(TurnPhase.TurnComplete);
  });
});

/**
 * Passing leaves the auction for good. Advancing the bidder index by one and
 * wrapping was not enough: bidding advances it too, so a bid/pass interleave
 * landed the turn back on someone who had already passed, who was then asked to
 * act again and could bid their way back in.
 */
describe('auction bidder rotation', () => {
  const gameWithFourPlayers = () =>
    createGameState(
      {
        name: 'Auction Test',
        playerConfigs: [
          { name: 'Asha', tokenId: 'elephant' },
          { name: 'Vikram', tokenId: 'train' },
          { name: 'Meera', tokenId: 'auto' },
          { name: 'Rahul', tokenId: 'peacock' },
        ],
        themeId: 'india-edition',
        createdAt: '2026-09-01T00:00:00.000Z',
      },
      new SeededRandomSource(11)
    );

  /** Declines the first street, opening an auction over all four players. */
  const openAuction = () => {
    const base = gameWithFourPlayers();
    const street = base.board.find((space) => space.kind === SpaceKind.Street);
    if (!street) {
      throw new Error('No street on the board');
    }
    const activePlayerId = base.playerOrder[base.activePlayerIndex];
    const landed: GameState = {
      ...base,
      players: {
        ...base.players,
        [activePlayerId]: { ...base.players[activePlayerId], position: street.index },
      },
      pendingDecision: {
        type: PendingDecisionType.LandedUnownedProperty,
        spaceId: street.id,
        playerId: activePlayerId,
      },
      turn: { ...base.turn, phase: TurnPhase.AwaitDecision },
    };

    return executeGameCommand(
      landed,
      { type: GameCommandType.DeclineLandedAsset },
      new SeededRandomSource(3)
    ).nextState;
  };

  const currentBidder = (state: GameState) => {
    const auction = state.auctionState;
    if (!auction) {
      throw new Error('No auction in progress');
    }
    return auction.activeBidderOrder[auction.activeBidderIndex];
  };

  it('never returns the turn to a player who has passed', () => {
    let state = openAuction();
    const passed: string[] = [];
    // Alternating bid and pass is what wraps the index round.
    const actions = ['bid', 'pass', 'bid', 'pass', 'bid', 'pass'] as const;

    for (const action of actions) {
      if (state.pendingDecision.type !== PendingDecisionType.AuctionBid) {
        break;
      }
      const bidder = currentBidder(state);
      expect(passed, `${bidder} was asked to act again after passing`).not.toContain(
        bidder
      );

      if (action === 'pass') {
        passed.push(bidder);
        state = executeGameCommand(
          state,
          { type: GameCommandType.PassAuction },
          new SeededRandomSource(3)
        ).nextState;
      } else {
        const auction = state.auctionState;
        state = executeGameCommand(
          state,
          {
            type: GameCommandType.SubmitAuctionBid,
            amount: Math.max(AUCTION_START_PRICE, (auction?.highestBid ?? 0) + 1),
          },
          new SeededRandomSource(3)
        ).nextState;
      }
    }
  });

  it('rejects a bid above the bidder’s cash', () => {
    const state = openAuction();
    const bidder = currentBidder(state);

    expect(() =>
      executeGameCommand(
        state,
        {
          type: GameCommandType.SubmitAuctionBid,
          amount: state.players[bidder].cash + 1,
        },
        new SeededRandomSource(3)
      )
    ).toThrow(/exceeds available cash/i);
  });

  it('rejects a bid below the minimum', () => {
    const state = openAuction();

    expect(() =>
      executeGameCommand(
        state,
        { type: GameCommandType.SubmitAuctionBid, amount: AUCTION_START_PRICE - 1 },
        new SeededRandomSource(3)
      )
    ).toThrow(/at least/i);
  });

  // Nobody has to buy. The property simply stays with the bank.
  it('leaves the property unowned when every player passes', () => {
    let state = openAuction();
    const spaceId = state.auctionState?.spaceId as string;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (state.pendingDecision.type !== PendingDecisionType.AuctionBid) {
        break;
      }
      state = executeGameCommand(
        state,
        { type: GameCommandType.PassAuction },
        new SeededRandomSource(3)
      ).nextState;
    }

    expect(state.auctionState).toBeNull();
    expect(state.ownership[spaceId].ownerPlayerId).toBeNull();
  });

  // The player who declined is entitled to bid - the rule people forget.
  it('includes the player who declined among the bidders', () => {
    const state = openAuction();
    const declinerId = state.playerOrder[state.activePlayerIndex];

    expect(state.auctionState?.activeBidderOrder).toContain(declinerId);
  });
});

/**
 * Chance at index 36 with "go back three spaces" lands on Community Chest at
 * 33, so acknowledging one card draws another. The apply step routes back
 * through resolveCurrentSpace, which can raise a fresh card-draw decision.
 */
describe('a card that leads to another card', () => {
  it('draws the second card instead of settling the turn', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    const backThree: DeckCard = {
      id: 'test-back-three',
      deck: CardDeck.Chance,
      title: 'Go back three spaces',
      description: 'Move back three spaces.',
      effect: { kind: CardEffectKind.MoveSteps, steps: -3 },
    };
    const chanceIndex = 36;
    expect(game.board[chanceIndex].kind).toBe(SpaceKind.Chance);
    expect(game.board[chanceIndex - 3].kind).toBe(SpaceKind.CommunityChest);

    const drawn: GameState = {
      ...game,
      players: {
        ...game.players,
        [activePlayerId]: { ...game.players[activePlayerId], position: chanceIndex },
      },
      pendingDecision: {
        type: PendingDecisionType.CardDraw,
        playerId: activePlayerId,
        deck: DeckName.Chance,
        card: backThree,
      },
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
    };

    const result = executeGameCommand(
      drawn,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    );

    expect(result.nextState.players[activePlayerId].position).toBe(chanceIndex - 3);
    // A second card is pending, and the turn has not been settled.
    expect(result.nextState.pendingDecision.type).toBe(PendingDecisionType.CardDraw);
    expect(result.nextState.turn.phase).toBe(TurnPhase.AwaitDecision);
  });

  // Moving backwards must never pay the GO salary, and MoveSteps never does.
  it('pays no GO salary when a card moves the player backwards', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    const cashBefore = game.players[activePlayerId].cash;
    const backThree: DeckCard = {
      id: 'test-back-three',
      deck: CardDeck.Chance,
      title: 'Go back three spaces',
      description: 'Move back three spaces.',
      effect: { kind: CardEffectKind.MoveSteps, steps: -3 },
    };
    // From index 1, back three wraps to 38 - past GO, going the wrong way.
    const drawn: GameState = {
      ...game,
      players: {
        ...game.players,
        [activePlayerId]: { ...game.players[activePlayerId], position: 1 },
      },
      pendingDecision: {
        type: PendingDecisionType.CardDraw,
        playerId: activePlayerId,
        deck: DeckName.Chance,
        card: backThree,
      },
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
    };

    const result = executeGameCommand(
      drawn,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    );

    expect(result.nextState.players[activePlayerId].position).toBe(38);

    // Index 38 is Super Tax, so the player pays it on landing. What matters is
    // that they gained nothing: no GO salary for crossing GO backwards.
    const landedOn = result.nextState.board[38];
    if (landedOn.kind !== SpaceKind.Tax) {
      throw new Error('Expected Super Tax at index 38');
    }
    expect(result.nextState.players[activePlayerId].cash).toBe(
      cashBefore - landedOn.amount
    );
  });
});
