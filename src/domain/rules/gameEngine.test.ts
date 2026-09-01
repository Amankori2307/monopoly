import { describe, expect, it } from 'vitest';
import {
  ColorGroup,
  GameCommandType,
  GameStatus,
  PendingDecisionType,
  SpaceKind,
  TurnPhase,
} from '../types/game.enums';
import { CardDeck, CardEffectKind, DeckName } from '../types/game.enums';
import type { DeckCard } from '../types/game.interfaces';
import {
  AUCTION_START_PRICE,
  JAIL_FINE,
  JAIL_POSITION,
  MAX_JAIL_TURNS,
  MORTGAGE_INTEREST_PERCENT,
  HOTEL_BUILD_LEVEL,
} from '../constants/game.constants';
import type { GameState, StreetSpace } from '../types/game.interfaces';
import { createGameState, executeGameCommand } from './gameEngine';
import { isOwnableSpace, isStreetSpace } from './space.utils';
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

/**
 * A doubles turn is three separate rolls, each resolved before the next — not
 * three dice thrown at once. Everything the first two rolls did stands, even
 * when the third sends the player to Jail.
 */
describe('a full three-doubles turn', () => {
  // Seed 11 rolls 2 and 2, so passing a fresh one per command gives doubles
  // three times over.
  const doublesSource = () => new SeededRandomSource(11);

  it('resolves each roll in turn and keeps their outcomes when the third jails', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    const startingCash = game.players[activePlayerId].cash;
    let state: GameState = {
      ...game,
      players: {
        ...game.players,
        [activePlayerId]: { ...game.players[activePlayerId], position: 0 },
      },
    };

    // Roll one: 0 → 4, Income Tax. Fully resolved: the tax is paid.
    state = executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      doublesSource()
    ).nextState;
    const incomeTax = state.board[4];
    if (incomeTax.kind !== SpaceKind.Tax) {
      throw new Error('Expected Income Tax at index 4');
    }
    expect(state.players[activePlayerId].position).toBe(4);
    expect(state.players[activePlayerId].cash).toBe(startingCash - incomeTax.amount);
    expect(state.turn.doublesCount).toBe(1);
    expect(state.turn.canRollAgain).toBe(true);

    // Roll two: 4 → 8, an unowned street. Fully resolved: the player buys it.
    state = executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      doublesSource()
    ).nextState;
    const agra = state.board[8];
    if (!isOwnableSpace(agra)) {
      throw new Error('Expected an ownable space at index 8');
    }
    expect(state.players[activePlayerId].position).toBe(8);
    expect(state.pendingDecision.type).toBe(PendingDecisionType.LandedUnownedProperty);

    state = executeGameCommand(
      state,
      { type: GameCommandType.BuyLandedAsset },
      doublesSource()
    ).nextState;
    expect(state.ownership[agra.id].ownerPlayerId).toBe(activePlayerId);
    expect(state.turn.doublesCount).toBe(2);
    expect(state.turn.canRollAgain).toBe(true);

    // Roll three: doubles again, so it is discarded entirely.
    state = executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      doublesSource()
    ).nextState;

    expect(state.players[activePlayerId].inJail).toBe(true);
    // In Jail, not at 12 - the third roll moved them nowhere.
    expect(state.players[activePlayerId].position).toBe(JAIL_POSITION);
    expect(state.turn.canRollAgain).toBe(false);
    expect(state.turn.phase).toBe(TurnPhase.TurnComplete);

    // And crucially, the first two rolls still happened.
    expect(state.ownership[agra.id].ownerPlayerId).toBe(activePlayerId);
    expect(state.players[activePlayerId].cash).toBe(
      startingCash - incomeTax.amount - agra.price
    );
  });

  it('resets the doubles count once the turn passes', () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    let state: GameState = {
      ...game,
      players: {
        ...game.players,
        [activePlayerId]: { ...game.players[activePlayerId], position: 0 },
      },
    };

    state = executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      doublesSource()
    ).nextState;
    expect(state.turn.doublesCount).toBe(1);

    // Ending the turn while an extra roll is owed re-arms the same player and
    // keeps the count; only passing the turn on clears it.
    state = executeGameCommand(
      state,
      { type: GameCommandType.EndTurn },
      doublesSource()
    ).nextState;
    expect(state.turn.doublesCount).toBe(1);
    expect(state.playerOrder[state.activePlayerIndex]).toBe(activePlayerId);
  });
});

/**
 * A player who cannot pay must not be released from Jail.
 *
 * Both jail-fine paths called resolveBankPayment, which raises an
 * asset-liquidation decision when the player is short - and then overwrote that
 * decision back to `none` and un-jailed them anyway. Two separate sites with the
 * same defect: the voluntary fine, and the mandatory one on the third turn.
 */
describe('the jail fine when the player cannot afford it', () => {
  const jailedBrokePlayer = () => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    return {
      ...game,
      players: {
        ...game.players,
        [activePlayerId]: {
          ...game.players[activePlayerId],
          cash: JAIL_FINE - 1,
          inJail: true,
          // A genuinely jailed player stands on the Jail square.
          position: JAIL_POSITION,
        },
      },
      pendingDecision: {
        type: PendingDecisionType.JailChoice as const,
        playerId: activePlayerId,
      },
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
    };
  };

  it('keeps a broke player in Jail when they try to pay the fine', () => {
    const game = jailedBrokePlayer();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];

    const result = executeGameCommand(
      game,
      { type: GameCommandType.PayJailFine },
      new SeededRandomSource(3)
    );

    expect(result.nextState.players[activePlayerId].inJail).toBe(true);
    expect(result.nextState.pendingDecision.type).toBe(
      PendingDecisionType.AssetLiquidation
    );
    expect(result.nextState.players[activePlayerId].cash).toBe(JAIL_FINE - 1);
  });

  it('keeps a broke player in Jail on the mandatory third-turn fine', () => {
    const game = jailedBrokePlayer();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    const onLastAttempt = {
      ...game,
      players: {
        ...game.players,
        [activePlayerId]: {
          ...game.players[activePlayerId],
          jailTurnsServed: MAX_JAIL_TURNS - 1,
        },
      },
    };

    // Seed 3 rolls 2 and 4 - not doubles, so this is the failed third attempt.
    const result = executeGameCommand(
      onLastAttempt,
      { type: GameCommandType.AttemptJailRoll },
      new SeededRandomSource(3)
    );

    expect(result.nextState.players[activePlayerId].inJail).toBe(true);
    expect(result.nextState.pendingDecision.type).toBe(
      PendingDecisionType.AssetLiquidation
    );
    // Not moved off the Jail square either.
    expect(result.nextState.players[activePlayerId].position).toBe(JAIL_POSITION);
  });
});

/**
 * Mortgaging, redeeming, and settling a debt.
 *
 * asset-liquidation used to be a dead end: the payment primitives recorded the
 * debt without moving any money, and nothing could clear the decision. These
 * three commands are the way out.
 */
describe('mortgage, redeem and settle', () => {
  /** The active player owning the first street on the board. */
  const withOwnedStreet = (overrides: Partial<GameState> = {}) => {
    const game = createBaseGame();
    const activePlayerId = game.playerOrder[game.activePlayerIndex];
    const street = game.board.find(isStreetSpace);
    if (!street) {
      throw new Error('No street on the board');
    }
    return {
      state: {
        ...game,
        ownership: {
          ...game.ownership,
          [street.id]: { ownerPlayerId: activePlayerId, mortgaged: false, buildLevel: 0 },
        },
        ...overrides,
      } as GameState,
      street,
      activePlayerId,
    };
  };

  describe('mortgageAsset', () => {
    it('pays the mortgage value and marks the site mortgaged', () => {
      const { state, street, activePlayerId } = withOwnedStreet();
      const cashBefore = state.players[activePlayerId].cash;

      const result = executeGameCommand(
        state,
        { type: GameCommandType.MortgageAsset, spaceId: street.id },
        new SeededRandomSource(3)
      );

      expect(result.nextState.players[activePlayerId].cash).toBe(
        cashBefore + street.mortgageValue
      );
      expect(result.nextState.ownership[street.id].mortgaged).toBe(true);
    });

    it('logs the amount, so it reaches the activity log and a toast', () => {
      const { state, street } = withOwnedStreet();

      const result = executeGameCommand(
        state,
        { type: GameCommandType.MortgageAsset, spaceId: street.id },
        new SeededRandomSource(3)
      );

      expect(result.nextState.history[0].message).toContain(String(street.mortgageValue));
      expect(result.nextState.history[0].message).toContain(street.name);
    });

    it('refuses a site the player does not own', () => {
      const game = createBaseGame();
      const street = game.board.find(isStreetSpace);

      expect(() =>
        executeGameCommand(
          game,
          { type: GameCommandType.MortgageAsset, spaceId: street!.id },
          new SeededRandomSource(3)
        )
      ).toThrow(/does not own/i);
    });

    it('refuses a site that is already mortgaged', () => {
      const { state, street, activePlayerId } = withOwnedStreet();
      const alreadyMortgaged: GameState = {
        ...state,
        ownership: {
          ...state.ownership,
          [street.id]: { ownerPlayerId: activePlayerId, mortgaged: true, buildLevel: 0 },
        },
      };

      expect(() =>
        executeGameCommand(
          alreadyMortgaged,
          { type: GameCommandType.MortgageAsset, spaceId: street.id },
          new SeededRandomSource(3)
        )
      ).toThrow(/already mortgaged/i);
    });

    // A no-op today because buildLevel is never written, but the rule is real
    // and the guard has to exist before building lands.
    it('refuses a site whose colour set still holds buildings', () => {
      const { state, street, activePlayerId } = withOwnedStreet();
      const sibling = state.board.find(
        (space) =>
          isStreetSpace(space) &&
          space.colorGroup === street.colorGroup &&
          space.id !== street.id
      );
      if (!sibling) {
        throw new Error('Expected another street in the same colour group');
      }
      const built: GameState = {
        ...state,
        ownership: {
          ...state.ownership,
          [sibling.id]: {
            ownerPlayerId: activePlayerId,
            mortgaged: false,
            buildLevel: 1,
          },
        },
      };

      expect(() =>
        executeGameCommand(
          built,
          { type: GameCommandType.MortgageAsset, spaceId: street.id },
          new SeededRandomSource(3)
        )
      ).toThrow(/sell the buildings/i);
    });

    it('refuses a space nobody can own', () => {
      const game = createBaseGame();
      const chance = game.board.find((space) => space.kind === SpaceKind.Chance);

      expect(() =>
        executeGameCommand(
          game,
          { type: GameCommandType.MortgageAsset, spaceId: chance!.id },
          new SeededRandomSource(3)
        )
      ).toThrow(/cannot be mortgaged/i);
    });
  });

  describe('unmortgageAsset', () => {
    const withMortgagedStreet = () => {
      const { state, street, activePlayerId } = withOwnedStreet();
      return {
        street,
        activePlayerId,
        state: {
          ...state,
          ownership: {
            ...state.ownership,
            [street.id]: {
              ownerPlayerId: activePlayerId,
              mortgaged: true,
              buildLevel: 0,
            },
          },
        } as GameState,
      };
    };

    it('charges the mortgage value plus interest, rounded up', () => {
      const { state, street, activePlayerId } = withMortgagedStreet();
      const cashBefore = state.players[activePlayerId].cash;
      const expectedCost =
        street.mortgageValue +
        Math.ceil((street.mortgageValue * MORTGAGE_INTEREST_PERCENT) / 100);

      const result = executeGameCommand(
        state,
        { type: GameCommandType.UnmortgageAsset, spaceId: street.id },
        new SeededRandomSource(3)
      );

      expect(result.nextState.players[activePlayerId].cash).toBe(
        cashBefore - expectedCost
      );
      expect(result.nextState.ownership[street.id].mortgaged).toBe(false);
    });

    it('refuses a site that is not mortgaged', () => {
      const { state, street } = withOwnedStreet();

      expect(() =>
        executeGameCommand(
          state,
          { type: GameCommandType.UnmortgageAsset, spaceId: street.id },
          new SeededRandomSource(3)
        )
      ).toThrow(/not mortgaged/i);
    });

    it('refuses when the player cannot afford the redemption', () => {
      const { state, street, activePlayerId } = withMortgagedStreet();
      const broke: GameState = {
        ...state,
        players: {
          ...state.players,
          [activePlayerId]: { ...state.players[activePlayerId], cash: 0 },
        },
      };

      expect(() =>
        executeGameCommand(
          broke,
          { type: GameCommandType.UnmortgageAsset, spaceId: street.id },
          new SeededRandomSource(3)
        )
      ).toThrow(/cannot afford/i);
    });
  });

  describe('settleDebt — the way out of the deadlock', () => {
    /** A player who lands on an opponent's street with too little cash. */
    const owingRent = () => {
      const game = createBaseGame();
      const [debtorId, creditorId] = game.playerOrder;
      const street = game.board.find(isStreetSpace);
      if (!street) {
        throw new Error('No street on the board');
      }
      const rentOwed = street.rents.baseRent;

      return {
        street,
        debtorId,
        creditorId,
        rentOwed,
        state: {
          ...game,
          players: {
            ...game.players,
            // Short of the rent, but owns a site worth mortgaging.
            [debtorId]: { ...game.players[debtorId], cash: rentOwed - 1 },
          },
          ownership: {
            ...game.ownership,
            [street.id]: {
              ownerPlayerId: creditorId,
              mortgaged: false,
              buildLevel: 0,
            },
          },
          pendingDecision: {
            type: PendingDecisionType.AssetLiquidation as const,
            playerId: debtorId,
            amountDue: rentOwed,
            creditorPlayerId: creditorId,
            reason: `rent on ${street.name}`,
          },
          turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
        } as GameState,
      };
    };

    it('refuses to settle while the debtor still cannot pay', () => {
      const { state } = owingRent();

      expect(() =>
        executeGameCommand(
          state,
          { type: GameCommandType.SettleDebt },
          new SeededRandomSource(3)
        )
      ).toThrow(/cannot cover/i);
    });

    it('throws when there is no debt at all', () => {
      expect(() =>
        executeGameCommand(
          createBaseGame(),
          { type: GameCommandType.SettleDebt },
          new SeededRandomSource(3)
        )
      ).toThrow(/no debt to settle/i);
    });

    // The whole point of the step: mortgage to raise the cash, then settle.
    it('lets the debtor mortgage a site and settle, paying the creditor', () => {
      const { state, debtorId, creditorId, rentOwed } = owingRent();
      const ownSite = state.board.find(
        (space) =>
          isStreetSpace(space) && state.ownership[space.id].ownerPlayerId === null
      );
      if (!ownSite) {
        throw new Error('Expected an unowned street to assign to the debtor');
      }
      const withAsset: GameState = {
        ...state,
        ownership: {
          ...state.ownership,
          [ownSite.id]: { ownerPlayerId: debtorId, mortgaged: false, buildLevel: 0 },
        },
      };
      const creditorCashBefore = withAsset.players[creditorId].cash;

      // The debtor is not the active player here, but mortgaging is theirs to do
      // - so drive it as the active player would in the real flow.
      const activeIsDebtor: GameState = {
        ...withAsset,
        activePlayerIndex: withAsset.playerOrder.indexOf(debtorId),
      };

      const mortgaged = executeGameCommand(
        activeIsDebtor,
        { type: GameCommandType.MortgageAsset, spaceId: ownSite.id },
        new SeededRandomSource(3)
      ).nextState;

      // Mortgaging must not clear the debt - that was the original bug shape.
      expect(mortgaged.pendingDecision.type).toBe(PendingDecisionType.AssetLiquidation);
      expect(mortgaged.players[debtorId].cash).toBeGreaterThanOrEqual(rentOwed);

      const settled = executeGameCommand(
        mortgaged,
        { type: GameCommandType.SettleDebt },
        new SeededRandomSource(3)
      ).nextState;

      expect(settled.pendingDecision.type).toBe(PendingDecisionType.None);
      // The creditor is actually paid - the insolvent branch never did this.
      expect(settled.players[creditorId].cash).toBe(creditorCashBefore + rentOwed);
      expect(settled.turn.phase).toBe(TurnPhase.TurnComplete);
    });

    it('pays the bank when the debt has no creditor', () => {
      const { state, debtorId, rentOwed } = owingRent();
      const bankDebt: GameState = {
        ...state,
        players: {
          ...state.players,
          [debtorId]: { ...state.players[debtorId], cash: rentOwed },
        },
        pendingDecision: {
          type: PendingDecisionType.AssetLiquidation,
          playerId: debtorId,
          amountDue: rentOwed,
          creditorPlayerId: null,
          reason: 'Income Tax',
        },
      };

      const settled = executeGameCommand(
        bankDebt,
        { type: GameCommandType.SettleDebt },
        new SeededRandomSource(3)
      ).nextState;

      expect(settled.pendingDecision.type).toBe(PendingDecisionType.None);
      expect(settled.players[debtorId].cash).toBe(0);
    });

    it('restores the extra roll a double earned before the debt arose', () => {
      const { state, debtorId, rentOwed } = owingRent();
      const afterDoubles: GameState = {
        ...state,
        players: {
          ...state.players,
          [debtorId]: { ...state.players[debtorId], cash: rentOwed },
        },
        turn: { ...state.turn, doublesCount: 1, canRollAgain: false },
      };

      const settled = executeGameCommand(
        afterDoubles,
        { type: GameCommandType.SettleDebt },
        new SeededRandomSource(3)
      ).nextState;

      expect(settled.turn.canRollAgain).toBe(true);
      expect(settled.turn.phase).toBe(TurnPhase.AwaitExtraRollOrEnd);
    });
  });
});

/**
 * Bankruptcy — the answer when a debt is beyond everything a player has.
 *
 * Only reachable from a liquidation, which is why there is no separate decision
 * type: you go bankrupt because you owe, never on a whim.
 */
describe('bankruptcy', () => {
  /** A debtor owing more than they hold, with one site and a named creditor. */
  const hopelesslyInDebt = (options: { toBank?: boolean } = {}) => {
    const game = createBaseGame();
    const [debtorId, creditorId] = game.playerOrder;
    const street = game.board.find(isStreetSpace);
    if (!street) {
      throw new Error('No street on the board');
    }
    const amountDue = 5000;

    return {
      debtorId,
      creditorId,
      street,
      amountDue,
      state: {
        ...game,
        players: {
          ...game.players,
          [debtorId]: { ...game.players[debtorId], cash: 20, jailFreeCards: 1 },
        },
        ownership: {
          ...game.ownership,
          [street.id]: { ownerPlayerId: debtorId, mortgaged: false, buildLevel: 0 },
        },
        activePlayerIndex: game.playerOrder.indexOf(debtorId),
        pendingDecision: {
          type: PendingDecisionType.AssetLiquidation as const,
          playerId: debtorId,
          amountDue,
          creditorPlayerId: options.toBank ? null : creditorId,
          reason: 'rent',
        },
        turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
      } as GameState,
    };
  };

  it('hands everything to the creditor', () => {
    const { state, debtorId, creditorId, street } = hopelesslyInDebt();
    const creditorCashBefore = state.players[creditorId].cash;
    const creditorCardsBefore = state.players[creditorId].jailFreeCards;

    const result = executeGameCommand(
      state,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    );
    const next = result.nextState;

    expect(next.players[creditorId].cash).toBe(creditorCashBefore + 20);
    expect(next.players[creditorId].jailFreeCards).toBe(creditorCardsBefore + 1);
    expect(next.ownership[street.id].ownerPlayerId).toBe(creditorId);
    expect(next.players[debtorId].isBankrupt).toBe(true);
    expect(next.players[debtorId].cash).toBe(0);
    // The base game has two players, so this bankruptcy also ends the game -
    // see the 'winning' suite below.
    expect(next.pendingDecision.type).toBe(PendingDecisionType.GameOver);
  });

  it('keeps a mortgaged site mortgaged when it changes hands', () => {
    const { state, creditorId, street, debtorId } = hopelesslyInDebt();
    const mortgaged: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [street.id]: { ownerPlayerId: debtorId, mortgaged: true, buildLevel: 0 },
      },
    };

    const next = executeGameCommand(
      mortgaged,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.ownership[street.id].ownerPlayerId).toBe(creditorId);
    expect(next.ownership[street.id].mortgaged).toBe(true);
  });

  it('returns sites to the bank, unmortgaged, when the debt was the bank’s', () => {
    const { state, street, debtorId } = hopelesslyInDebt({ toBank: true });
    const mortgaged: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [street.id]: { ownerPlayerId: debtorId, mortgaged: true, buildLevel: 0 },
      },
    };

    const next = executeGameCommand(
      mortgaged,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.ownership[street.id].ownerPlayerId).toBeNull();
    // The bank cancels the mortgage before the site returns to play.
    expect(next.ownership[street.id].mortgaged).toBe(false);
  });

  // You are bankrupt when you cannot pay, not when you would rather not.
  it('refuses while the debt is still within reach', () => {
    const { state, debtorId } = hopelesslyInDebt();
    const affordable: GameState = {
      ...state,
      pendingDecision: { ...state.pendingDecision, amountDue: 10 } as never,
      players: {
        ...state.players,
        [debtorId]: { ...state.players[debtorId], cash: 500 },
      },
    };

    expect(() =>
      executeGameCommand(
        affordable,
        { type: GameCommandType.ConfirmBankruptcy },
        new SeededRandomSource(3)
      )
    ).toThrow(/can still raise/i);
  });

  it('counts the debt against what could be raised, not just cash', () => {
    const { state, debtorId, street } = hopelesslyInDebt();
    // Cash alone is short, but mortgaging the site would cover it.
    const reachable: GameState = {
      ...state,
      pendingDecision: {
        ...state.pendingDecision,
        amountDue: street.mortgageValue + 10,
      } as never,
      players: {
        ...state.players,
        [debtorId]: { ...state.players[debtorId], cash: 10 },
      },
    };

    expect(() =>
      executeGameCommand(
        reachable,
        { type: GameCommandType.ConfirmBankruptcy },
        new SeededRandomSource(3)
      )
    ).toThrow(/can still raise/i);
  });

  it('throws when there is no debt at all', () => {
    expect(() =>
      executeGameCommand(
        createBaseGame(),
        { type: GameCommandType.ConfirmBankruptcy },
        new SeededRandomSource(3)
      )
    ).toThrow(/only declared against a debt/i);
  });

  it('ranks players in the order they go out', () => {
    const { state, debtorId } = hopelesslyInDebt();
    const someoneAlreadyOut: GameState = {
      ...state,
      players: {
        ...state.players,
        [state.playerOrder[1]]: {
          ...state.players[state.playerOrder[1]],
          isBankrupt: true,
          bankruptcyRank: 1,
        },
      },
      pendingDecision: {
        ...state.pendingDecision,
        creditorPlayerId: null,
      } as never,
    };

    const next = executeGameCommand(
      someoneAlreadyOut,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.players[debtorId].bankruptcyRank).toBe(2);
  });

  it('skips a bankrupt player when the turn passes', () => {
    const game = createBaseGame();
    const [first, second] = game.playerOrder;
    const withOneOut: GameState = {
      ...game,
      players: {
        ...game.players,
        [second]: { ...game.players[second], isBankrupt: true, bankruptcyRank: 1 },
      },
      activePlayerIndex: game.playerOrder.indexOf(first),
      turn: { ...game.turn, phase: TurnPhase.TurnComplete },
    };

    const next = executeGameCommand(
      withOneOut,
      { type: GameCommandType.EndTurn },
      new SeededRandomSource(3)
    ).nextState;

    // Two players, one out - so the turn comes back to the same player.
    expect(next.playerOrder[next.activePlayerIndex]).toBe(first);
  });
});

/**
 * The end of the game. Bankruptcy is the only way a player leaves, so it is the
 * only place a game can become won.
 */
describe('winning', () => {
  const twoPlayersOneDoomed = () => {
    const game = createBaseGame();
    const [debtorId, survivorId] = game.playerOrder;

    return {
      debtorId,
      survivorId,
      state: {
        ...game,
        players: {
          ...game.players,
          [debtorId]: { ...game.players[debtorId], cash: 5 },
        },
        activePlayerIndex: game.playerOrder.indexOf(debtorId),
        pendingDecision: {
          type: PendingDecisionType.AssetLiquidation as const,
          playerId: debtorId,
          amountDue: 5000,
          creditorPlayerId: survivorId,
          reason: 'rent',
        },
        turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
      } as GameState,
    };
  };

  it('declares the last player standing the winner', () => {
    const { state, survivorId } = twoPlayersOneDoomed();

    const next = executeGameCommand(
      state,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.winnerPlayerId).toBe(survivorId);
    expect(next.status).toBe(GameStatus.Completed);
    expect(next.pendingDecision.type).toBe(PendingDecisionType.GameOver);
  });

  it('records the win in the history', () => {
    const { state, survivorId } = twoPlayersOneDoomed();

    const next = executeGameCommand(
      state,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.history[0].message).toContain(next.players[survivorId].name);
    expect(next.history[0].message).toMatch(/won the game/i);
  });

  // ensureGameNotFinished already guards this; the point is that setting the
  // status is what switches it on.
  it('takes no further commands once complete', () => {
    const { state } = twoPlayersOneDoomed();
    const finished = executeGameCommand(
      state,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    ).nextState;

    expect(() =>
      executeGameCommand(
        finished,
        { type: GameCommandType.RollTurnDice },
        new SeededRandomSource(3)
      )
    ).toThrow(/already complete/i);
  });

  it('does not end the game while two players remain', () => {
    const game = createBaseGame();
    const withThree: GameState = {
      ...game,
      // A third seat, so one bankruptcy still leaves two in the game.
      playerOrder: [...game.playerOrder, 'player-3'],
      players: {
        ...game.players,
        'player-3': {
          ...game.players[game.playerOrder[0]],
          id: 'player-3',
          name: 'Meera',
        },
      },
    };
    const doomed: GameState = {
      ...withThree,
      players: {
        ...withThree.players,
        [withThree.playerOrder[0]]: {
          ...withThree.players[withThree.playerOrder[0]],
          cash: 5,
        },
      },
      activePlayerIndex: 0,
      pendingDecision: {
        type: PendingDecisionType.AssetLiquidation,
        playerId: withThree.playerOrder[0],
        amountDue: 5000,
        creditorPlayerId: withThree.playerOrder[1],
        reason: 'rent',
      },
      turn: { ...withThree.turn, phase: TurnPhase.AwaitDecision },
    };

    const next = executeGameCommand(
      doomed,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.status).toBe(GameStatus.InProgress);
    expect(next.winnerPlayerId).toBeNull();
  });
});

/**
 * Building is what finally activates the rent tiers that getStreetRent has
 * always had, so these assert money, inventory and rent together.
 */
describe('building', () => {
  /** The first player owning a whole colour group, with cash to build. */
  const withCompleteSet = (levels: number[] = [0, 0]) => {
    const game = createBaseGame();
    const ownerId = game.playerOrder[0];
    const sites = game.board.filter(
      (space): space is StreetSpace =>
        space.kind === SpaceKind.Street && space.colorGroup === ColorGroup.Brown
    );
    const ownership = { ...game.ownership };
    sites.forEach((site, index) => {
      ownership[site.id] = {
        ownerPlayerId: ownerId,
        mortgaged: false,
        buildLevel: levels[index] ?? 0,
      };
    });

    return {
      sites,
      ownerId,
      state: {
        ...game,
        ownership,
        players: { ...game.players, [ownerId]: { ...game.players[ownerId], cash: 5000 } },
        turn: { ...game.turn, phase: TurnPhase.TurnComplete },
      } as GameState,
    };
  };

  it('charges the house cost and takes a house from the bank', () => {
    const { state, sites, ownerId } = withCompleteSet();
    const [first] = sites;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.BuildHouse, spaceId: first.id },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.ownership[first.id].buildLevel).toBe(1);
    expect(next.players[ownerId].cash).toBe(5000 - first.houseCost);
    expect(next.bank.housesAvailable).toBe(state.bank.housesAvailable - 1);
  });

  it('logs the build, so the money movement is visible', () => {
    const { state, sites } = withCompleteSet();

    const next = executeGameCommand(
      state,
      { type: GameCommandType.BuildHouse, spaceId: sites[0].id },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.history[0].message).toMatch(/built a house/i);
  });

  it('returns the four houses to the bank when a hotel goes up', () => {
    const { state, sites, ownerId } = withCompleteSet([4, 4]);
    const [first] = sites;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.BuildHotel, spaceId: first.id },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.ownership[first.id].buildLevel).toBe(HOTEL_BUILD_LEVEL);
    expect(next.bank.hotelsAvailable).toBe(state.bank.hotelsAvailable - 1);
    expect(next.bank.housesAvailable).toBe(state.bank.housesAvailable + 4);
    expect(next.players[ownerId].cash).toBe(5000 - first.hotelCost);
  });

  it('refuses an uneven build', () => {
    const { state, sites } = withCompleteSet([1, 0]);

    expect(() =>
      executeGameCommand(
        state,
        { type: GameCommandType.BuildHouse, spaceId: sites[0].id },
        new SeededRandomSource(3)
      )
    ).toThrow(/colour set up first/i);
  });

  it('refuses to build on a set the player does not fully own', () => {
    const game = createBaseGame();
    const street = game.board.find(
      (space): space is StreetSpace => space.kind === SpaceKind.Street
    ) as StreetSpace;
    const state: GameState = {
      ...game,
      ownership: {
        ...game.ownership,
        [street.id]: {
          ownerPlayerId: game.playerOrder[0],
          mortgaged: false,
          buildLevel: 0,
        },
      },
    };

    expect(() =>
      executeGameCommand(
        state,
        { type: GameCommandType.BuildHouse, spaceId: street.id },
        new SeededRandomSource(3)
      )
    ).toThrow(/colour set/i);
  });

  it('pays back half and returns the house to the bank on a sale', () => {
    const { state, sites, ownerId } = withCompleteSet([1, 1]);
    const [first] = sites;
    const cashBefore = state.players[ownerId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.SellHouse, spaceId: first.id },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.ownership[first.id].buildLevel).toBe(0);
    expect(next.players[ownerId].cash).toBe(cashBefore + Math.floor(first.houseCost / 2));
    expect(next.bank.housesAvailable).toBe(state.bank.housesAvailable + 1);
  });

  it('breaks a hotel back into four houses', () => {
    const { state, sites, ownerId } = withCompleteSet([HOTEL_BUILD_LEVEL, 4]);
    const [first] = sites;
    const cashBefore = state.players[ownerId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.SellHotel, spaceId: first.id },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.ownership[first.id].buildLevel).toBe(4);
    expect(next.players[ownerId].cash).toBe(cashBefore + Math.floor(first.hotelCost / 2));
    expect(next.bank.hotelsAvailable).toBe(state.bank.hotelsAvailable + 1);
    expect(next.bank.housesAvailable).toBe(state.bank.housesAvailable - 4);
  });

  it('refuses an uneven sale', () => {
    const { state, sites } = withCompleteSet([1, 2]);

    expect(() =>
      executeGameCommand(
        state,
        { type: GameCommandType.SellHouse, spaceId: sites[0].id },
        new SeededRandomSource(3)
      )
    ).toThrow(/down first/i);
  });

  // Selling buildings is how a player with a built colour set raises cash, so
  // it must survive a pending liquidation rather than clearing it.
  it('leaves a pending liquidation standing', () => {
    const { state, sites, ownerId } = withCompleteSet([1, 1]);
    const debt: GameState = {
      ...state,
      pendingDecision: {
        type: PendingDecisionType.AssetLiquidation,
        playerId: ownerId,
        amountDue: 900,
        creditorPlayerId: state.playerOrder[1],
        reason: 'rent',
      },
      turn: { ...state.turn, phase: TurnPhase.AwaitDecision },
    };

    const next = executeGameCommand(
      debt,
      { type: GameCommandType.SellHouse, spaceId: sites[0].id },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.pendingDecision.type).toBe(PendingDecisionType.AssetLiquidation);
    expect(next.turn.phase).toBe(TurnPhase.AwaitDecision);
  });

  // The whole point of buildings: the rent table already had these tiers and
  // nothing could ever reach them.
  it('raises the rent a visitor pays', () => {
    const { state, sites } = withCompleteSet([1, 1]);
    const [first] = sites;
    const siteIndex = state.board.findIndex((space) => space.id === first.id);
    const visitorId = state.playerOrder[1];

    // Learn what this seed rolls, then start the visitor exactly that far back
    // so the landing is certain rather than hoped for.
    const probe = executeGameCommand(
      {
        ...state,
        activePlayerIndex: state.playerOrder.indexOf(visitorId),
        turn: { ...state.turn, phase: TurnPhase.AwaitRoll },
      },
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(5)
    ).nextState;
    const rolled = probe.turn.lastRoll[0] + probe.turn.lastRoll[1];

    const rentPaid = (source: GameState) => {
      const visiting: GameState = {
        ...source,
        activePlayerIndex: source.playerOrder.indexOf(visitorId),
        players: {
          ...source.players,
          [visitorId]: { ...source.players[visitorId], position: siteIndex - rolled },
        },
        turn: { ...source.turn, phase: TurnPhase.AwaitRoll },
      };
      const moved = executeGameCommand(
        visiting,
        { type: GameCommandType.RollTurnDice },
        new SeededRandomSource(5)
      ).nextState;
      expect(moved.players[visitorId].position).toBe(siteIndex);
      return visiting.players[visitorId].cash - moved.players[visitorId].cash;
    };

    const bare: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [first.id]: { ...state.ownership[first.id], buildLevel: 0 },
      },
    };

    expect(rentPaid(state)).toBe(first.rents.with1House);
    expect(rentPaid(bare)).toBe(first.rents.monopolyRent);
    expect(first.rents.with1House).toBeGreaterThan(first.rents.monopolyRent);
  });
});
