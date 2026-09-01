import { describe, expect, it } from 'vitest';
import {
  BuildingKind,
  ColorGroup,
  GameCommandType,
  GameEventTone,
  GameStatus,
  MortgageChoice,
  PendingDecisionType,
  SpaceKind,
  TurnPhase,
} from '../types/game.enums';
import { CardDeck, CardEffectKind, DeckName, SpeedDieFace } from '../types/game.enums';
import type { DeckCard } from '../types/game.interfaces';
import {
  AUCTION_START_PRICE,
  JAIL_FINE,
  JAIL_POSITION,
  MAX_JAIL_TURNS,
  MORTGAGE_INTEREST_PERCENT,
  HOTEL_BUILD_LEVEL,
  GO_POSITION,
  PASS_GO_AMOUNT,
  SPEED_DIE_BONUS_CASH,
  STARTING_CASH,
} from '../constants/game.constants';
import type { GameState, StreetSpace, TradeState } from '../types/game.interfaces';
import { createGameState, executeGameCommand } from './gameEngine';
import { isOwnableSpace, isStreetSpace } from './space.utils';
import { speedDieSteps } from './speedDie.utils';
import { RAILWAY_RENT_BY_COUNT } from '../constants/board.constants';
import { chanceCards, communityChestCards } from '../cards/indiaEditionCards';
import { indiaEditionTheme } from '../themes/indiaEditionTheme';
import { getPlacementSites } from './buildings.utils';
import { SeededRandomSource } from './rng';

/** A stand-in Get Out of Jail Free card, for tests that only need to hold one. */
const JAIL_CARD: DeckCard = {
  id: 'chance-jail-free',
  deck: CardDeck.Chance,
  title: 'Get Out of Jail Free',
  description: 'Keep this card until needed.',
  effect: { kind: CardEffectKind.JailFree },
};

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
        speedDieFace: null,
        pendingMonopolyAdvance: false,
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
          queued: [],
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
          [debtorId]: { ...game.players[debtorId], cash: 20, jailFreeCards: [JAIL_CARD] },
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
    const creditorCardsBefore = state.players[creditorId].jailFreeCards.length;

    const result = executeGameCommand(
      state,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    );
    const next = result.nextState;

    expect(next.players[creditorId].cash).toBe(creditorCashBefore + 20);
    expect(next.players[creditorId].jailFreeCards).toHaveLength(creditorCardsBefore + 1);
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
        queued: [],
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
        queued: [],
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
    const probeRoll = probe.turn.lastRoll ?? [];
    const rolled = probeRoll[0] + probeRoll[1];

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

/**
 * Trading is the only way property changes hands between players, so these
 * check that everything moves and that a rejection leaves the turn intact.
 */
describe('trading', () => {
  const withOneSiteEach = () => {
    const game = createBaseGame();
    const streets = game.board.filter(
      (space): space is StreetSpace => space.kind === SpaceKind.Street
    );
    const [proposerId, recipientId] = game.playerOrder;
    const offered = streets[0];
    const requested = streets[streets.length - 1];

    return {
      offered,
      requested,
      proposerId,
      recipientId,
      state: {
        ...game,
        ownership: {
          ...game.ownership,
          [offered.id]: { ownerPlayerId: proposerId, mortgaged: false, buildLevel: 0 },
          [requested.id]: {
            ownerPlayerId: recipientId,
            mortgaged: false,
            buildLevel: 0,
          },
        },
        turn: { ...game.turn, phase: TurnPhase.TurnComplete },
      } as GameState,
    };
  };

  const propose = (state: GameState, payload: Partial<TradeState>): GameState =>
    executeGameCommand(
      state,
      {
        type: GameCommandType.ProposeTrade,
        payload: {
          proposerPlayerId: state.playerOrder[0],
          recipientPlayerId: state.playerOrder[1],
          offeredCash: 0,
          requestedCash: 0,
          offeredSpaceIds: [],
          requestedSpaceIds: [],
          offeredJailCards: 0,
          requestedJailCards: 0,
          ...payload,
        },
      },
      new SeededRandomSource(3)
    ).nextState;

  it('puts a proposal to the recipient and blocks the turn', () => {
    const { state, offered } = withOneSiteEach();

    const next = propose(state, { offeredSpaceIds: [offered.id], requestedCash: 100 });

    expect(next.pendingDecision.type).toBe(PendingDecisionType.TradeResponse);
    expect(next.tradeState?.offeredSpaceIds).toEqual([offered.id]);
    expect(next.turn.phase).toBe(TurnPhase.AwaitDecision);
  });

  it('moves sites and cash both ways on acceptance', () => {
    const { state, offered, requested, proposerId, recipientId } = withOneSiteEach();
    const proposerCash = state.players[proposerId].cash;
    const recipientCash = state.players[recipientId].cash;

    const proposed = propose(state, {
      offeredSpaceIds: [offered.id],
      offeredCash: 50,
      requestedSpaceIds: [requested.id],
      requestedCash: 200,
    });
    const settled = executeGameCommand(
      proposed,
      { type: GameCommandType.AcceptTrade },
      new SeededRandomSource(3)
    ).nextState;

    expect(settled.ownership[offered.id].ownerPlayerId).toBe(recipientId);
    expect(settled.ownership[requested.id].ownerPlayerId).toBe(proposerId);
    expect(settled.players[proposerId].cash).toBe(proposerCash - 50 + 200);
    expect(settled.players[recipientId].cash).toBe(recipientCash + 50 - 200);
    expect(settled.tradeState).toBeNull();
    expect(settled.pendingDecision.type).toBe(PendingDecisionType.None);
  });

  it('moves jail cards', () => {
    const { state, proposerId, recipientId } = withOneSiteEach();
    const withCard: GameState = {
      ...state,
      players: {
        ...state.players,
        [proposerId]: { ...state.players[proposerId], jailFreeCards: [JAIL_CARD] },
      },
    };

    const settled = executeGameCommand(
      propose(withCard, { offeredJailCards: 1, requestedCash: 10 }),
      { type: GameCommandType.AcceptTrade },
      new SeededRandomSource(3)
    ).nextState;

    expect(settled.players[proposerId].jailFreeCards).toHaveLength(0);
    // The card itself moved, so it still knows the deck it has to go back to.
    expect(settled.players[recipientId].jailFreeCards).toEqual([JAIL_CARD]);
  });

  // The receiver chooses: pay the interest and take it mortgaged, or clear it
  // outright. Keeping is the default, because it is the cheaper option.
  it('lets the receiver clear a mortgage as part of the trade', () => {
    const { state, offered, recipientId } = withOneSiteEach();
    const mortgaged: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [offered.id]: { ...state.ownership[offered.id], mortgaged: true },
      },
    };
    const recipientCash = mortgaged.players[recipientId].cash;

    const settled = executeGameCommand(
      propose(mortgaged, { offeredSpaceIds: [offered.id], requestedCash: 1 }),
      {
        type: GameCommandType.AcceptTrade,
        mortgageChoices: { [offered.id]: MortgageChoice.Redeem },
      },
      new SeededRandomSource(3)
    ).nextState;

    const interest = Math.ceil((offered.mortgageValue * MORTGAGE_INTEREST_PERCENT) / 100);
    expect(settled.ownership[offered.id].mortgaged).toBe(false);
    expect(settled.players[recipientId].cash).toBe(
      recipientCash - 1 - offered.mortgageValue - interest
    );
  });

  it('refuses acceptance when the receiver cannot afford to clear it', () => {
    const { state, offered, recipientId } = withOneSiteEach();
    const mortgaged: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [offered.id]: { ...state.ownership[offered.id], mortgaged: true },
      },
    };
    const proposed = propose(mortgaged, { offeredSpaceIds: [offered.id] });
    const broke: GameState = {
      ...proposed,
      players: {
        ...proposed.players,
        [recipientId]: { ...proposed.players[recipientId], cash: 5 },
      },
    };

    expect(() =>
      executeGameCommand(
        broke,
        {
          type: GameCommandType.AcceptTrade,
          mortgageChoices: { [offered.id]: MortgageChoice.Redeem },
        },
        new SeededRandomSource(3)
      )
    ).toThrow(/mortgage/i);
  });

  // The proposer agreed without knowing what the other side would elect, so
  // their own side is always taken as it stands.
  it('never clears a mortgage on the proposer side', () => {
    const { state, requested, proposerId } = withOneSiteEach();
    const mortgaged: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [requested.id]: { ...state.ownership[requested.id], mortgaged: true },
      },
    };

    const settled = executeGameCommand(
      propose(mortgaged, { requestedSpaceIds: [requested.id], offeredCash: 1 }),
      {
        type: GameCommandType.AcceptTrade,
        mortgageChoices: { [requested.id]: MortgageChoice.Redeem },
      },
      new SeededRandomSource(3)
    ).nextState;

    expect(settled.ownership[requested.id].mortgaged).toBe(true);
    expect(settled.ownership[requested.id].ownerPlayerId).toBe(proposerId);
  });

  // A mortgaged site travels as it is, and the receiver pays the bank 10% for
  // the privilege of keeping it that way.
  it('charges the receiver interest on a mortgaged site', () => {
    const { state, offered, recipientId } = withOneSiteEach();
    const mortgaged: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [offered.id]: { ...state.ownership[offered.id], mortgaged: true },
      },
    };
    const recipientCash = mortgaged.players[recipientId].cash;

    const settled = executeGameCommand(
      propose(mortgaged, { offeredSpaceIds: [offered.id], requestedCash: 1 }),
      { type: GameCommandType.AcceptTrade },
      new SeededRandomSource(3)
    ).nextState;

    const fee = Math.ceil((offered.mortgageValue * MORTGAGE_INTEREST_PERCENT) / 100);
    expect(settled.players[recipientId].cash).toBe(recipientCash - 1 - fee);
    expect(settled.ownership[offered.id].mortgaged).toBe(true);
  });

  it('leaves everything where it was on a rejection', () => {
    const { state, offered, proposerId } = withOneSiteEach();
    const proposerCash = state.players[proposerId].cash;

    const rejected = executeGameCommand(
      propose(state, { offeredSpaceIds: [offered.id], requestedCash: 100 }),
      { type: GameCommandType.RejectTrade },
      new SeededRandomSource(3)
    ).nextState;

    expect(rejected.ownership[offered.id].ownerPlayerId).toBe(proposerId);
    expect(rejected.players[proposerId].cash).toBe(proposerCash);
    expect(rejected.tradeState).toBeNull();
    expect(rejected.pendingDecision.type).toBe(PendingDecisionType.None);
  });

  // A trade blocks the turn like any other decision, so the extra roll a double
  // earned has to survive it.
  it('gives back the extra roll a double had earned', () => {
    const { state } = withOneSiteEach();
    const afterDouble: GameState = {
      ...state,
      turn: { ...state.turn, doublesCount: 1, phase: TurnPhase.TurnComplete },
    };

    const rejected = executeGameCommand(
      propose(afterDouble, { offeredCash: 10 }),
      { type: GameCommandType.RejectTrade },
      new SeededRandomSource(3)
    ).nextState;

    expect(rejected.turn.canRollAgain).toBe(true);
  });

  it('refuses a proposal from anyone but the active player', () => {
    const { state } = withOneSiteEach();

    expect(() =>
      executeGameCommand(
        state,
        {
          type: GameCommandType.ProposeTrade,
          payload: {
            proposerPlayerId: state.playerOrder[1],
            recipientPlayerId: state.playerOrder[0],
            offeredCash: 10,
            requestedCash: 0,
            offeredSpaceIds: [],
            requestedSpaceIds: [],
            offeredJailCards: 0,
            requestedJailCards: 0,
          },
        },
        new SeededRandomSource(3)
      )
    ).toThrow(/whose turn it is/i);
  });

  it('refuses an answer when no trade is pending', () => {
    const { state } = withOneSiteEach();

    expect(() =>
      executeGameCommand(
        state,
        { type: GameCommandType.AcceptTrade },
        new SeededRandomSource(3)
      )
    ).toThrow(/no trade to answer/i);
  });
});

/**
 * A Get Out of Jail Free card used to leave circulation for good: the player
 * held a count, so nothing knew which deck to put it back in.
 */
describe('Get Out of Jail Free cards', () => {
  const jailedWithCard = () => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const chanceCard: DeckCard = {
      ...JAIL_CARD,
      id: 'chance-jail-free-held',
    };

    return {
      playerId,
      chanceCard,
      state: {
        ...game,
        players: {
          ...game.players,
          [playerId]: {
            ...game.players[playerId],
            inJail: true,
            jailFreeCards: [chanceCard],
          },
        },
        decks: { ...game.decks, chance: [] },
        pendingDecision: { type: PendingDecisionType.JailChoice, playerId },
        turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
      } as GameState,
    };
  };

  it('returns a used card to the deck it came from', () => {
    const { state, playerId, chanceCard } = jailedWithCard();

    const next = executeGameCommand(
      state,
      { type: GameCommandType.UseJailFreeCard },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.players[playerId].jailFreeCards).toHaveLength(0);
    expect(next.decks.chance).toContainEqual(chanceCard);
    expect(next.decks.communityChest).not.toContainEqual(chanceCard);
    expect(next.players[playerId].inJail).toBe(false);
  });

  // The two decks use different string values for the same idea, which is
  // exactly the kind of thing that puts a card back in the wrong pile.
  it('returns a Community Chest card to the Community Chest deck', () => {
    const { state, playerId } = jailedWithCard();
    const chestCard: DeckCard = {
      ...JAIL_CARD,
      id: 'chest-jail-free-held',
      deck: CardDeck.CommunityChest,
    };
    const holding: GameState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: { ...state.players[playerId], jailFreeCards: [chestCard] },
      },
      decks: { chance: [], communityChest: [] },
    };

    const next = executeGameCommand(
      holding,
      { type: GameCommandType.UseJailFreeCard },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.decks.communityChest).toContainEqual(chestCard);
    expect(next.decks.chance).toHaveLength(0);
  });

  it('keeps the other cards a player is holding', () => {
    const { state, playerId } = jailedWithCard();
    const second: DeckCard = { ...JAIL_CARD, id: 'second-card' };
    const holdingTwo: GameState = {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          jailFreeCards: [state.players[playerId].jailFreeCards[0], second],
        },
      },
    };

    const next = executeGameCommand(
      holdingTwo,
      { type: GameCommandType.UseJailFreeCard },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.players[playerId].jailFreeCards).toEqual([second]);
  });
});

/**
 * The Speed Die is optional, agreed at setup, and inert until everyone has
 * been round the board once.
 */
describe('Speed Die setup', () => {
  it('is off unless the game asked for it', () => {
    expect(createBaseGame().useSpeedDie).toBe(false);
  });

  it('starts every player with the bonus when it is on', () => {
    const speedGame = createGameState(
      {
        name: 'Speed',
        playerConfigs: [
          { name: 'Asha', tokenId: 'elephant' },
          { name: 'Vikram', tokenId: 'train' },
        ],
        themeId: 'india-edition',
        createdAt: '2026-08-29T00:00:00.000Z',
        useSpeedDie: true,
      },
      new SeededRandomSource(7)
    );

    expect(speedGame.useSpeedDie).toBe(true);
    speedGame.playerOrder.forEach((playerId) => {
      expect(speedGame.players[playerId].cash).toBe(STARTING_CASH + SPEED_DIE_BONUS_CASH);
    });
  });

  it('starts nobody as having passed GO', () => {
    const game = createBaseGame();

    game.playerOrder.forEach((playerId) => {
      expect(game.players[playerId].hasPassedGo).toBe(false);
    });
  });

  // Passing GO is what arms the die, so the trip has to be recorded and not
  // just paid for.
  it('records the trip past GO, not just the salary', () => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const nearlyRound: GameState = {
      ...game,
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: 38 },
      },
    };

    const next = executeGameCommand(
      nearlyRound,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(5)
    ).nextState;

    expect(next.players[playerId].hasPassedGo).toBe(true);
  });
});

/**
 * The Speed Die in play. The interesting cases are all about what it does NOT
 * change: doubles, Jail, and the extra roll.
 */
describe('rolling with the Speed Die', () => {
  /** A Speed Die game with everyone past GO, so the die is live. */
  const liveSpeedGame = (): GameState => {
    const game = createGameState(
      {
        name: 'Speed',
        playerConfigs: [
          { name: 'Asha', tokenId: 'elephant' },
          { name: 'Vikram', tokenId: 'train' },
        ],
        themeId: 'india-edition',
        createdAt: '2026-08-29T00:00:00.000Z',
        useSpeedDie: true,
      },
      new SeededRandomSource(7)
    );

    return {
      ...game,
      players: Object.fromEntries(
        Object.entries(game.players).map(([id, player]) => [
          id,
          { ...player, hasPassedGo: true },
        ])
      ),
    };
  };

  const rollWith = (state: GameState, seed: number) =>
    executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(seed)
    ).nextState;

  it('rolls a third die once it is live', () => {
    const next = rollWith(liveSpeedGame(), 4);

    expect(next.turn.speedDieFace).not.toBeNull();
    expect(next.turn.lastRoll).toHaveLength(2);
  });

  it('rolls no third die before everyone has passed GO', () => {
    const game = liveSpeedGame();
    const early: GameState = {
      ...game,
      players: {
        ...game.players,
        'player-2': { ...game.players['player-2'], hasPassedGo: false },
      },
    };

    expect(rollWith(early, 4).turn.speedDieFace).toBeNull();
  });

  it('rolls no third die in an ordinary game', () => {
    expect(rollWith(createBaseGame(), 4).turn.speedDieFace).toBeNull();
  });

  // The face is added after the doubles check, so it can never make or break
  // one - the white dice alone decide.
  it('adds a numeric face to the move without touching the doubles count', () => {
    const game = liveSpeedGame();
    const playerId = game.playerOrder[game.activePlayerIndex];

    // Find a seed that rolls a plain number, which is what this asserts about.
    for (let seed = 1; seed < 60; seed += 1) {
      const next = rollWith(game, seed);
      const face = next.turn.speedDieFace;
      const steps = speedDieSteps(face);
      if (steps === 0 || next.turn.lastRoll === null) continue;

      const [white1, white2] = next.turn.lastRoll;
      if (white1 === white2 && white1 === steps) continue; // a triple, tested below

      expect(next.players[playerId].position).toBe(
        (white1 + white2 + steps) % next.board.length
      );
      expect(next.turn.doublesCount).toBe(white1 === white2 ? 1 : 0);
      return;
    }
    throw new Error('No seed produced a plain numeric Speed Die face');
  });

  it('asks where to go when all three dice match', () => {
    const game = liveSpeedGame();

    for (let seed = 1; seed < 400; seed += 1) {
      const next = rollWith(game, seed);
      if (next.pendingDecision.type !== PendingDecisionType.SpeedDieDestination) continue;

      const [white1, white2] = next.turn.lastRoll as number[];
      expect(white1).toBe(white2);
      // A triple is not a double: no extra roll, and no step towards Jail.
      expect(next.turn.doublesCount).toBe(0);
      expect(next.turn.phase).toBe(TurnPhase.AwaitDecision);
      return;
    }
    throw new Error('No seed produced a triple');
  });

  it('asks which dice to move by on a Bus', () => {
    const game = liveSpeedGame();

    for (let seed = 1; seed < 200; seed += 1) {
      const next = rollWith(game, seed);
      if (next.pendingDecision.type !== PendingDecisionType.SpeedDieBus) continue;

      expect(next.turn.speedDieFace).toBe('bus');
      expect(next.turn.phase).toBe(TurnPhase.AwaitDecision);
      return;
    }
    throw new Error('No seed produced a Bus');
  });
});

describe('answering the Speed Die', () => {
  const busPending = (whiteDice: [number, number]): GameState => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    return {
      ...game,
      useSpeedDie: true,
      pendingDecision: {
        type: PendingDecisionType.SpeedDieBus,
        playerId,
        whiteDice,
      },
      turn: {
        ...game.turn,
        phase: TurnPhase.AwaitDecision,
        lastRoll: whiteDice,
        speedDieFace: SpeedDieFace.Bus,
        doublesCount: 0,
      },
    };
  };

  it('moves by one white die, the other, or both', () => {
    const state = busPending([2, 5]);
    const playerId = state.playerOrder[state.activePlayerIndex];

    [2, 5, 7].forEach((steps) => {
      const next = executeGameCommand(
        state,
        { type: GameCommandType.ChooseBusMove, steps },
        new SeededRandomSource(3)
      ).nextState;

      expect(next.players[playerId].position).toBe(steps);
    });
  });

  it('refuses any other number of steps', () => {
    expect(() =>
      executeGameCommand(
        busPending([2, 5]),
        { type: GameCommandType.ChooseBusMove, steps: 4 },
        new SeededRandomSource(3)
      )
    ).toThrow(/moves 2, 5 or 7/i);
  });

  // The bus decides how far, not whether the turn continues. Landing on Free
  // Parking keeps the assertion about the extra roll rather than about whatever
  // decision another space would have raised.
  it('keeps the extra roll when the white dice were a double', () => {
    const pending = busPending([3, 3]);
    const playerId = pending.playerOrder[pending.activePlayerIndex];
    const state: GameState = {
      ...pending,
      players: {
        ...pending.players,
        [playerId]: { ...pending.players[playerId], position: 17 },
      },
      // What RollTurnDice would already have counted for this double.
      turn: { ...pending.turn, doublesCount: 1 },
    };

    const next = executeGameCommand(
      state,
      { type: GameCommandType.ChooseBusMove, steps: 3 },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.players[playerId].position).toBe(20);
    expect(next.turn.canRollAgain).toBe(true);
  });

  it('refuses a bus move when no bus is pending', () => {
    expect(() =>
      executeGameCommand(
        createBaseGame(),
        { type: GameCommandType.ChooseBusMove, steps: 3 },
        new SeededRandomSource(3)
      )
    ).toThrow(/no bus/i);
  });

  const destinationPending = (): GameState => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    return {
      ...game,
      useSpeedDie: true,
      pendingDecision: {
        type: PendingDecisionType.SpeedDieDestination,
        playerId,
      },
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision, doublesCount: 0 },
    };
  };

  it('moves to any chosen space', () => {
    const state = destinationPending();
    const playerId = state.playerOrder[state.activePlayerIndex];
    const target = state.board[25];

    const next = executeGameCommand(
      state,
      { type: GameCommandType.ChooseSpeedDieDestination, spaceId: target.id },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.players[playerId].position).toBe(25);
  });

  // The token travels forward round the board rather than teleporting, so a
  // destination behind the player still collects the GO salary.
  it('pays the GO salary when the move wraps', () => {
    const game = destinationPending();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const state: GameState = {
      ...game,
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: 35 },
      },
    };
    const cashBefore = state.players[playerId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.ChooseSpeedDieDestination, spaceId: state.board[5].id },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.players[playerId].position).toBe(5);
    expect(next.players[playerId].cash).toBeGreaterThan(cashBefore);
  });

  it('grants no extra roll: a triple is not a double', () => {
    const state = destinationPending();

    const next = executeGameCommand(
      state,
      { type: GameCommandType.ChooseSpeedDieDestination, spaceId: state.board[25].id },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.turn.canRollAgain).toBe(false);
  });

  it('refuses a space that is not on the board', () => {
    expect(() =>
      executeGameCommand(
        destinationPending(),
        { type: GameCommandType.ChooseSpeedDieDestination, spaceId: 'nowhere' },
        new SeededRandomSource(3)
      )
    ).toThrow(/no such space/i);
  });
});

/**
 * Mr. Monopoly advances the player on *after* the landed space is resolved,
 * and that space may raise a decision of its own - so the advance has to
 * survive it rather than run inline.
 */
describe('the Mr. Monopoly face', () => {
  /** A turn whose landing has resolved, with the advance still owed. */
  const advanceOwed = (overrides: Partial<GameState> = {}): GameState => {
    const game = createBaseGame();
    return {
      ...game,
      useSpeedDie: true,
      turn: {
        ...game.turn,
        phase: TurnPhase.AwaitDecision,
        speedDieFace: SpeedDieFace.MrMonopoly,
        pendingMonopolyAdvance: true,
        lastRoll: [2, 3],
        doublesCount: 0,
      },
      ...overrides,
    };
  };

  // With nothing left unowned, the advance goes to the next asset an opponent
  // holds and pays its rent - which is the half of the rule people forget.
  it('falls through to an opponent asset when nothing is unowned', () => {
    const game = advanceOwed();
    const [playerId, opponentId] = game.playerOrder;
    const street = game.board.find(isStreetSpace) as StreetSpace;
    const streetIndex = game.board.findIndex((space) => space.id === street.id);

    // Every ownable space belongs to the opponent, except the one being landed
    // on, which the active player already owns.
    const ownership = { ...game.ownership };
    game.board.filter(isOwnableSpace).forEach((space) => {
      ownership[space.id] = {
        ownerPlayerId: opponentId,
        mortgaged: false,
        buildLevel: 0,
      };
    });
    ownership[street.id] = {
      ownerPlayerId: playerId,
      mortgaged: false,
      buildLevel: 0,
    };

    const state: GameState = {
      ...game,
      activePlayerIndex: game.playerOrder.indexOf(playerId),
      ownership,
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: streetIndex, cash: 5000 },
      },
      pendingDecision: {
        type: PendingDecisionType.AssetLiquidation,
        playerId,
        amountDue: 10,
        creditorPlayerId: opponentId,
        reason: 'rent',
        queued: [],
      },
    };
    const opponentCashBefore = state.players[opponentId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.SettleDebt },
      new SeededRandomSource(3)
    ).nextState;

    // Moved on to one of the opponent's sites, and paid for the privilege.
    expect(next.players[playerId].position).not.toBe(streetIndex);
    expect(
      next.ownership[next.board[next.players[playerId].position].id].ownerPlayerId
    ).toBe(opponentId);
    expect(next.players[opponentId].cash).toBeGreaterThan(opponentCashBefore + 10);
  });

  // The advance is owed across the decision the landing raised, which is the
  // whole reason it is a turn field rather than something computed inline.
  it('runs once the decision the landing raised has been answered', () => {
    const game = advanceOwed();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const street = game.board.find(isStreetSpace) as StreetSpace;
    const streetIndex = game.board.findIndex((space) => space.id === street.id);

    const state: GameState = {
      ...game,
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: streetIndex },
      },
      pendingDecision: {
        type: PendingDecisionType.LandedUnownedProperty,
        playerId,
        spaceId: street.id,
      },
    };

    const next = executeGameCommand(
      state,
      { type: GameCommandType.BuyLandedAsset },
      new SeededRandomSource(3)
    ).nextState;

    // Bought the site it landed on, then moved on to the next asset.
    expect(next.ownership[street.id].ownerPlayerId).toBe(playerId);
    expect(next.players[playerId].position).not.toBe(streetIndex);
    expect(next.turn.pendingMonopolyAdvance).toBe(false);
  });

  it('stops owing an advance once it has been taken', () => {
    const game = advanceOwed();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const street = game.board.find(isStreetSpace) as StreetSpace;
    const streetIndex = game.board.findIndex((space) => space.id === street.id);
    const state: GameState = {
      ...game,
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: streetIndex },
      },
      pendingDecision: {
        type: PendingDecisionType.LandedUnownedProperty,
        playerId,
        spaceId: street.id,
      },
    };

    const afterBuy = executeGameCommand(
      state,
      { type: GameCommandType.BuyLandedAsset },
      new SeededRandomSource(3)
    ).nextState;
    const landedOn = afterBuy.players[playerId].position;

    // Answering the decision the advance itself raised must not advance again.
    if (afterBuy.pendingDecision.type === PendingDecisionType.LandedUnownedProperty) {
      const afterSecond = executeGameCommand(
        afterBuy,
        { type: GameCommandType.DeclineLandedAsset },
        new SeededRandomSource(3)
      ).nextState;
      expect(afterSecond.players[playerId].position).toBe(landedOn);
    }
    expect(afterBuy.turn.pendingMonopolyAdvance).toBe(false);
  });
});

/**
 * The result contract. `events` used to return the entire capped history and
 * `saveRequired` was hardcoded true, so neither could answer the question its
 * name asks - the feedback layer had to diff the history itself.
 */
describe('the command result', () => {
  it('returns only the events this command appended', () => {
    const game = createBaseGame();
    const before = game.history.length;

    const result = executeGameCommand(
      game,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(4)
    );

    expect(result.events.length).toBe(result.nextState.history.length - before);
    expect(result.events.length).toBeGreaterThan(0);
    // Newest first, and every one of them genuinely new.
    const seen = new Set(game.history.map((event) => event.id));
    result.events.forEach((event) => expect(seen.has(event.id)).toBe(false));
  });

  it('reports that a state-changing command needs saving', () => {
    const result = executeGameCommand(
      createBaseGame(),
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(4)
    );

    expect(result.saveRequired).toBe(true);
  });

  // Late in a long game the history cap stops the length growing, and a length
  // diff alone would silently stop reporting anything.
  it('still finds new events once the history cap is reached', () => {
    const game = createBaseGame();
    const capped: GameState = {
      ...game,
      history: Array.from({ length: 120 }, (_, index) => ({
        id: `filler-${index}`,
        turnNumber: 1,
        createdAt: '2026-08-29T00:00:00.000Z',
        message: `filler ${index}`,
        tone: GameEventTone.Neutral,
      })),
    };

    const result = executeGameCommand(
      capped,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(4)
    );

    expect(result.nextState.history).toHaveLength(120);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.events.every((event) => !event.id.startsWith('filler-'))).toBe(true);
  });
});

/**
 * Two traps that were latent for as long as nothing could reach them.
 */
describe('moving backwards', () => {
  // "Go back three spaces" from square 1 wraps to 38. The old wrap test was a
  // bare `next < current`, which is true of every backward move - so the card
  // would have paid the GO salary for going the wrong way.
  it('pays no GO salary for a backward move that wraps', () => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const backThree: DeckCard = {
      id: 'chance-back-three',
      deck: CardDeck.Chance,
      title: 'Go back three spaces',
      description: 'Move back three spaces.',
      effect: { kind: CardEffectKind.MoveSteps, steps: -3 },
    };

    const state: GameState = {
      ...game,
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: 1 },
      },
      decks: { ...game.decks, chance: [backThree] },
      pendingDecision: {
        type: PendingDecisionType.CardDraw,
        playerId,
        deck: DeckName.Chance,
        card: backThree,
      },
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
    };
    const cashBefore = state.players[playerId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.players[playerId].position).toBe(38);
    // Landed on Super Tax, so cash can fall - but never rise.
    expect(next.players[playerId].cash).toBeLessThanOrEqual(cashBefore);
    expect(next.history.some((event) => /passing GO/i.test(event.message))).toBe(false);
  });
});

describe('utility rent after arriving without rolling', () => {
  // The printed rule is that a player brought to a utility by a card throws the
  // dice and pays on that throw, not on the roll that started their turn.
  it('charges a fresh throw rather than the turn roll', () => {
    const game = createBaseGame();
    const [visitorId, ownerId] = game.playerOrder;
    const utility = game.board.find((space) => space.kind === SpaceKind.Utility);
    if (!utility || utility.kind !== SpaceKind.Utility) {
      throw new Error('No utility on the board');
    }
    const utilityIndex = game.board.findIndex((space) => space.id === utility.id);
    const card: DeckCard = {
      id: 'chance-to-utility',
      deck: CardDeck.Chance,
      title: 'Advance to the Electric Company',
      description: 'Advance to the utility.',
      effect: { kind: CardEffectKind.MoveTo, index: utilityIndex, collectGo: false },
    };

    const state: GameState = {
      ...game,
      activePlayerIndex: game.playerOrder.indexOf(visitorId),
      ownership: {
        ...game.ownership,
        [utility.id]: { ownerPlayerId: ownerId, mortgaged: false, buildLevel: 0 },
      },
      players: {
        ...game.players,
        [visitorId]: { ...game.players[visitorId], position: 2 },
      },
      decks: { ...game.decks, chance: [card] },
      pendingDecision: {
        type: PendingDecisionType.CardDraw,
        playerId: visitorId,
        deck: DeckName.Chance,
        card,
      },
      // A turn roll of 12, which would be the wrong basis for this rent.
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision, lastRoll: [6, 6] },
    };
    const cashBefore = state.players[visitorId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    ).nextState;

    const paid = cashBefore - next.players[visitorId].cash;
    const multiplier = utility.rentMultiplierOne;
    expect(next.players[visitorId].position).toBe(utilityIndex);
    expect(paid % multiplier).toBe(0);
    // The turn's roll was 6 and 6. Charging on that would be the top of the
    // range every time, so this is what tells the fresh throw apart from it.
    expect(paid).not.toBe(12 * multiplier);
    expect(paid).toBeGreaterThanOrEqual(2 * multiplier);
    expect(paid).toBeLessThanOrEqual(12 * multiplier);
  });
});

/**
 * One card can leave several players unable to pay. Only one decision can be
 * pending, so the rest queue behind the first - before this they were silently
 * forgiven, and everyone after the first paid nothing at all.
 */
describe('several debts from one card', () => {
  /** Three players, two of them too poor to pay the drawer. */
  const threeWithTwoBroke = () => {
    const game = createBaseGame();
    const [collectorId, brokeOneId] = game.playerOrder;
    const brokeTwoId = 'player-3';
    const card: DeckCard = {
      id: 'chest-collect-each',
      deck: CardDeck.CommunityChest,
      title: 'It is your birthday',
      description: 'Collect from every player.',
      effect: { kind: CardEffectKind.CollectFromEach, amount: 100 },
    };

    const state: GameState = {
      ...game,
      playerOrder: [...game.playerOrder, brokeTwoId],
      players: {
        ...game.players,
        [brokeOneId]: { ...game.players[brokeOneId], cash: 10 },
        [brokeTwoId]: {
          ...game.players[game.playerOrder[1]],
          id: brokeTwoId,
          name: 'Meera',
          cash: 5,
        },
      },
      activePlayerIndex: game.playerOrder.indexOf(collectorId),
      decks: { ...game.decks, communityChest: [card] },
      pendingDecision: {
        type: PendingDecisionType.CardDraw,
        playerId: collectorId,
        deck: DeckName.CommunityChest,
        card,
      },
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
    };

    return { state, collectorId, brokeOneId, brokeTwoId };
  };

  const acknowledge = (state: GameState) =>
    executeGameCommand(
      state,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    ).nextState;

  it('records the first debt and queues the second', () => {
    const { state, brokeOneId, brokeTwoId } = threeWithTwoBroke();

    const next = acknowledge(state);

    expect(next.pendingDecision.type).toBe(PendingDecisionType.AssetLiquidation);
    if (next.pendingDecision.type !== PendingDecisionType.AssetLiquidation) return;
    expect(next.pendingDecision.playerId).toBe(brokeOneId);
    // The second player's debt is not lost - it is waiting.
    expect(next.pendingDecision.queued).toHaveLength(1);
    expect(next.pendingDecision.queued[0].playerId).toBe(brokeTwoId);
  });

  it('promotes the queued debt once the first is settled', () => {
    const { state, brokeOneId, brokeTwoId } = threeWithTwoBroke();
    const withDebt = acknowledge(state);
    // Give the first debtor the cash to settle.
    const funded: GameState = {
      ...withDebt,
      players: {
        ...withDebt.players,
        [brokeOneId]: { ...withDebt.players[brokeOneId], cash: 500 },
      },
    };

    const next = executeGameCommand(
      funded,
      { type: GameCommandType.SettleDebt },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.pendingDecision.type).toBe(PendingDecisionType.AssetLiquidation);
    if (next.pendingDecision.type !== PendingDecisionType.AssetLiquidation) return;
    expect(next.pendingDecision.playerId).toBe(brokeTwoId);
    expect(next.pendingDecision.queued).toHaveLength(0);
  });

  it('pays the collector for every debt in the queue', () => {
    const { state, collectorId, brokeOneId, brokeTwoId } = threeWithTwoBroke();
    const collectorCashBefore = state.players[collectorId].cash;

    let next = acknowledge(state);
    // Fund each debtor in turn and settle.
    [brokeOneId, brokeTwoId].forEach((debtorId) => {
      next = {
        ...next,
        players: {
          ...next.players,
          [debtorId]: { ...next.players[debtorId], cash: 500 },
        },
      };
      next = executeGameCommand(
        next,
        { type: GameCommandType.SettleDebt },
        new SeededRandomSource(3)
      ).nextState;
    });

    expect(next.pendingDecision.type).toBe(PendingDecisionType.None);
    // Both debts reached the collector: 100 each.
    expect(next.players[collectorId].cash).toBe(collectorCashBefore + 200);
  });

  // A player who goes bankrupt is out; the debt behind theirs still stands.
  it('keeps the queue when the first debtor goes bankrupt instead', () => {
    const { state, brokeTwoId } = threeWithTwoBroke();
    const withDebt = acknowledge(state);

    const next = executeGameCommand(
      withDebt,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    ).nextState;

    expect(next.pendingDecision.type).toBe(PendingDecisionType.AssetLiquidation);
    if (next.pendingDecision.type !== PendingDecisionType.AssetLiquidation) return;
    expect(next.pendingDecision.playerId).toBe(brokeTwoId);
  });

  // PayEach runs the other way: one drawer, several payees, and their cash
  // falls with each payment.
  it('queues each payee the drawer cannot cover', () => {
    const game = createBaseGame();
    const [drawerId] = game.playerOrder;
    const thirdId = 'player-3';
    const card: DeckCard = {
      id: 'chance-pay-each',
      deck: CardDeck.Chance,
      title: 'You have been elected chairman',
      description: 'Pay every player.',
      effect: { kind: CardEffectKind.PayEach, amount: 200 },
    };
    const state: GameState = {
      ...game,
      playerOrder: [...game.playerOrder, thirdId],
      players: {
        ...game.players,
        [drawerId]: { ...game.players[drawerId], cash: 50 },
        [thirdId]: {
          ...game.players[game.playerOrder[1]],
          id: thirdId,
          name: 'Meera',
        },
      },
      decks: { ...game.decks, chance: [card] },
      pendingDecision: {
        type: PendingDecisionType.CardDraw,
        playerId: drawerId,
        deck: DeckName.Chance,
        card,
      },
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
    };

    const next = acknowledge(state);

    expect(next.pendingDecision.type).toBe(PendingDecisionType.AssetLiquidation);
    if (next.pendingDecision.type !== PendingDecisionType.AssetLiquidation) return;
    // Both payees are owed, not just the first.
    expect(next.pendingDecision.playerId).toBe(drawerId);
    expect(next.pendingDecision.queued).toHaveLength(1);
  });
});

/**
 * A bankruptcy to the bank returns everything at once, and the printed rule has
 * the bank auction each property. Only one auction can run at a time, so they
 * queue.
 */
describe("auctioning a bankrupt player's property", () => {
  /** Three players; the first owes the bank more than they can ever pay. */
  const brokeToTheBank = (siteCount = 2) => {
    const game = createBaseGame();
    const thirdId = 'player-3';
    const streets = game.board.filter(
      (space): space is StreetSpace => space.kind === SpaceKind.Street
    );
    const owned = streets.slice(0, siteCount);
    const debtorId = game.playerOrder[0];

    const ownership = { ...game.ownership };
    owned.forEach((space) => {
      ownership[space.id] = {
        ownerPlayerId: debtorId,
        mortgaged: false,
        buildLevel: 0,
      };
    });

    return {
      owned,
      debtorId,
      state: {
        ...game,
        playerOrder: [...game.playerOrder, thirdId],
        players: {
          ...game.players,
          [debtorId]: { ...game.players[debtorId], cash: 0 },
          [thirdId]: {
            ...game.players[game.playerOrder[1]],
            id: thirdId,
            name: 'Meera',
          },
        },
        ownership,
        activePlayerIndex: 0,
        pendingDecision: {
          type: PendingDecisionType.AssetLiquidation as const,
          playerId: debtorId,
          amountDue: 99_999,
          // Owed to the bank, which is what sends the property to auction.
          creditorPlayerId: null,
          reason: 'Super Tax',
          queued: [],
        },
        turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
      } as GameState,
    };
  };

  const goBankrupt = (state: GameState) =>
    executeGameCommand(
      state,
      { type: GameCommandType.ConfirmBankruptcy },
      new SeededRandomSource(3)
    ).nextState;

  it('opens an auction for the first site and queues the rest', () => {
    const { state, owned } = brokeToTheBank(2);

    const next = goBankrupt(state);

    expect(next.pendingDecision.type).toBe(PendingDecisionType.AuctionBid);
    expect(next.auctionState?.spaceId).toBe(owned[0].id);
    expect(next.pendingAuctionSpaceIds).toEqual([owned[1].id]);
  });

  it('leaves the sites unowned until somebody wins one', () => {
    const { state, owned } = brokeToTheBank(2);

    const next = goBankrupt(state);

    owned.forEach((space) => {
      expect(next.ownership[space.id].ownerPlayerId).toBeNull();
    });
  });

  it('never invites the bankrupt player to bid', () => {
    const { state, debtorId } = brokeToTheBank(1);

    const next = goBankrupt(state);

    expect(next.auctionState?.activeBidderOrder).not.toContain(debtorId);
  });

  const pass = (state: GameState) =>
    executeGameCommand(
      state,
      { type: GameCommandType.PassAuction },
      new SeededRandomSource(3)
    ).nextState;

  // With two solvent bidders and no bid, one pass leaves a single bidder and
  // nothing bid - so the site goes unsold and the next one comes up.
  it('moves to the next queued site when one auction ends', () => {
    const { state, owned } = brokeToTheBank(2);

    const next = pass(goBankrupt(state));

    expect(next.auctionState?.spaceId).toBe(owned[1].id);
    expect(next.pendingAuctionSpaceIds).toEqual([]);
  });

  it('hands the turn back once every queued site is done', () => {
    const { state } = brokeToTheBank(2);

    const next = pass(pass(goBankrupt(state)));

    expect(next.auctionState).toBeNull();
    expect(next.pendingDecision.type).toBe(PendingDecisionType.None);
    expect(next.pendingAuctionSpaceIds).toEqual([]);
  });

  it('gives a site to the player who bids for it', () => {
    const { state, owned } = brokeToTheBank(1);
    const opened = goBankrupt(state);
    const bidderId = opened.auctionState?.activeBidderOrder[0] as string;
    const cashBefore = opened.players[bidderId].cash;

    const won = pass(
      executeGameCommand(
        opened,
        { type: GameCommandType.SubmitAuctionBid, amount: 60 },
        new SeededRandomSource(3)
      ).nextState
    );

    expect(won.ownership[owned[0].id].ownerPlayerId).toBe(bidderId);
    expect(won.players[bidderId].cash).toBe(cashBefore - 60);
  });

  it('returns the buildings to the bank', () => {
    const { state, owned } = brokeToTheBank(2);
    const withHouses: GameState = {
      ...state,
      ownership: {
        ...state.ownership,
        [owned[0].id]: { ...state.ownership[owned[0].id], buildLevel: 3 },
        [owned[1].id]: {
          ...state.ownership[owned[1].id],
          buildLevel: HOTEL_BUILD_LEVEL,
        },
      },
    };

    const next = goBankrupt(withHouses);

    expect(next.bank.housesAvailable).toBe(state.bank.housesAvailable + 3);
    expect(next.bank.hotelsAvailable).toBe(state.bank.hotelsAvailable + 1);
  });

  // Auctioning to the only player left is theatre, and the game is already over.
  it('holds no auction when the bankruptcy wins the game', () => {
    const game = createBaseGame();
    const debtorId = game.playerOrder[0];
    const street = game.board.find(
      (space): space is StreetSpace => space.kind === SpaceKind.Street
    ) as StreetSpace;

    const twoPlayers: GameState = {
      ...game,
      players: {
        ...game.players,
        [debtorId]: { ...game.players[debtorId], cash: 0 },
      },
      ownership: {
        ...game.ownership,
        [street.id]: { ownerPlayerId: debtorId, mortgaged: false, buildLevel: 0 },
      },
      activePlayerIndex: 0,
      pendingDecision: {
        type: PendingDecisionType.AssetLiquidation,
        playerId: debtorId,
        amountDue: 99_999,
        creditorPlayerId: null,
        reason: 'Super Tax',
        queued: [],
      },
      turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
    };

    const next = goBankrupt(twoPlayers);

    expect(next.status).toBe(GameStatus.Completed);
    expect(next.pendingDecision.type).toBe(PendingDecisionType.GameOver);
    expect(next.pendingAuctionSpaceIds).toEqual([]);
    expect(next.auctionState).toBeNull();
  });

  // A debt still owed by somebody else has to be answered before the bank
  // starts selling.
  it('answers a queued debt before starting an auction', () => {
    const { state, debtorId } = brokeToTheBank(1);
    const otherId = state.playerOrder[1];
    const withQueuedDebt: GameState = {
      ...state,
      players: {
        ...state.players,
        [otherId]: { ...state.players[otherId], cash: 1 },
      },
      pendingDecision: {
        type: PendingDecisionType.AssetLiquidation,
        playerId: debtorId,
        amountDue: 99_999,
        creditorPlayerId: null,
        reason: 'Super Tax',
        queued: [
          {
            playerId: otherId,
            amountDue: 500,
            creditorPlayerId: null,
            reason: 'Super Tax',
          },
        ],
      },
    };

    const next = goBankrupt(withQueuedDebt);

    expect(next.pendingDecision.type).toBe(PendingDecisionType.AssetLiquidation);
    expect(next.auctionState).toBeNull();
    // The site is still waiting to be sold.
    expect(next.pendingAuctionSpaceIds).toHaveLength(1);
  });
});

/**
 * The printed rule: when the bank cannot satisfy everyone who could build, the
 * last buildings go to auction rather than to whoever asked first.
 */
describe("a run on the bank's buildings", () => {
  /** Two players who each own a complete colour set, and a scarce bank. */
  const twoBuilders = (housesAvailable: number) => {
    const game = createBaseGame();
    const [first, second] = game.playerOrder;
    const streets = game.board.filter(
      (space): space is StreetSpace => space.kind === SpaceKind.Street
    );
    const brown = streets.filter((space) => space.colorGroup === ColorGroup.Brown);
    const lightBlue = streets.filter(
      (space) => space.colorGroup === ColorGroup.LightBlue
    );

    const ownership = { ...game.ownership };
    brown.forEach((space) => {
      ownership[space.id] = { ownerPlayerId: first, mortgaged: false, buildLevel: 0 };
    });
    lightBlue.forEach((space) => {
      ownership[space.id] = { ownerPlayerId: second, mortgaged: false, buildLevel: 0 };
    });

    return {
      firstSite: brown[0],
      secondSite: lightBlue[0],
      first,
      second,
      state: {
        ...game,
        ownership,
        bank: { ...game.bank, housesAvailable },
        players: {
          ...game.players,
          [first]: { ...game.players[first], cash: 5000 },
          [second]: { ...game.players[second], cash: 5000 },
        },
        turn: { ...game.turn, phase: TurnPhase.TurnComplete },
      } as GameState,
    };
  };

  const build = (state: GameState, spaceId: string) =>
    executeGameCommand(
      state,
      { type: GameCommandType.BuildHouse, spaceId },
      new SeededRandomSource(3)
    ).nextState;

  it('builds normally while the bank has plenty', () => {
    const { state, firstSite } = twoBuilders(32);

    const next = build(state, firstSite.id);

    expect(next.ownership[firstSite.id].buildLevel).toBe(1);
    expect(next.auctionState).toBeNull();
  });

  // One house, two players who could use it: that is the contention the rule
  // is about.
  it('sends the last house to auction', () => {
    const { state, firstSite } = twoBuilders(1);

    const next = build(state, firstSite.id);

    expect(next.pendingDecision.type).toBe(PendingDecisionType.AuctionBid);
    expect(next.auctionState?.buildingKind).toBe(BuildingKind.House);
    // Nothing was built and nothing was paid yet.
    expect(next.ownership[firstSite.id].buildLevel).toBe(0);
    expect(next.players[state.playerOrder[0]].cash).toBe(5000);
  });

  it('opens the bidding at the printed cost of the house', () => {
    const { state, firstSite } = twoBuilders(1);

    const next = build(state, firstSite.id);

    expect(next.auctionState?.startPrice).toBe(firstSite.houseCost);
  });

  it('invites only the players who could actually build', () => {
    const { state, firstSite, first, second } = twoBuilders(1);

    const next = build(state, firstSite.id);

    expect(next.auctionState?.activeBidderOrder).toEqual(
      expect.arrayContaining([first, second])
    );
    expect(next.auctionState?.activeBidderOrder).toHaveLength(2);
  });

  // No contention when only one player could build, however low the stock.
  it('builds normally when nobody else could use the house', () => {
    const game = createBaseGame();
    const [first] = game.playerOrder;
    const brown = game.board.filter(
      (space): space is StreetSpace =>
        space.kind === SpaceKind.Street && space.colorGroup === ColorGroup.Brown
    );
    const ownership = { ...game.ownership };
    brown.forEach((space) => {
      ownership[space.id] = { ownerPlayerId: first, mortgaged: false, buildLevel: 0 };
    });
    const soleBuilder: GameState = {
      ...game,
      ownership,
      bank: { ...game.bank, housesAvailable: 1 },
      players: { ...game.players, [first]: { ...game.players[first], cash: 5000 } },
      turn: { ...game.turn, phase: TurnPhase.TurnComplete },
    };

    const next = build(soleBuilder, brown[0].id);

    expect(next.ownership[brown[0].id].buildLevel).toBe(1);
    expect(next.auctionState).toBeNull();
  });

  it('refuses outright when the bank has none left', () => {
    const { state, firstSite } = twoBuilders(0);

    expect(() => build(state, firstSite.id)).toThrow(/no houses left/i);
  });

  it('asks the winner where the house goes, and takes their bid', () => {
    const { state, firstSite } = twoBuilders(1);
    const auctioned = build(state, firstSite.id);
    const bidderId = auctioned.auctionState?.activeBidderOrder[0] as string;
    const cashBefore = auctioned.players[bidderId].cash;

    const won = executeGameCommand(
      executeGameCommand(
        auctioned,
        { type: GameCommandType.SubmitAuctionBid, amount: 90 },
        new SeededRandomSource(3)
      ).nextState,
      { type: GameCommandType.PassAuction },
      new SeededRandomSource(3)
    ).nextState;

    expect(won.pendingDecision.type).toBe(PendingDecisionType.BuildingPlacement);
    expect(won.players[bidderId].cash).toBe(cashBefore - 90);
    // Still nothing built until they say where.
    expect(won.bank.housesAvailable).toBe(1);
  });

  it('places the house where the winner chooses', () => {
    const { state, firstSite } = twoBuilders(1);
    const auctioned = build(state, firstSite.id);
    const bidderId = auctioned.auctionState?.activeBidderOrder[0] as string;

    let next = executeGameCommand(
      auctioned,
      { type: GameCommandType.SubmitAuctionBid, amount: 90 },
      new SeededRandomSource(3)
    ).nextState;
    next = executeGameCommand(
      next,
      { type: GameCommandType.PassAuction },
      new SeededRandomSource(3)
    ).nextState;

    const decision = next.pendingDecision;
    if (decision.type !== PendingDecisionType.BuildingPlacement) {
      throw new Error('Expected a placement decision');
    }
    const site = getPlacementSites(next, bidderId, BuildingKind.House)[0];

    const placed = executeGameCommand(
      next,
      { type: GameCommandType.ChooseBuildingSite, spaceId: site.spaceId },
      new SeededRandomSource(3)
    ).nextState;

    expect(placed.ownership[site.spaceId].buildLevel).toBe(1);
    expect(placed.bank.housesAvailable).toBe(0);
    expect(placed.pendingDecision.type).toBe(PendingDecisionType.None);
  });

  it('refuses a site the even rule does not allow', () => {
    const { state, firstSite } = twoBuilders(1);
    const auctioned = build(state, firstSite.id);

    let next = executeGameCommand(
      auctioned,
      { type: GameCommandType.SubmitAuctionBid, amount: 90 },
      new SeededRandomSource(3)
    ).nextState;
    next = executeGameCommand(
      next,
      { type: GameCommandType.PassAuction },
      new SeededRandomSource(3)
    ).nextState;

    expect(() =>
      executeGameCommand(
        next,
        { type: GameCommandType.ChooseBuildingSite, spaceId: state.board[0].id },
        new SeededRandomSource(3)
      )
    ).toThrow(/cannot take this building/i);
  });
});

/**
 * Jail, and the way doubles behave around it.
 *
 * Section 6 of the ruleset, plus the doubles cases that only arise in Jail.
 * These are the edge cases players hit most and the ones easiest to get wrong -
 * a double that frees you does NOT also earn you another roll.
 *
 * Seed 11 rolls 2 and 2 (a double); seed 1 rolls 2 and 3 (not).
 */
describe('Jail', () => {
  const DOUBLE = () => new SeededRandomSource(11);
  const NOT_DOUBLE = () => new SeededRandomSource(1);

  /** The active player, in Jail, at the start of their turn. */
  const jailed = (overrides: Partial<GameState['players'][string]> = {}) => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    return {
      playerId,
      state: {
        ...game,
        players: {
          ...game.players,
          [playerId]: {
            ...game.players[playerId],
            inJail: true,
            position: JAIL_POSITION,
            jailTurnsServed: 0,
            ...overrides,
          },
        },
        pendingDecision: { type: PendingDecisionType.JailChoice, playerId },
        turn: { ...game.turn, phase: TurnPhase.AwaitRoll },
      } as GameState,
    };
  };

  // 6.8 / 5.8: rolling a double frees you and moves you by it - and the turn
  // ends there. The double earns no extra roll, which is the trap.
  it('frees a player who rolls doubles, and ends their turn', () => {
    const { state, playerId } = jailed();

    const next = executeGameCommand(
      state,
      { type: GameCommandType.AttemptJailRoll },
      DOUBLE()
    ).nextState;

    expect(next.players[playerId].inJail).toBe(false);
    expect(next.players[playerId].position).toBe(JAIL_POSITION + 4);
    // No extra roll for the double, and no doubles credit to restore one from
    // later - which is what "the turn ends" means here. The phase itself may be
    // await_decision, because square 14 is an unowned street and asks to be
    // bought; that decision is the turn's last act, not another roll.
    expect(next.turn.canRollAgain).toBe(false);
    expect(next.turn.doublesCount).toBe(0);
  });

  // 5.9: a double rolled in Jail is not one of the three that jails you.
  it('does not count a Jail double toward the three-doubles rule', () => {
    const { state } = jailed();

    const next = executeGameCommand(
      state,
      { type: GameCommandType.AttemptJailRoll },
      DOUBLE()
    ).nextState;

    expect(next.turn.doublesCount).toBe(0);
  });

  // 6.12: turns one and two end with the player still inside.
  it('keeps a player in Jail when the roll is not doubles', () => {
    const { state, playerId } = jailed();

    const next = executeGameCommand(
      state,
      { type: GameCommandType.AttemptJailRoll },
      NOT_DOUBLE()
    ).nextState;

    expect(next.players[playerId].inJail).toBe(true);
    expect(next.players[playerId].jailTurnsServed).toBe(1);
    expect(next.players[playerId].position).toBe(JAIL_POSITION);
    expect(next.turn.phase).toBe(TurnPhase.TurnComplete);
  });

  // 6.10 / 6.11: the third failure is not another wasted turn - the fine is
  // charged, the player moves by that same roll, and gets no extra roll for it.
  it('charges the fine on the third failed attempt and moves by that roll', () => {
    const { state, playerId } = jailed({ jailTurnsServed: MAX_JAIL_TURNS - 1 });
    const cashBefore = state.players[playerId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.AttemptJailRoll },
      NOT_DOUBLE()
    ).nextState;

    expect(next.players[playerId].inJail).toBe(false);
    expect(next.players[playerId].cash).toBeLessThanOrEqual(cashBefore - JAIL_FINE);
    // 2 and 3 from the seed, moving them off square 10.
    expect(next.players[playerId].position).toBe(JAIL_POSITION + 5);
  });

  it('grants no extra roll on the forced third-turn move, even on doubles', () => {
    const { state } = jailed({ jailTurnsServed: MAX_JAIL_TURNS - 1 });

    const next = executeGameCommand(
      state,
      { type: GameCommandType.AttemptJailRoll },
      DOUBLE()
    ).nextState;

    expect(next.turn.canRollAgain).toBe(false);
  });

  // 6.6: paying up front is not a wasted turn either - you roll and move as
  // normal afterwards.
  it('lets a player who pays the fine roll and move normally', () => {
    const { state, playerId } = jailed();
    const cashBefore = state.players[playerId].cash;

    const paid = executeGameCommand(
      state,
      { type: GameCommandType.PayJailFine },
      NOT_DOUBLE()
    ).nextState;

    expect(paid.players[playerId].inJail).toBe(false);
    expect(paid.players[playerId].cash).toBe(cashBefore - JAIL_FINE);
    expect(paid.turn.phase).toBe(TurnPhase.AwaitRoll);

    const rolled = executeGameCommand(
      paid,
      { type: GameCommandType.RollTurnDice },
      NOT_DOUBLE()
    ).nextState;
    expect(rolled.players[playerId].position).toBe(JAIL_POSITION + 5);
  });

  // 5.10: once out, a double is an ordinary double again.
  it('grants an extra roll for doubles rolled after paying the fine', () => {
    const { state } = jailed();
    const paid = executeGameCommand(
      state,
      { type: GameCommandType.PayJailFine },
      NOT_DOUBLE()
    ).nextState;

    const rolled = executeGameCommand(
      paid,
      { type: GameCommandType.RollTurnDice },
      DOUBLE()
    ).nextState;

    // The double counted, unlike one rolled from inside Jail.
    expect(rolled.turn.doublesCount).toBe(1);

    // Square 14 is an unowned street, so the roll is held behind the buy
    // decision rather than granted immediately - rule 5.7. Answering it is what
    // hands the roll over, restored from doublesCount.
    expect(rolled.pendingDecision.type).toBe(PendingDecisionType.LandedUnownedProperty);
    const answered = executeGameCommand(
      rolled,
      { type: GameCommandType.DeclineLandedAsset },
      NOT_DOUBLE()
    ).nextState;
    const settled = answered.playerOrder.reduce(
      (state) =>
        state.pendingDecision.type === PendingDecisionType.AuctionBid
          ? executeGameCommand(state, { type: GameCommandType.PassAuction }, NOT_DOUBLE())
              .nextState
          : state,
      answered
    );
    expect(settled.turn.canRollAgain).toBe(true);
  });

  // 6.1 / 6.4 / 7.11: the space sends you there, and crossing GO on the way
  // pays nothing.
  it('sends a player who lands on Go To Jail there, with no GO salary', () => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const goToJailIndex = game.board.findIndex(
      (space) => space.kind === SpaceKind.GoToJail
    );
    const state: GameState = {
      ...game,
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: goToJailIndex - 5 },
      },
    };
    const cashBefore = state.players[playerId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      NOT_DOUBLE()
    ).nextState;

    expect(next.players[playerId].position).toBe(JAIL_POSITION);
    expect(next.players[playerId].inJail).toBe(true);
    expect(next.players[playerId].cash).toBe(cashBefore);
    expect(next.turn.phase).toBe(TurnPhase.TurnComplete);
  });

  // 6.5 / 7.10: the corner opposite is not Jail.
  it('does nothing at all when a player lands on Just Visiting', () => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const state: GameState = {
      ...game,
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: JAIL_POSITION - 5 },
      },
    };
    const cashBefore = state.players[playerId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      NOT_DOUBLE()
    ).nextState;

    expect(next.players[playerId].position).toBe(JAIL_POSITION);
    expect(next.players[playerId].inJail).toBe(false);
    expect(next.players[playerId].cash).toBe(cashBefore);
    expect(next.pendingDecision.type).toBe(PendingDecisionType.None);
  });

  // 5.11: they are out of the game, so there is nothing to take another roll
  // with, whatever the dice said.
  it('leaves a bankrupt player no extra roll, even after doubles', () => {
    const game = createBaseGame();
    const [debtorId, creditorId] = game.playerOrder;
    const state: GameState = {
      ...game,
      players: {
        ...game.players,
        [debtorId]: { ...game.players[debtorId], cash: 0 },
      },
      activePlayerIndex: 0,
      // A double already rolled, then a debt they cannot pay.
      pendingDecision: {
        type: PendingDecisionType.AssetLiquidation,
        playerId: debtorId,
        amountDue: 99_999,
        creditorPlayerId: creditorId,
        reason: 'rent',
        queued: [],
      },
      turn: { ...game.turn, doublesCount: 1, phase: TurnPhase.AwaitDecision },
    };

    const next = executeGameCommand(
      state,
      { type: GameCommandType.ConfirmBankruptcy },
      DOUBLE()
    ).nextState;

    expect(next.players[debtorId].isBankrupt).toBe(true);
    expect(next.turn.canRollAgain).toBe(false);
  });
});

/**
 * What each kind of space does when you land on it, and what rent it asks for.
 *
 * Sections 7 and its Rent subsection. The two tax squares and the three spaces
 * that do nothing had never been asserted - "nothing happens" is exactly the
 * kind of rule that quietly stops being true.
 */
describe('landing on a space', () => {
  const NOT_DOUBLE = () => new SeededRandomSource(1);

  /**
   * Puts the active player `steps` back from `index` and rolls exactly that far.
   *
   * `steps` matters: Income Tax sits at 4, so a five-step approach would have to
   * start at 39 and wrap past GO - and the ₹200 salary would exactly cancel the
   * ₹200 tax, making the assertion pass for the wrong reason. Seed 1 rolls 2 and
   * 3 (five); seed 8 rolls 2 and 1 (three).
   */
  const landOn = (
    index: number,
    steps = 5,
    seed = () => new SeededRandomSource(steps === 3 ? 8 : 1)
  ) => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const state: GameState = {
      ...game,
      players: {
        ...game.players,
        [playerId]: {
          ...game.players[playerId],
          position: (index - steps + game.board.length) % game.board.length,
        },
      },
    };
    return {
      playerId,
      cashBefore: state.players[playerId].cash,
      state,
      next: executeGameCommand(state, { type: GameCommandType.RollTurnDice }, seed())
        .nextState,
    };
  };

  const indexOfKind = (kind: SpaceKind, skip = 0) => {
    const board = createBaseGame().board;
    return board.filter((space) => space.kind === kind)[skip].index;
  };

  // 7.5 / 2.5: a flat ₹200, not the printed game's 10%-of-worth option.
  it('charges a flat Income Tax', () => {
    const incomeTaxIndex = createBaseGame().board.findIndex(
      (space) => space.kind === SpaceKind.Tax && space.name.includes('Income')
    );
    // Three steps from index 1, so the approach never crosses GO.
    const { next, playerId, cashBefore, state } = landOn(incomeTaxIndex, 3);
    const space = state.board[incomeTaxIndex];
    if (space.kind !== SpaceKind.Tax) throw new Error('Expected a tax square');

    expect(next.players[playerId].position).toBe(incomeTaxIndex);
    expect(space.amount).toBe(200);
    expect(next.players[playerId].cash).toBe(cashBefore - 200);
  });

  // 7.6
  it('charges Super Tax', () => {
    const superTaxIndex = createBaseGame().board.findIndex(
      (space) => space.kind === SpaceKind.Tax && space.name.includes('Super')
    );
    const { next, playerId, cashBefore, state } = landOn(superTaxIndex);
    const space = state.board[superTaxIndex];
    if (space.kind !== SpaceKind.Tax) throw new Error('Expected a tax square');

    expect(space.amount).toBe(100);
    expect(next.players[playerId].cash).toBe(cashBefore - 100);
  });

  // 7.9 / 2.4: the jackpot is a house rule, and this is not it.
  it('pays nothing at all for Free Parking', () => {
    const { next, playerId, cashBefore } = landOn(indexOfKind(SpaceKind.FreeParking));

    expect(next.players[playerId].position).toBe(indexOfKind(SpaceKind.FreeParking));
    expect(next.players[playerId].cash).toBe(cashBefore);
    expect(next.pendingDecision.type).toBe(PendingDecisionType.None);
  });

  // 7.4: your own site asks nothing of you.
  it('does nothing when a player lands on their own site', () => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const street = game.board.find(
      (space): space is StreetSpace => space.kind === SpaceKind.Street && space.index > 5
    ) as StreetSpace;
    const state: GameState = {
      ...game,
      ownership: {
        ...game.ownership,
        [street.id]: { ownerPlayerId: playerId, mortgaged: false, buildLevel: 0 },
      },
      players: {
        ...game.players,
        [playerId]: { ...game.players[playerId], position: street.index - 5 },
      },
    };
    const cashBefore = state.players[playerId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      NOT_DOUBLE()
    ).nextState;

    expect(next.players[playerId].position).toBe(street.index);
    expect(next.players[playerId].cash).toBe(cashBefore);
    expect(next.pendingDecision.type).toBe(PendingDecisionType.None);
  });
});

/**
 * Rent, by the kind of thing being landed on.
 *
 * Only street rent was covered. A railway's rent comes off how many the owner
 * holds and a utility's off the dice, so neither is exercised by a street test.
 */
describe('rent', () => {
  /** Sends the visitor onto `space`, owned by the opponent, and returns the rent. */
  const rentPaidOn = (
    ownedIndices: number[],
    landingIndex: number,
    seed = () => new SeededRandomSource(1)
  ) => {
    const game = createBaseGame();
    const [visitorId, ownerId] = game.playerOrder;
    const ownership = { ...game.ownership };
    ownedIndices.forEach((index) => {
      ownership[game.board[index].id] = {
        ownerPlayerId: ownerId,
        mortgaged: false,
        buildLevel: 0,
      };
    });
    const state: GameState = {
      ...game,
      ownership,
      activePlayerIndex: game.playerOrder.indexOf(visitorId),
      players: {
        ...game.players,
        [visitorId]: { ...game.players[visitorId], position: landingIndex - 5 },
      },
    };
    const cashBefore = state.players[visitorId].cash;
    const next = executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      seed()
    ).nextState;

    expect(next.players[visitorId].position).toBe(landingIndex);
    return { paid: cashBefore - next.players[visitorId].cash, next, visitorId };
  };

  const railwayIndices = () =>
    createBaseGame()
      .board.filter((space) => space.kind === SpaceKind.Railway)
      .map((space) => space.index);

  // 7r.4: ₹25 / ₹50 / ₹100 / ₹200 by how many the owner holds.
  it.each([
    [1, RAILWAY_RENT_BY_COUNT[0]],
    [2, RAILWAY_RENT_BY_COUNT[1]],
    [3, RAILWAY_RENT_BY_COUNT[2]],
    [4, RAILWAY_RENT_BY_COUNT[3]],
  ])('charges railway rent for %i stations owned', (owned, expected) => {
    const stations = railwayIndices();
    const { paid } = rentPaidOn(stations.slice(0, owned), stations[0]);

    expect(paid).toBe(expected);
  });

  // 7r.5: 4x the dice with one, 10x with both.
  it('charges four times the dice for one utility', () => {
    const utilities = createBaseGame()
      .board.filter((space) => space.kind === SpaceKind.Utility)
      .map((space) => space.index);

    const { paid } = rentPaidOn([utilities[0]], utilities[0]);

    // Seed 1 rolls 2 and 3.
    expect(paid).toBe(5 * 4);
  });

  it('charges ten times the dice for both utilities', () => {
    const utilities = createBaseGame()
      .board.filter((space) => space.kind === SpaceKind.Utility)
      .map((space) => space.index);

    const { paid } = rentPaidOn(utilities, utilities[0]);

    expect(paid).toBe(5 * 10);
  });

  // 7r.6: the whole point of mortgaging is that it stops earning.
  it('charges nothing on a mortgaged property', () => {
    const game = createBaseGame();
    const [visitorId, ownerId] = game.playerOrder;
    const street = game.board.find(
      (space): space is StreetSpace => space.kind === SpaceKind.Street && space.index > 5
    ) as StreetSpace;
    const state: GameState = {
      ...game,
      ownership: {
        ...game.ownership,
        [street.id]: { ownerPlayerId: ownerId, mortgaged: true, buildLevel: 0 },
      },
      activePlayerIndex: game.playerOrder.indexOf(visitorId),
      players: {
        ...game.players,
        [visitorId]: { ...game.players[visitorId], position: street.index - 5 },
      },
    };
    const cashBefore = state.players[visitorId].cash;

    const next = executeGameCommand(
      state,
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(1)
    ).nextState;

    expect(next.players[visitorId].position).toBe(street.index);
    expect(next.players[visitorId].cash).toBe(cashBefore);
  });
});

/**
 * The card effects that had no test of their own.
 *
 * Section 14. Collect, GoToJail, JailFree and both *Each effects were covered;
 * Pay and MoveTo were not, and nor was a forward card move crossing GO.
 */
describe('card effects', () => {
  /** Puts a made-up card on top of Chance and stops at its decision. */
  const drawn = (effect: DeckCard['effect'], position = 0) => {
    const game = createBaseGame();
    const playerId = game.playerOrder[game.activePlayerIndex];
    const card: DeckCard = {
      id: 'test-card',
      deck: CardDeck.Chance,
      title: 'Test card',
      description: 'For the test.',
      effect,
    };
    return {
      playerId,
      card,
      state: {
        ...game,
        players: {
          ...game.players,
          [playerId]: { ...game.players[playerId], position },
        },
        decks: { ...game.decks, chance: [card] },
        pendingDecision: {
          type: PendingDecisionType.CardDraw as const,
          playerId,
          deck: DeckName.Chance,
          card,
        },
        turn: { ...game.turn, phase: TurnPhase.AwaitDecision },
      } as GameState,
    };
  };

  const acknowledge = (state: GameState) =>
    executeGameCommand(
      state,
      { type: GameCommandType.AcknowledgeCard },
      new SeededRandomSource(3)
    ).nextState;

  // 14.2
  it('applies a Pay effect, charging the bank', () => {
    const { state, playerId } = drawn({ kind: CardEffectKind.Pay, amount: 150 });
    const cashBefore = state.players[playerId].cash;

    const next = acknowledge(state);

    expect(next.players[playerId].cash).toBe(cashBefore - 150);
    expect(next.history[0].message).toMatch(/paid/i);
  });

  // 14.3: an absolute move, and the card says whether GO pays.
  it('applies a MoveTo effect, advancing to the named index', () => {
    const { state, playerId } = drawn(
      { kind: CardEffectKind.MoveTo, index: 24, collectGo: false },
      5
    );

    const next = acknowledge(state);

    expect(next.players[playerId].position).toBe(24);
  });

  // 14.11: forwards past GO pays, when the card says so.
  it('pays the GO salary when a card moves the player forwards past GO', () => {
    const { state, playerId } = drawn(
      { kind: CardEffectKind.MoveTo, index: 1, collectGo: true },
      35
    );
    const cashBefore = state.players[playerId].cash;

    const next = acknowledge(state);

    expect(next.players[playerId].position).toBe(1);
    expect(next.players[playerId].cash).toBe(cashBefore + PASS_GO_AMOUNT);
    expect(next.history.some((event) => /passing GO/i.test(event.message))).toBe(true);
  });

  // 14.13: exactly as if they had rolled there.
  it('offers an unowned property a card landed the player on', () => {
    const game = createBaseGame();
    const street = game.board.find(
      (space): space is StreetSpace => space.kind === SpaceKind.Street && space.index > 5
    ) as StreetSpace;
    const { state } = drawn(
      { kind: CardEffectKind.MoveTo, index: street.index, collectGo: false },
      1
    );

    const next = acknowledge(state);

    expect(next.pendingDecision.type).toBe(PendingDecisionType.LandedUnownedProperty);
  });
});

/**
 * The bank, and the things the game deliberately does not let you do.
 *
 * Sections 15 and 16, plus the "you cannot" rules from sections 9 and 10. Some
 * of these are proved by the absence of a command rather than by behaviour,
 * which is worth asserting explicitly: an absence is easy to fill in by
 * accident.
 */
describe('the bank', () => {
  // 15.1
  it('never runs out of money', () => {
    const game = createBaseGame();

    expect(game.bank.cash).toBe('unlimited');

    // Paying the bank does not reduce anything on the bank, because there is
    // nothing there to reduce.
    const taxIndex = game.board.findIndex((space) => space.kind === SpaceKind.Tax);
    const playerId = game.playerOrder[game.activePlayerIndex];
    const next = executeGameCommand(
      {
        ...game,
        players: {
          ...game.players,
          [playerId]: { ...game.players[playerId], position: taxIndex - 3 },
        },
      },
      { type: GameCommandType.RollTurnDice },
      new SeededRandomSource(8)
    ).nextState;

    expect(next.bank.cash).toBe('unlimited');
  });

  // Q3.1 / 9.6 / 10.5 / 15.4: there is no command that sells a property to the
  // bank, and that is the rule. Asserted against the command enum so adding one
  // has to be a deliberate decision that breaks this test.
  it('never buys a property back, at any price', () => {
    const commands = Object.values(GameCommandType);

    expect(commands.filter((command) => /sell/i.test(command))).toEqual([
      GameCommandType.SellHouse,
      GameCommandType.SellHotel,
    ]);
  });

  // Q3.2 / 10.4: an auction is only ever the bank's forced sale of a declined
  // property, so there is no command a player can use to auction their own.
  it('offers no way to auction a property you own', () => {
    const commands = Object.values(GameCommandType);

    expect(commands.filter((command) => /auction/i.test(command))).toEqual([
      GameCommandType.SubmitAuctionBid,
      GameCommandType.PassAuction,
    ]);
  });

  // 8.12: the only sell commands take a spaceId and pay the bank, so a building
  // cannot move to another player. Trading moves sites, never what is on them.
  it('buys buildings back, but only from their owner', () => {
    const game = createBaseGame();
    const trade = {
      proposerPlayerId: game.playerOrder[0],
      recipientPlayerId: game.playerOrder[1],
      offeredCash: 0,
      requestedCash: 0,
      offeredSpaceIds: [],
      requestedSpaceIds: [],
      offeredJailCards: 0,
      requestedJailCards: 0,
    };

    // A trade has no field for buildings at all - they are not tradeable.
    expect(Object.keys(trade)).not.toContain('offeredBuildings');
    expect(Object.keys(trade)).not.toContain('requestedBuildings');
  });
});

describe('turn order', () => {
  // 16.1: fixed at setup, and play passes along it.
  it('passes play along the order fixed at setup', () => {
    const game = createBaseGame();
    const order = [...game.playerOrder];

    const ended = executeGameCommand(
      {
        ...game,
        turn: { ...game.turn, phase: TurnPhase.TurnComplete, canRollAgain: false },
      },
      { type: GameCommandType.EndTurn },
      new SeededRandomSource(3)
    ).nextState;

    expect(ended.playerOrder).toEqual(order);
    expect(ended.activePlayerIndex).toBe(1);
  });
});

/**
 * Setup, beyond the defaults already covered.
 *
 * Section 3: where tokens come from, where everyone starts, that the decks are
 * shuffled, and that the turn order is rolled for rather than taken as given.
 */
describe('setting up a game', () => {
  // 3.3
  it('gives every player a token from the theme catalogue', () => {
    const game = createBaseGame();
    const catalogue = indiaEditionTheme.tokenCatalog.map((token) => token.id);

    game.playerOrder.forEach((playerId) => {
      expect(catalogue).toContain(game.players[playerId].tokenId);
    });
  });

  // 3.4
  it('starts every token on GO', () => {
    const game = createBaseGame();

    game.playerOrder.forEach((playerId) => {
      expect(game.players[playerId].position).toBe(GO_POSITION);
    });
  });

  // 3.5: shuffled once, at creation - not re-shuffled per draw.
  it('shuffles both decks at creation', () => {
    const shuffled = createGameState(
      {
        name: 'Shuffle',
        playerConfigs: [
          { name: 'Asha', tokenId: 'elephant' },
          { name: 'Vikram', tokenId: 'train' },
        ],
        themeId: 'india-edition',
        createdAt: '2026-08-29T00:00:00.000Z',
      },
      new SeededRandomSource(4)
    );

    expect(shuffled.decks.chance).toHaveLength(chanceCards.length);
    expect(shuffled.decks.communityChest).toHaveLength(communityChestCards.length);
    // Same cards, and for this seed not in the order they were declared.
    expect([...shuffled.decks.chance].map((card) => card.id).sort()).toEqual(
      chanceCards.map((card) => card.id).sort()
    );
    expect(shuffled.decks.chance.map((card) => card.id)).not.toEqual(
      chanceCards.map((card) => card.id)
    );
  });

  // 3.6: the order comes from a simulated opening roll, so it varies by seed
  // rather than being the order the players were entered in.
  it('decides the turn order by a simulated opening roll', () => {
    const configs = [
      { name: 'Asha', tokenId: 'elephant' },
      { name: 'Vikram', tokenId: 'train' },
      { name: 'Meera', tokenId: 'rickshaw' },
    ];
    const orderFor = (seed: number) =>
      createGameState(
        {
          name: 'Order',
          playerConfigs: configs,
          themeId: 'india-edition',
          createdAt: '2026-08-29T00:00:00.000Z',
        },
        new SeededRandomSource(seed)
      );

    const first = orderFor(2);
    // Every player is in the order, exactly once, whatever the roll said.
    expect([...first.playerOrder].sort()).toEqual(Object.keys(first.players).sort());
    // And the order is the roll's, not the order they were entered in: at least
    // one seed disagrees with the entry order.
    const names = (game: GameState) =>
      game.playerOrder.map((id) => game.players[id].name);
    const seeds = [1, 2, 3, 5, 7, 11, 13].map((seed) => names(orderFor(seed)).join(','));
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });
});
