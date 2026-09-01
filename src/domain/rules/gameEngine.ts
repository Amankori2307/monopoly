import { communityChestCards, chanceCards } from '../cards/indiaEditionCards';
import { indiaEditionBoard, indiaEditionRulesetId } from '../board/indiaEditionBoard';
import { availableThemes, indiaEditionTheme } from '../themes/indiaEditionTheme';
import {
  AUCTION_MIN_INCREMENT,
  AUCTION_START_PRICE,
  DOUBLES_BEFORE_JAIL,
  GAME_STATE_VERSION,
  HOTEL_BUILD_LEVEL,
  MAX_HOUSES_PER_SITE,
  HOTELS_AVAILABLE,
  SPEED_DIE_BONUS_CASH,
  HOUSES_AVAILABLE,
  JAIL_FINE,
  MORTGAGE_INTEREST_PERCENT,
  JAIL_POSITION,
  MAX_HISTORY_EVENTS,
  MAX_JAIL_TURNS,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../constants/game.constants';
import {
  CardEffectKind,
  CardDeck,
  DeckName,
  GameCommandType,
  GameStatus,
  PendingDecisionType,
  SpeedDieFace,
  SpaceKind,
  TurnPhase,
} from '../types/game.enums';
import type {
  AuctionState,
  BoardSpace,
  CreateGameInput,
  DeckCard,
  GameCommandResult,
  GameEvent,
  GameState,
  DebtRecord,
  OwnableSpace,
  OwnershipState,
  PlayerId,
  PendingDecision,
  PlayerState,
  RuntimeGameCommand,
  SpaceId,
  StreetSpace,
  ThemeConfig,
  TradeState,
} from '../types/game.interfaces';
import {
  getPlayerOwnedSpaces,
  groupHasBuildings,
  isOwnedBy,
  ownsEntireColorSet,
} from './holdings.utils';
import {
  acceptanceBlockedReason,
  getTransferFees,
  proposalBlockedReason,
} from './trade.utils';
import {
  buildBlockedReason,
  getBuildLevel,
  getLiquidationValue,
  getSaleRefund,
  sellBlockedReason,
} from './buildings.utils';
import { isOwnableSpace, isStreetSpace } from './space.utils';
import {
  isSpeedDieActive,
  isTriple,
  rollSpeedDie,
  speedDieSteps,
} from './speedDie.utils';
import { DefaultRandomSource, rollDie, shuffle, type RandomSource } from './rng';

const createEvent = (turnNumber: number, message: string): GameEvent => ({
  id: crypto.randomUUID(),
  turnNumber,
  createdAt: new Date().toISOString(),
  message,
});

/**
 * Money as it appears in an event message. Every amount the engine logs goes
 * through here, so the symbol follows the active theme rather than being
 * written into the sentence.
 */
const money = (state: GameState, amount: number): string =>
  `${getThemeOrDefault(state.themeId).currencySymbol}${amount}`;

const getThemeOrDefault = (themeId: string): ThemeConfig =>
  availableThemes.find((theme) => theme.id === themeId) ?? indiaEditionTheme;

const createOwnershipMap = (board: BoardSpace[]): Record<string, OwnershipState> =>
  board.reduce<Record<string, OwnershipState>>((accumulator, space) => {
    if (isOwnableSpace(space)) {
      accumulator[space.id] = {
        ownerPlayerId: null,
        mortgaged: false,
        buildLevel: 0,
      };
    }
    return accumulator;
  }, {});

const chooseFirstPlayerOrder = (
  playerIds: PlayerId[],
  randomSource: RandomSource
): PlayerId[] => {
  const scores = playerIds.map((playerId) => ({
    playerId,
    score: rollDie(randomSource) + rollDie(randomSource),
  }));

  return scores
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.playerId);
};

const createPlayers = (input: CreateGameInput): Record<PlayerId, PlayerState> =>
  input.playerConfigs.reduce<Record<PlayerId, PlayerState>>(
    (accumulator, playerConfig, index) => {
      const playerId = `player-${index + 1}`;
      accumulator[playerId] = {
        id: playerId,
        name: playerConfig.name,
        tokenId: playerConfig.tokenId,
        cash: STARTING_CASH + (input.useSpeedDie ? SPEED_DIE_BONUS_CASH : 0),
        position: 0,
        inJail: false,
        jailTurnsServed: 0,
        jailFreeCards: [],
        hasPassedGo: false,
        isBankrupt: false,
        bankruptcyRank: null,
      };
      return accumulator;
    },
    {}
  );

const getPlayerById = (state: GameState, playerId: PlayerId): PlayerState =>
  state.players[playerId];

const getActivePlayer = (state: GameState): PlayerState =>
  state.players[state.playerOrder[state.activePlayerIndex]];

const updatePlayer = (
  state: GameState,
  playerId: PlayerId,
  updater: (player: PlayerState) => PlayerState
): GameState => ({
  ...state,
  players: {
    ...state.players,
    [playerId]: updater(state.players[playerId]),
  },
});

const updateSpaceOwnership = (
  state: GameState,
  spaceId: string,
  updater: (ownership: OwnershipState) => OwnershipState
): GameState => ({
  ...state,
  ownership: {
    ...state.ownership,
    [spaceId]: updater(state.ownership[spaceId]),
  },
});

const appendEvents = (state: GameState, events: GameEvent[]): GameState => ({
  ...state,
  updatedAt: new Date().toISOString(),
  history: [...events, ...state.history].slice(0, MAX_HISTORY_EVENTS),
});

const getSpaceById = (state: GameState, spaceId: string): BoardSpace => {
  const space = state.board.find((boardSpace) => boardSpace.id === spaceId);
  if (!space) {
    throw new Error(`Unknown space ${spaceId}`);
  }
  return space;
};

/**
 * Money in, from the bank. The counterpart to resolveBankPayment: every credit
 * goes through here so it is logged, rather than each caller remembering to.
 */
const creditFromBank = (
  state: GameState,
  playerId: PlayerId,
  amount: number,
  reason: string
): GameState => {
  const player = getPlayerById(state, playerId);
  const nextState = updatePlayer(state, playerId, (currentPlayer) => ({
    ...currentPlayer,
    cash: currentPlayer.cash + amount,
  }));
  return appendEvents(nextState, [
    createEvent(
      nextState.turnNumber,
      `${player.name} collected ${money(nextState, amount)} - ${reason}.`
    ),
  ]);
};

const movePlayerTo = (
  state: GameState,
  playerId: PlayerId,
  nextPosition: number,
  collectGo: boolean,
  /**
   * Whether the token travelled forward to get here. Only a forward move can
   * pass GO; the wrap test cannot tell the two apart on its own.
   */
  isForward = true
): GameState => {
  const player = getPlayerById(state, playerId);
  let nextState = state;

  // Deliberately `passesGo`, not a bare position comparison: `next < current`
  // is also true of every backward move, so a card that moved a player back
  // past GO with collectGo set would have paid them for it.
  const passesGo = collectGo && isForward && nextPosition < player.position;

  if (passesGo) {
    nextState = creditFromBank(nextState, playerId, PASS_GO_AMOUNT, 'passing GO');
    // The Speed Die stays out of play until everyone has been round once, so
    // the trip past GO is worth recording as well as paying.
    nextState = updatePlayer(nextState, playerId, (currentPlayer) => ({
      ...currentPlayer,
      hasPassedGo: true,
    }));
  }

  return updatePlayer(nextState, playerId, (currentPlayer) => ({
    ...currentPlayer,
    position: nextPosition,
  }));
};

/**
 * What it costs to lift a mortgage: the value borrowed plus interest.
 *
 * The printed rule says "plus 10%" without saying how to round, and every other
 * amount in this game is a whole number. Rounds the interest up, which favours
 * the bank - documented in docs/india-edition-rules.md section 9.
 */
const getRedemptionCost = (mortgageValue: number): number =>
  mortgageValue + Math.ceil((mortgageValue * MORTGAGE_INTEREST_PERCENT) / 100);

/**
 * Records a debt nobody can currently pay.
 *
 * One card can leave several players insolvent, and only one decision can be
 * pending - so the second and later debts queue behind the first instead of
 * overwriting it. Before this, everyone after the first was silently forgiven.
 */
const enqueueDebt = (state: GameState, debt: DebtRecord): GameState => {
  const pending = state.pendingDecision;

  if (pending.type === PendingDecisionType.AssetLiquidation) {
    return {
      ...state,
      // `?? []` is not defensive padding: pendingDecision is the one part of a
      // save validated with .passthrough(), so a game saved before the queue
      // existed comes back without it.
      pendingDecision: { ...pending, queued: [...(pending.queued ?? []), debt] },
    };
  }

  return {
    ...state,
    pendingDecision: {
      type: PendingDecisionType.AssetLiquidation,
      ...debt,
      queued: [],
    },
    turn: { ...state.turn, phase: TurnPhase.AwaitDecision, reason: debt.reason },
  };
};

/**
 * What replaces a liquidation once it has been answered: the next debt in the
 * queue, or nothing.
 *
 * Debts owed by a player who has since gone bankrupt are dropped - they have
 * left the game, and their creditor was already paid out of what they held.
 */
const nextDecisionAfterDebt = (
  state: GameState,
  // Optional for the same reason enqueueDebt pads it: a save written before the
  // queue existed has a liquidation with no queue on it.
  queued: DebtRecord[] | undefined
): PendingDecision => {
  const stillOwed = (queued ?? []).filter(
    (debt) => !state.players[debt.playerId]?.isBankrupt
  );
  const [next, ...rest] = stillOwed;

  return next
    ? { type: PendingDecisionType.AssetLiquidation, ...next, queued: rest }
    : { type: PendingDecisionType.None };
};

const resolveBankPayment = (
  state: GameState,
  playerId: PlayerId,
  amount: number,
  reason: string
): GameState => {
  const player = getPlayerById(state, playerId);
  if (player.cash >= amount) {
    const paidState = updatePlayer(state, playerId, (currentPlayer) => ({
      ...currentPlayer,
      cash: currentPlayer.cash - amount,
    }));
    return appendEvents(paidState, [
      createEvent(
        paidState.turnNumber,
        `${player.name} paid ${money(paidState, amount)} to the bank - ${reason}.`
      ),
    ]);
  }

  return enqueueDebt(state, {
    playerId,
    amountDue: amount,
    creditorPlayerId: null,
    reason,
  });
};

const resolvePlayerPayment = (
  state: GameState,
  fromPlayerId: PlayerId,
  toPlayerId: PlayerId,
  amount: number,
  reason: string
): GameState => {
  const payer = getPlayerById(state, fromPlayerId);
  if (payer.cash >= amount) {
    const payee = getPlayerById(state, toPlayerId);
    let nextState = updatePlayer(state, fromPlayerId, (currentPlayer) => ({
      ...currentPlayer,
      cash: currentPlayer.cash - amount,
    }));
    nextState = updatePlayer(nextState, toPlayerId, (currentPlayer) => ({
      ...currentPlayer,
      cash: currentPlayer.cash + amount,
    }));
    return appendEvents(nextState, [
      createEvent(
        nextState.turnNumber,
        `${payer.name} paid ${payee.name} ${money(nextState, amount)} - ${reason}.`
      ),
    ]);
  }

  return enqueueDebt(state, {
    playerId: fromPlayerId,
    amountDue: amount,
    creditorPlayerId: toPlayerId,
    reason,
  });
};

const getStreetRent = (
  state: GameState,
  space: StreetSpace,
  ownerPlayerId: PlayerId
): number => {
  const buildLevel = state.ownership[space.id]?.buildLevel ?? 0;
  if (buildLevel === HOTEL_BUILD_LEVEL) return space.rents.withHotel;
  if (buildLevel === 4) return space.rents.with4Houses;
  if (buildLevel === 3) return space.rents.with3Houses;
  if (buildLevel === 2) return space.rents.with2Houses;
  if (buildLevel === 1) return space.rents.with1House;
  return ownsEntireColorSet(state, ownerPlayerId, space.colorGroup)
    ? space.rents.monopolyRent
    : space.rents.baseRent;
};

const getRailwayRent = (state: GameState, playerId: PlayerId): number => {
  const railwaysOwned = state.board.filter(
    (space) =>
      space.kind === SpaceKind.Railway &&
      state.ownership[space.id]?.ownerPlayerId === playerId
  ).length;
  const firstRailway = state.board.find((space) => space.kind === SpaceKind.Railway);
  return firstRailway?.kind === SpaceKind.Railway
    ? (firstRailway.rentByCount[Math.max(railwaysOwned - 1, 0)] ??
        firstRailway.rentByCount[0])
    : 25;
};

const getUtilityRent = (
  state: GameState,
  playerId: PlayerId,
  diceTotal: number
): number => {
  const utilitiesOwned = state.board.filter(
    (space) =>
      space.kind === SpaceKind.Utility &&
      state.ownership[space.id]?.ownerPlayerId === playerId
  ).length;
  const utility = state.board.find((space) => space.kind === SpaceKind.Utility);
  if (!utility || utility.kind !== SpaceKind.Utility) {
    return 0;
  }
  return (
    diceTotal *
    (utilitiesOwned > 1 ? utility.rentMultiplierBoth : utility.rentMultiplierOne)
  );
};

const sendPlayerToJail = (
  state: GameState,
  playerId: PlayerId,
  reason: string
): GameState => {
  let nextState = updatePlayer(state, playerId, (player) => ({
    ...player,
    position: JAIL_POSITION,
    inJail: true,
    jailTurnsServed: 0,
  }));

  nextState = {
    ...nextState,
    pendingDecision: { type: PendingDecisionType.None },
    turn: {
      ...nextState.turn,
      phase: TurnPhase.TurnComplete,
      canRollAgain: false,
      reason,
    },
  };

  return appendEvents(nextState, [
    createEvent(
      nextState.turnNumber,
      `${getPlayerById(state, playerId).name} was sent to Jail.`
    ),
  ]);
};

/**
 * The next bidder who has not already passed.
 *
 * Advancing by one and wrapping is not enough: bidding advances the index too,
 * so a bid/pass interleave can land the turn back on someone who has left the
 * auction. They were then asked to act again, and could bid their way back in.
 */
const nextActiveBidderIndex = (auction: AuctionState): number => {
  const { activeBidderOrder, activeBidderIndex, passedPlayerIds } = auction;

  for (let step = 1; step <= activeBidderOrder.length; step += 1) {
    const candidate = (activeBidderIndex + step) % activeBidderOrder.length;
    if (!passedPlayerIds.includes(activeBidderOrder[candidate])) {
      return candidate;
    }
  }

  // Everyone has passed; completeAuctionIfPossible ends the auction next.
  return activeBidderIndex;
};

const completeAuctionIfPossible = (
  state: GameState,
  randomSource: RandomSource
): GameState => {
  const auction = state.auctionState;
  if (!auction) {
    return state;
  }

  const remainingPlayers = auction.activeBidderOrder.filter(
    (playerId) => !auction.passedPlayerIds.includes(playerId)
  );

  if (remainingPlayers.length > 1) {
    return state;
  }

  if (remainingPlayers.length === 0 || !auction.highestBidderId) {
    return resumeTurnAfterDecision(
      {
        ...state,
        auctionState: null,
        pendingDecision: { type: PendingDecisionType.None },
      },
      randomSource
    );
  }

  const winnerId = auction.highestBidderId;
  const space = getSpaceById(state, auction.spaceId);
  // Same reason as buying: the primitive is what logs it.
  let nextState = resolveBankPayment(
    state,
    winnerId,
    auction.highestBid,
    `won the auction for ${space.name}`
  );

  nextState = updateSpaceOwnership(nextState, auction.spaceId, (ownership) => ({
    ...ownership,
    ownerPlayerId: winnerId,
  }));

  nextState = resumeTurnAfterDecision(
    {
      ...nextState,
      auctionState: null,
      pendingDecision: { type: PendingDecisionType.None },
    },
    randomSource
  );

  return nextState;
};

const startAuction = (state: GameState, spaceId: string): GameState => {
  const eligiblePlayers = state.playerOrder.filter(
    (playerId) => !state.players[playerId].isBankrupt
  );
  const auctionState: AuctionState = {
    id: crypto.randomUUID(),
    spaceId,
    startPrice: AUCTION_START_PRICE,
    minIncrement: AUCTION_MIN_INCREMENT,
    activeBidderOrder: eligiblePlayers,
    activeBidderIndex: 0,
    highestBid: 0,
    highestBidderId: null,
    passedPlayerIds: [],
  };

  return appendEvents(
    {
      ...state,
      auctionState,
      pendingDecision: {
        type: PendingDecisionType.AuctionBid,
        auctionId: auctionState.id,
      },
      turn: {
        ...state.turn,
        phase: TurnPhase.AwaitDecision,
        reason: 'Auction in progress',
      },
    },
    [
      createEvent(
        state.turnNumber,
        `Auction started for ${getSpaceById(state, spaceId).name}.`
      ),
    ]
  );
};

/**
 * The next seat that is still in the game.
 *
 * Rotation used to advance by one and wrap, which was harmless only because
 * nobody could go bankrupt. Falls back to the current seat when everyone else is
 * out - the caller is then looking at a finished game.
 */
const nextActivePlayerIndex = (state: GameState): number => {
  for (let step = 1; step <= state.playerOrder.length; step += 1) {
    const candidate = (state.activePlayerIndex + step) % state.playerOrder.length;
    if (!state.players[state.playerOrder[candidate]].isBankrupt) {
      return candidate;
    }
  }
  return state.activePlayerIndex;
};

const advanceToNextTurn = (state: GameState): GameState => {
  const nextIndex = nextActivePlayerIndex(state);
  const nextPlayerId = state.playerOrder[nextIndex];
  const nextPlayer = getPlayerById(state, nextPlayerId);

  return {
    ...state,
    activePlayerIndex: nextIndex,
    turnNumber: state.turnNumber + 1,
    pendingDecision: nextPlayer.inJail
      ? { type: PendingDecisionType.JailChoice, playerId: nextPlayer.id }
      : { type: PendingDecisionType.None },
    turn: {
      phase: nextPlayer.inJail ? TurnPhase.AwaitDecision : TurnPhase.AwaitRoll,
      doublesCount: 0,
      lastRoll: null,
      canRollAgain: false,
      speedDieFace: null,
      pendingMonopolyAdvance: false,
      reason: nextPlayer.inJail
        ? `${nextPlayer.name} must choose how to leave Jail.`
        : null,
    },
  };
};

/**
 * Draws the top card and stops. The effect is applied separately, by
 * AcknowledgeCard, so the player reads the card before it acts on them - the
 * two used to happen in one indivisible step, which left no room to show it.
 *
 * The deck is recycled here rather than at apply time: the card has left the
 * deck the moment it is drawn, whether or not the player has clicked yet.
 */
/** Which deck a card belongs to. The two enums use different string values. */
const deckNameOf = (deck: CardDeck): DeckName =>
  deck === CardDeck.Chance ? DeckName.Chance : DeckName.CommunityChest;

/**
 * Puts a used Get Out of Jail Free card back at the bottom of its own deck.
 *
 * drawCard removes these from their deck rather than recycling them, because a
 * held card is genuinely out of play. This is what returns one.
 */
const returnJailCardToDeck = (state: GameState, card: DeckCard): GameState => {
  const deckName = deckNameOf(card.deck);
  return {
    ...state,
    decks: { ...state.decks, [deckName]: [...state.decks[deckName], card] },
  };
};

const drawCard = (state: GameState, deckName: DeckName): GameState => {
  const card = state.decks[deckName][0];
  const remainingCards = state.decks[deckName].slice(1);
  const activePlayer = getActivePlayer(state);
  const nextState: GameState = {
    ...state,
    decks: {
      ...state.decks,
      [deckName]:
        card.effect.kind === CardEffectKind.JailFree
          ? remainingCards
          : [...remainingCards, card],
    },
    pendingDecision: {
      type: PendingDecisionType.CardDraw,
      playerId: activePlayer.id,
      deck: deckName,
      card,
    },
    turn: {
      ...state.turn,
      phase: TurnPhase.AwaitDecision,
      reason: `${activePlayer.name} drew ${card.title}.`,
    },
  };

  return appendEvents(nextState, [
    createEvent(nextState.turnNumber, `${activePlayer.name} drew ${card.title}.`),
  ]);
};

/**
 * Applies an already-drawn card's effect. Split out of the draw so the UI can
 * interject; everything below this line is the original resolveCard body.
 */
const applyCardEffect = (
  state: GameState,
  card: DeckCard,
  randomSource: RandomSource
): GameState => {
  const activePlayer = getActivePlayer(state);
  let nextState = state;
  const { effect } = card;

  switch (effect.kind) {
    case CardEffectKind.Collect:
      return creditFromBank(nextState, activePlayer.id, effect.amount, card.title);
    case CardEffectKind.Pay:
      return resolveBankPayment(nextState, activePlayer.id, effect.amount, card.title);
    case CardEffectKind.MoveTo: {
      nextState = movePlayerTo(
        nextState,
        activePlayer.id,
        effect.index,
        effect.collectGo
      );
      // The player did not roll their way here, so a utility's rent is charged
      // on a fresh throw - the printed rule for any card-driven arrival.
      return resolveCurrentSpace(
        nextState,
        activePlayer.id,
        false,
        rollDie(randomSource) + rollDie(randomSource)
      );
    }
    case CardEffectKind.MoveSteps: {
      const destination =
        (activePlayer.position + effect.steps + nextState.board.length) %
        nextState.board.length;
      // A MoveSteps card may go backwards ("go back three spaces"), which is
      // the case the isForward flag exists for.
      nextState = movePlayerTo(
        nextState,
        activePlayer.id,
        destination,
        effect.steps > 0,
        effect.steps > 0
      );
      return resolveCurrentSpace(
        nextState,
        activePlayer.id,
        false,
        rollDie(randomSource) + rollDie(randomSource)
      );
    }
    case CardEffectKind.GoToJail:
      return sendPlayerToJail(nextState, activePlayer.id, 'Card sent player to Jail');
    case CardEffectKind.JailFree: {
      // The card itself is kept, so it knows the deck it has to go back to.
      const withCard = updatePlayer(nextState, activePlayer.id, (player) => ({
        ...player,
        jailFreeCards: [...player.jailFreeCards, card],
      }));
      return appendEvents(withCard, [
        createEvent(withCard.turnNumber, `${activePlayer.name} kept ${card.title}.`),
      ]);
    }
    case CardEffectKind.CollectFromEach: {
      // Reads nextState, not the incoming state: each payment mutates cash and
      // may raise a liquidation, and the loop used to decide who pays from a
      // snapshot taken before any of it happened.
      nextState.playerOrder
        .filter(
          (playerId) =>
            playerId !== activePlayer.id && !nextState.players[playerId].isBankrupt
        )
        .forEach((playerId) => {
          // Every player is asked, even after one of them could not pay: an
          // unpayable debt queues behind the first rather than overwriting it.
          nextState = resolvePlayerPayment(
            nextState,
            playerId,
            activePlayer.id,
            effect.amount,
            card.title
          );
        });
      return nextState;
    }
    case CardEffectKind.PayEach: {
      nextState.playerOrder
        .filter(
          (playerId) =>
            playerId !== activePlayer.id && !nextState.players[playerId].isBankrupt
        )
        .forEach((playerId) => {
          // One drawer, several payees: each debt they cannot cover queues, so
          // every payee is owed rather than only the first.
          nextState = resolvePlayerPayment(
            nextState,
            activePlayer.id,
            playerId,
            effect.amount,
            card.title
          );
        });
      return nextState;
    }
    default:
      return nextState;
  }
};

/** Rent owed on an ownable space, dispatched by the space's kind. */
const getRentForSpace = (
  state: GameState,
  space: OwnableSpace,
  ownerPlayerId: PlayerId,
  diceTotal: number
): number => {
  if (space.kind === SpaceKind.Street) {
    return getStreetRent(state, space, ownerPlayerId);
  }
  if (space.kind === SpaceKind.Railway) {
    return getRailwayRent(state, ownerPlayerId);
  }
  return getUtilityRent(state, ownerPlayerId, diceTotal);
};

/**
 * The turn state to restore once a blocking decision has been answered.
 *
 * `canRollAgain` cannot be read for this: resolveCurrentSpace sets it false
 * whenever a decision blocks the turn, so anything reading it back after the
 * decision concludes the turn is over. `doublesCount` is the durable fact.
 *
 * Buying used to derive this from doublesCount while the auction paths read
 * canRollAgain, so declining a property silently forfeited the extra roll that
 * buying it kept.
 */
/**
 * Carries out an agreed trade: cash, sites and jail cards, both directions.
 *
 * Each side pays the bank 10% on the mortgaged sites it receives, and those
 * sites stay mortgaged - the receiver redeems them later at the usual cost if
 * they want to. Affordability is checked before this runs, so the payments here
 * cannot raise a liquidation.
 */
const settleTrade = (state: GameState, trade: TradeState): GameState => {
  const proposer = getPlayerById(state, trade.proposerPlayerId);
  const recipient = getPlayerById(state, trade.recipientPlayerId);
  let nextState = state;

  if (trade.offeredCash > 0) {
    nextState = resolvePlayerPayment(
      nextState,
      trade.proposerPlayerId,
      trade.recipientPlayerId,
      trade.offeredCash,
      `traded cash to ${recipient.name}`
    );
  }
  if (trade.requestedCash > 0) {
    nextState = resolvePlayerPayment(
      nextState,
      trade.recipientPlayerId,
      trade.proposerPlayerId,
      trade.requestedCash,
      `traded cash to ${proposer.name}`
    );
  }

  const moveSites = (spaceIds: SpaceId[], toPlayerId: PlayerId) => {
    const fees = getTransferFees(nextState, spaceIds);
    spaceIds.forEach((spaceId) => {
      nextState = updateSpaceOwnership(nextState, spaceId, (ownership) => ({
        ...ownership,
        ownerPlayerId: toPlayerId,
      }));
    });
    if (fees > 0) {
      nextState = resolveBankPayment(
        nextState,
        toPlayerId,
        fees,
        'mortgage interest on traded sites'
      );
    }
  };

  moveSites(trade.offeredSpaceIds, trade.recipientPlayerId);
  moveSites(trade.requestedSpaceIds, trade.proposerPlayerId);

  // The cards themselves change hands, so each keeps the deck it must return to.
  const offeredCards = nextState.players[trade.proposerPlayerId].jailFreeCards.slice(
    0,
    trade.offeredJailCards
  );
  const requestedCards = nextState.players[trade.recipientPlayerId].jailFreeCards.slice(
    0,
    trade.requestedJailCards
  );
  if (offeredCards.length > 0 || requestedCards.length > 0) {
    nextState = updatePlayer(nextState, trade.proposerPlayerId, (player) => ({
      ...player,
      jailFreeCards: [
        ...player.jailFreeCards.slice(offeredCards.length),
        ...requestedCards,
      ],
    }));
    nextState = updatePlayer(nextState, trade.recipientPlayerId, (player) => ({
      ...player,
      jailFreeCards: [
        ...player.jailFreeCards.slice(requestedCards.length),
        ...offeredCards,
      ],
    }));
  }

  return appendEvents(nextState, [
    createEvent(
      nextState.turnNumber,
      `${recipient.name} accepted ${proposer.name}'s trade.`
    ),
  ]);
};

const resumeTurnAfterDecision = (
  state: GameState,
  randomSource: RandomSource
): GameState => {
  // A Mr. Monopoly advance owed from before the decision is still owed now.
  const owedAdvance = state.turn.pendingMonopolyAdvance;
  const advanced = owedAdvance
    ? applyPendingMonopolyAdvance(
        state,
        state.playerOrder[state.activePlayerIndex],
        randomSource
      )
    : state;
  // Only when the advance actually ran and raised a decision of its own: some
  // callers resume before clearing the decision they answered, and that is not
  // the same thing at all.
  if (owedAdvance && advanced.pendingDecision.type !== PendingDecisionType.None) {
    return advanced;
  }

  const canRollAgain = advanced.turn.doublesCount > 0;

  return {
    ...advanced,
    turn: {
      ...advanced.turn,
      phase: canRollAgain ? TurnPhase.AwaitExtraRollOrEnd : TurnPhase.TurnComplete,
      canRollAgain,
      reason: null,
    },
  };
};

/** Which phase the turn lands in once the current space has resolved. */
const resolvePhaseAfterLanding = (
  isBlockedByDecision: boolean,
  canRollAgain: boolean
): TurnPhase => {
  if (isBlockedByDecision) {
    return TurnPhase.AwaitDecision;
  }
  return canRollAgain ? TurnPhase.AwaitExtraRollOrEnd : TurnPhase.TurnComplete;
};

const resolveCurrentSpace = (
  state: GameState,
  playerId: PlayerId,
  allowExtraRoll: boolean,
  /**
   * The dice total a utility's rent is charged on. Defaults to the turn's own
   * roll, which is right when the player got here by rolling. A player brought
   * here another way - a card, a Mr. Monopoly advance - throws afresh, which is
   * the printed rule and is why this is a parameter rather than a lookup.
   */
  rentDiceTotal?: number
): GameState => {
  const player = getPlayerById(state, playerId);
  const space = state.board[player.position];
  const lastRollTotal =
    rentDiceTotal ?? state.turn.lastRoll?.reduce((sum, roll) => sum + roll, 0) ?? 0;
  let nextState = state;

  if (space.kind === SpaceKind.Tax) {
    nextState = resolveBankPayment(nextState, player.id, space.amount, `${space.name}`);
  } else if (space.kind === SpaceKind.GoToJail) {
    return sendPlayerToJail(nextState, player.id, 'Landed on Go To Jail');
  } else if (space.kind === SpaceKind.Chance) {
    nextState = drawCard(nextState, DeckName.Chance);
  } else if (space.kind === SpaceKind.CommunityChest) {
    nextState = drawCard(nextState, DeckName.CommunityChest);
  } else if (isOwnableSpace(space)) {
    const ownership = nextState.ownership[space.id];
    if (!ownership.ownerPlayerId) {
      nextState = {
        ...nextState,
        pendingDecision: {
          type: PendingDecisionType.LandedUnownedProperty,
          spaceId: space.id,
          playerId: player.id,
        },
        turn: {
          ...nextState.turn,
          phase: TurnPhase.AwaitDecision,
          reason: `Decide whether to buy ${space.name}.`,
        },
      };
    } else if (ownership.ownerPlayerId !== player.id && !ownership.mortgaged) {
      const owner = getPlayerById(nextState, ownership.ownerPlayerId);
      const rent = getRentForSpace(nextState, space, owner.id, lastRollTotal);

      // resolvePlayerPayment logs the settled payment. It used to be logged
      // here as well, unconditionally - so a player who could not afford the
      // rent still got a "paid" line while being routed to liquidation.
      nextState = resolvePlayerPayment(
        nextState,
        player.id,
        owner.id,
        rent,
        `rent on ${space.name}`
      );
    }
  }

  // Going to jail ends the turn outright, even on doubles. sendPlayerToJail
  // already sets that, but a Chance / Community Chest card routes back through
  // here afterwards, and the phase assignment below would otherwise hand a
  // jailed player an extra roll - leaving them able to roll while in jail, which
  // the engine then rejects.
  if (getPlayerById(nextState, playerId).inJail) {
    return {
      ...nextState,
      turn: {
        ...nextState.turn,
        phase: TurnPhase.TurnComplete,
        canRollAgain: false,
      },
    };
  }

  const isBlockedByDecision = nextState.pendingDecision.type !== PendingDecisionType.None;
  const canRollAgain = allowExtraRoll && !isBlockedByDecision;

  return {
    ...nextState,
    turn: {
      ...nextState.turn,
      phase: resolvePhaseAfterLanding(isBlockedByDecision, canRollAgain),
      canRollAgain,
      reason: isBlockedByDecision ? nextState.turn.reason : null,
    },
  };
};

/** How a Speed Die face reads in the history. */
const describeSpeedDie = (face: SpeedDieFace): string => {
  if (face === SpeedDieFace.Bus) return 'a Bus';
  if (face === SpeedDieFace.MrMonopoly) return 'Mr. Monopoly';
  return face;
};

/**
 * Moves a player forward and resolves where they land.
 *
 * Shared by the ordinary roll and every Speed Die face, so a bus move and a
 * rolled move cannot drift apart in what they collect or resolve.
 */
const advanceAndResolve = (
  state: GameState,
  playerId: PlayerId,
  steps: number,
  allowExtraRoll: boolean,
  rentDiceTotal?: number
): GameState => {
  const player = getPlayerById(state, playerId);
  const destination = (player.position + steps) % state.board.length;
  const moved = movePlayerTo(state, playerId, destination, true);
  return resolveCurrentSpace(moved, playerId, allowExtraRoll, rentDiceTotal);
};

/**
 * Mr. Monopoly's advance: on to the next unowned asset, or failing that the
 * next one an opponent owns.
 *
 * Returns the number of forward steps, or null when there is nothing to advance
 * to - which happens only when the player owns every asset on the board, and is
 * a win in all but name.
 */
const findMonopolyAdvance = (state: GameState, playerId: PlayerId): number | null => {
  const player = getPlayerById(state, playerId);
  const size = state.board.length;

  const stepsTo = (predicate: (spaceId: SpaceId) => boolean): number | null => {
    for (let steps = 1; steps <= size; steps += 1) {
      const space = state.board[(player.position + steps) % size];
      if (isOwnableSpace(space) && predicate(space.id)) {
        return steps;
      }
    }
    return null;
  };

  // Unowned first: the printed rule is to buy or auction if anything is going.
  const unowned = stepsTo((spaceId) => !state.ownership[spaceId]?.ownerPlayerId);
  if (unowned !== null) return unowned;

  return stepsTo((spaceId) => {
    const owner = state.ownership[spaceId]?.ownerPlayerId;
    return Boolean(owner) && owner !== playerId;
  });
};

/**
 * Carries out an owed Mr. Monopoly advance, if the turn is clear to take it.
 *
 * Called wherever a space finishes resolving - both straight after the landing
 * and after a decision that landing raised has been answered - because the
 * advance is owed either way.
 */
const applyPendingMonopolyAdvance = (
  state: GameState,
  playerId: PlayerId,
  randomSource: RandomSource
): GameState => {
  if (!state.turn.pendingMonopolyAdvance) return state;
  if (state.pendingDecision.type !== PendingDecisionType.None) return state;

  // Cleared before the advance, so the decision the advance itself may raise
  // cannot send us round again.
  const cleared: GameState = {
    ...state,
    turn: { ...state.turn, pendingMonopolyAdvance: false },
  };

  const steps = findMonopolyAdvance(cleared, playerId);
  if (steps === null) return cleared;

  const player = getPlayerById(cleared, playerId);
  const target = cleared.board[(player.position + steps) % cleared.board.length];
  const announced = appendEvents(cleared, [
    createEvent(
      cleared.turnNumber,
      `Mr. Monopoly moved ${player.name} on to ${target.name}.`
    ),
  ]);

  // A utility reached this way is charged on a fresh throw, not on the roll
  // that started the turn - the player did not roll their way here.
  return advanceAndResolve(
    announced,
    playerId,
    steps,
    cleared.turn.doublesCount > 0,
    rollDie(randomSource) + rollDie(randomSource)
  );
};

export const createGameState = (
  input: CreateGameInput,
  randomSource: RandomSource = new DefaultRandomSource()
): GameState => {
  const players = createPlayers(input);
  const playerOrder = chooseFirstPlayerOrder(Object.keys(players), randomSource);
  const board = indiaEditionBoard;
  const now = input.createdAt;
  const name =
    input.name?.trim() ||
    `${input.playerConfigs[0]?.name ?? 'Player 1'} vs ${input.playerConfigs[1]?.name ?? 'Player 2'} - ${new Date(input.createdAt).toLocaleString()}`;

  return {
    version: GAME_STATE_VERSION,
    id: input.gameId ?? crypto.randomUUID(),
    name,
    themeId: input.themeId,
    rulesetId: indiaEditionRulesetId,
    status: GameStatus.InProgress,
    createdAt: now,
    updatedAt: now,
    players,
    playerOrder,
    activePlayerIndex: 0,
    turnNumber: 1,
    board,
    ownership: createOwnershipMap(board),
    bank: {
      cash: 'unlimited',
      housesAvailable: HOUSES_AVAILABLE,
      hotelsAvailable: HOTELS_AVAILABLE,
    },
    decks: {
      chance: shuffle(chanceCards, randomSource),
      communityChest: shuffle(communityChestCards, randomSource),
    },
    turn: {
      phase: TurnPhase.AwaitRoll,
      doublesCount: 0,
      lastRoll: null,
      canRollAgain: false,
      reason: null,
      speedDieFace: null,
      pendingMonopolyAdvance: false,
    },
    pendingDecision: { type: PendingDecisionType.None },
    tradeState: null,
    auctionState: null,
    history: [
      createEvent(1, `${name} started with ${input.playerConfigs.length} players.`),
      createEvent(
        1,
        `${players[playerOrder[0]].name} won the opening roll and goes first.`
      ),
    ],
    winnerPlayerId: null,
    useSpeedDie: input.useSpeedDie ?? false,
  };
};

/**
 * Ends the game when only one player is left standing.
 *
 * Called after a bankruptcy, the only way a player leaves. Setting the status
 * is what stops further commands - ensureGameNotFinished already rejects
 * everything once the game is no longer in progress.
 */
const concludeIfWon = (state: GameState): GameState => {
  const survivors = state.playerOrder.filter(
    (playerId) => !state.players[playerId].isBankrupt
  );
  if (survivors.length !== 1) {
    return state;
  }

  const winner = getPlayerById(state, survivors[0]);
  return appendEvents(
    {
      ...state,
      status: GameStatus.Completed,
      winnerPlayerId: winner.id,
      pendingDecision: { type: PendingDecisionType.GameOver },
      turn: { ...state.turn, phase: TurnPhase.TurnComplete, canRollAgain: false },
    },
    [createEvent(state.turnNumber, `${winner.name} won the game.`)]
  );
};

const ensureGameNotFinished = (state: GameState) => {
  if (state.status !== GameStatus.InProgress) {
    throw new Error('This game is already complete.');
  }
};

/**
 * The events one command appended.
 *
 * History is newest-first and capped, so normally the delta is the leading
 * slice. Once the cap is reached the length stops growing, and the ids are the
 * only way to tell what is new - which is exactly when a long game would
 * otherwise stop reporting anything.
 */
const eventsSince = (before: GameEvent[], after: GameEvent[]): GameEvent[] => {
  const added = after.length - before.length;
  if (added > 0) {
    return after.slice(0, added);
  }
  const seen = new Set(before.map((event) => event.id));
  return after.filter((event) => !seen.has(event.id));
};

export const executeGameCommand = (
  state: GameState,
  command: RuntimeGameCommand,
  randomSource: RandomSource = new DefaultRandomSource()
): GameCommandResult => {
  ensureGameNotFinished(state);

  let nextState = state;
  const uiHints: string[] = [];

  switch (command.type) {
    case GameCommandType.RollTurnDice: {
      const activePlayer = getActivePlayer(nextState);
      if (activePlayer.inJail) {
        throw new Error('Player must choose a Jail action first.');
      }
      if (
        nextState.turn.phase !== TurnPhase.AwaitRoll &&
        nextState.turn.phase !== TurnPhase.AwaitExtraRollOrEnd
      ) {
        throw new Error('Rolling is not available right now.');
      }

      const dieOne = rollDie(randomSource);
      const dieTwo = rollDie(randomSource);
      // Only the white dice decide a double. The Speed Die is rolled after,
      // and a matching face is irrelevant to it.
      const isDouble = dieOne === dieTwo;
      const speedDieFace = isSpeedDieActive(nextState)
        ? rollSpeedDie(randomSource)
        : null;
      const rolledTriple = isTriple(dieOne, dieTwo, speedDieFace);
      // A triple is its own outcome, not a double: it grants no extra roll and
      // it does not count towards the three that send a player to Jail.
      const nextDoublesCount =
        isDouble && !rolledTriple ? nextState.turn.doublesCount + 1 : 0;

      nextState = {
        ...nextState,
        turn: {
          phase: TurnPhase.ResolvingMovement,
          doublesCount: nextDoublesCount,
          lastRoll: [dieOne, dieTwo],
          canRollAgain: false,
          speedDieFace,
          // Mr. Monopoly's advance is owed once the landed space has resolved.
          pendingMonopolyAdvance: speedDieFace === SpeedDieFace.MrMonopoly,
          reason: null,
        },
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          speedDieFace
            ? `${activePlayer.name} rolled ${dieOne}, ${dieTwo} and ${describeSpeedDie(speedDieFace)}.`
            : `${activePlayer.name} rolled ${dieOne} and ${dieTwo}.`
        ),
      ]);

      if (nextDoublesCount === DOUBLES_BEFORE_JAIL) {
        nextState = sendPlayerToJail(
          nextState,
          activePlayer.id,
          'Rolled doubles three times'
        );
        break;
      }

      // Three of a kind: the player picks anywhere on the board.
      if (rolledTriple) {
        nextState = {
          ...nextState,
          pendingDecision: {
            type: PendingDecisionType.SpeedDieDestination,
            playerId: activePlayer.id,
          },
          turn: {
            ...nextState.turn,
            phase: TurnPhase.AwaitDecision,
            reason: `${activePlayer.name} may move to any space.`,
          },
        };
        break;
      }

      // A Bus lets the player choose which white dice to move by, so the move
      // waits on their answer.
      if (speedDieFace === SpeedDieFace.Bus) {
        nextState = {
          ...nextState,
          pendingDecision: {
            type: PendingDecisionType.SpeedDieBus,
            playerId: activePlayer.id,
            whiteDice: [dieOne, dieTwo],
          },
          turn: {
            ...nextState.turn,
            phase: TurnPhase.AwaitDecision,
            reason: `${activePlayer.name} caught the bus.`,
          },
        };
        break;
      }

      nextState = advanceAndResolve(
        nextState,
        activePlayer.id,
        dieOne + dieTwo + speedDieSteps(speedDieFace),
        isDouble
      );
      nextState = applyPendingMonopolyAdvance(nextState, activePlayer.id, randomSource);
      break;
    }
    case GameCommandType.BuyLandedAsset: {
      if (nextState.pendingDecision.type !== PendingDecisionType.LandedUnownedProperty) {
        throw new Error('There is no property awaiting purchase.');
      }
      const decision = nextState.pendingDecision;
      const buyer = getPlayerById(nextState, decision.playerId);
      const space = getSpaceById(nextState, decision.spaceId);
      if (!isOwnableSpace(space)) {
        throw new Error('Current space is not buyable.');
      }
      if (buyer.cash < space.price) {
        throw new Error('Player does not have enough money to buy this asset.');
      }

      // Through the money primitive, not inline: it is what logs the movement,
      // and an amount that skips it is invisible to the feedback that reads the
      // history. Affordability is guarded above, so no liquidation can arise.
      nextState = resolveBankPayment(
        nextState,
        buyer.id,
        space.price,
        `bought ${space.name}`
      );
      nextState = updateSpaceOwnership(nextState, space.id, (ownership) => ({
        ...ownership,
        ownerPlayerId: buyer.id,
      }));
      // Through the shared resume rather than repeating its phase rules here:
      // this case used to restate them, which is why a Mr. Monopoly advance
      // owed across the buy decision was silently dropped.
      nextState = resumeTurnAfterDecision(
        { ...nextState, pendingDecision: { type: PendingDecisionType.None } },
        randomSource
      );
      break;
    }
    case GameCommandType.DeclineLandedAsset:
      if (nextState.pendingDecision.type !== PendingDecisionType.LandedUnownedProperty) {
        throw new Error('There is no property awaiting decline.');
      }
      nextState = startAuction(nextState, nextState.pendingDecision.spaceId);
      break;
    case GameCommandType.SubmitAuctionBid: {
      const auction = nextState.auctionState;
      if (!auction || nextState.pendingDecision.type !== PendingDecisionType.AuctionBid) {
        throw new Error('There is no auction in progress.');
      }
      const activeBidderId = auction.activeBidderOrder[auction.activeBidderIndex];
      const activeBidder = getPlayerById(nextState, activeBidderId);
      const minimumBid = Math.max(
        auction.startPrice,
        auction.highestBid + auction.minIncrement
      );
      if (command.amount < minimumBid) {
        throw new Error(`Bid must be at least ${minimumBid}.`);
      }
      if (command.amount > activeBidder.cash) {
        throw new Error('Bid exceeds available cash.');
      }

      nextState = {
        ...nextState,
        auctionState: {
          ...auction,
          highestBid: command.amount,
          highestBidderId: activeBidderId,
          activeBidderIndex: nextActiveBidderIndex(auction),
        },
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${activeBidder.name} bid ${getThemeOrDefault(nextState.themeId).currencySymbol}${command.amount}.`
        ),
      ]);
      nextState = completeAuctionIfPossible(nextState, randomSource);
      break;
    }
    case GameCommandType.PassAuction: {
      const auction = nextState.auctionState;
      if (!auction || nextState.pendingDecision.type !== PendingDecisionType.AuctionBid) {
        throw new Error('There is no auction in progress.');
      }
      const activeBidderId = auction.activeBidderOrder[auction.activeBidderIndex];
      nextState = {
        ...nextState,
        auctionState: (() => {
          const withPass: AuctionState = {
            ...auction,
            passedPlayerIds: [...auction.passedPlayerIds, activeBidderId],
          };
          return {
            ...withPass,
            activeBidderIndex: nextActiveBidderIndex(withPass),
          };
        })(),
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${getPlayerById(nextState, activeBidderId).name} passed in the auction.`
        ),
      ]);
      nextState = completeAuctionIfPossible(nextState, randomSource);
      break;
    }
    case GameCommandType.PayJailFine: {
      const activePlayer = getActivePlayer(nextState);
      if (!activePlayer.inJail) {
        throw new Error('Active player is not in Jail.');
      }
      nextState = resolveBankPayment(nextState, activePlayer.id, JAIL_FINE, 'Jail fine');
      // resolveBankPayment raises a liquidation when the player is short. Leave
      // it standing and leave them in Jail: overwriting it here let a player
      // with under the fine walk out without paying.
      if (nextState.pendingDecision.type === PendingDecisionType.AssetLiquidation) {
        break;
      }
      nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
        ...player,
        inJail: false,
        jailTurnsServed: 0,
      }));
      nextState = {
        ...nextState,
        pendingDecision: { type: PendingDecisionType.None },
        turn: {
          ...nextState.turn,
          phase: TurnPhase.AwaitRoll,
          reason: null,
        },
      };
      break;
    }
    case GameCommandType.UseJailFreeCard: {
      const activePlayer = getActivePlayer(nextState);
      if (!activePlayer.inJail || activePlayer.jailFreeCards.length < 1) {
        throw new Error('Get Out of Jail Free card is not available.');
      }
      const [usedCard, ...keptCards] = activePlayer.jailFreeCards;
      nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
        ...player,
        inJail: false,
        jailTurnsServed: 0,
        jailFreeCards: keptCards,
      }));
      // Back to the bottom of its own deck. drawCard deliberately does not
      // recycle a jail card - a held card is out of play - so this is the only
      // thing that puts one back, and without it both left for good.
      nextState = returnJailCardToDeck(nextState, usedCard);
      nextState = {
        ...nextState,
        pendingDecision: { type: PendingDecisionType.None },
        turn: {
          ...nextState.turn,
          phase: TurnPhase.AwaitRoll,
          reason: null,
        },
      };
      break;
    }
    case GameCommandType.AttemptJailRoll: {
      const activePlayer = getActivePlayer(nextState);
      if (!activePlayer.inJail) {
        throw new Error('Active player is not in Jail.');
      }
      const dieOne = rollDie(randomSource);
      const dieTwo = rollDie(randomSource);
      nextState = {
        ...nextState,
        turn: {
          phase: TurnPhase.ResolvingMovement,
          doublesCount: 0,
          lastRoll: [dieOne, dieTwo],
          canRollAgain: false,
          reason: null,
          // Only the white dice get a player out of Jail, so no Speed Die here.
          speedDieFace: null,
          pendingMonopolyAdvance: false,
        },
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${activePlayer.name} attempted a Jail roll and got ${dieOne} and ${dieTwo}.`
        ),
      ]);

      if (dieOne === dieTwo) {
        nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
          ...player,
          inJail: false,
          jailTurnsServed: 0,
        }));
        nextState = movePlayerTo(
          nextState,
          activePlayer.id,
          (JAIL_POSITION + dieOne + dieTwo) % nextState.board.length,
          true
        );
        nextState = resolveCurrentSpace(nextState, activePlayer.id, false);
      } else {
        const jailTurnsServed = activePlayer.jailTurnsServed + 1;
        nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
          ...player,
          jailTurnsServed,
        }));
        if (jailTurnsServed >= MAX_JAIL_TURNS) {
          nextState = resolveBankPayment(
            nextState,
            activePlayer.id,
            JAIL_FINE,
            'Mandatory Jail fine'
          );
          // Same guard as PayJailFine: a player who cannot cover the mandatory
          // fine stays in Jail rather than being un-jailed and moved.
          if (nextState.pendingDecision.type === PendingDecisionType.AssetLiquidation) {
            break;
          }
          nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
            ...player,
            inJail: false,
            jailTurnsServed: 0,
          }));
          nextState = movePlayerTo(
            nextState,
            activePlayer.id,
            (JAIL_POSITION + dieOne + dieTwo) % nextState.board.length,
            true
          );
          nextState = resolveCurrentSpace(nextState, activePlayer.id, false);
        } else {
          nextState = {
            ...nextState,
            pendingDecision: { type: PendingDecisionType.None },
            turn: {
              ...nextState.turn,
              phase: TurnPhase.TurnComplete,
              reason: null,
            },
          };
        }
      }
      break;
    }
    case GameCommandType.EndTurn:
      if (
        nextState.turn.phase !== TurnPhase.TurnComplete &&
        nextState.turn.phase !== TurnPhase.AwaitExtraRollOrEnd
      ) {
        throw new Error('Turn cannot be ended yet.');
      }
      if (nextState.turn.canRollAgain) {
        nextState = {
          ...nextState,
          turn: {
            ...nextState.turn,
            phase: TurnPhase.AwaitRoll,
            canRollAgain: false,
          },
        };
      } else {
        nextState = advanceToNextTurn(nextState);
      }
      break;
    case GameCommandType.AcknowledgeCard: {
      const decision = nextState.pendingDecision;
      if (decision.type !== PendingDecisionType.CardDraw) {
        throw new Error('There is no drawn card to acknowledge');
      }

      // Clear the decision *before* applying. A MoveTo card routes back through
      // resolveCurrentSpace, which treats any pending decision as blocking - it
      // would read the stale CardDraw and strand the turn.
      nextState = {
        ...nextState,
        pendingDecision: { type: PendingDecisionType.None },
      };
      nextState = applyCardEffect(nextState, decision.card, randomSource);

      // The effect may have raised its own decision - a MoveTo landing on an
      // unowned site, or a payment the player cannot afford. Only settle the
      // phase when it did not. The inJail guard matters because a card can send
      // the player to jail, and a jailed player must not keep an extra roll.
      // A card can send the player to jail, and a jailed player keeps no extra
      // roll - sendPlayerToJail has already ended the turn, so leave it alone.
      if (
        nextState.pendingDecision.type === PendingDecisionType.None &&
        !getActivePlayer(nextState).inJail
      ) {
        nextState = resumeTurnAfterDecision(nextState, randomSource);
      }
      break;
    }
    case GameCommandType.MortgageAsset: {
      const activePlayer = getActivePlayer(nextState);
      const space = getSpaceById(nextState, command.spaceId);
      if (!isOwnableSpace(space)) {
        throw new Error(`${space.name} cannot be mortgaged.`);
      }
      if (!isOwnedBy(nextState, space.id, activePlayer.id)) {
        throw new Error(`${activePlayer.name} does not own ${space.name}.`);
      }
      if (nextState.ownership[space.id].mortgaged) {
        throw new Error(`${space.name} is already mortgaged.`);
      }
      // Buildings must be sold before a site can be mortgaged, and the rule
      // covers the whole colour group, not just this site.
      if (isStreetSpace(space) && groupHasBuildings(nextState, space.colorGroup)) {
        throw new Error(
          `Sell the buildings in ${space.name}'s colour set before mortgaging it.`
        );
      }

      nextState = creditFromBank(
        nextState,
        activePlayer.id,
        space.mortgageValue,
        `mortgaged ${space.name}`
      );
      nextState = updateSpaceOwnership(nextState, space.id, (ownership) => ({
        ...ownership,
        mortgaged: true,
      }));
      // Deliberately leaves pendingDecision and turn alone: mortgaging is how a
      // player raises cash *during* a liquidation, and clearing the decision
      // here would recreate the deadlock this command exists to fix.
      break;
    }
    case GameCommandType.UnmortgageAsset: {
      const activePlayer = getActivePlayer(nextState);
      const space = getSpaceById(nextState, command.spaceId);
      if (!isOwnableSpace(space)) {
        throw new Error(`${space.name} cannot be mortgaged.`);
      }
      if (!isOwnedBy(nextState, space.id, activePlayer.id)) {
        throw new Error(`${activePlayer.name} does not own ${space.name}.`);
      }
      if (!nextState.ownership[space.id].mortgaged) {
        throw new Error(`${space.name} is not mortgaged.`);
      }
      const redemptionCost = getRedemptionCost(space.mortgageValue);
      if (activePlayer.cash < redemptionCost) {
        throw new Error(`${activePlayer.name} cannot afford to redeem ${space.name}.`);
      }

      nextState = resolveBankPayment(
        nextState,
        activePlayer.id,
        redemptionCost,
        `redeemed ${space.name}`
      );
      nextState = updateSpaceOwnership(nextState, space.id, (ownership) => ({
        ...ownership,
        mortgaged: false,
      }));
      break;
    }
    case GameCommandType.SettleDebt: {
      const decision = nextState.pendingDecision;
      if (decision.type !== PendingDecisionType.AssetLiquidation) {
        throw new Error('There is no debt to settle.');
      }
      const debtor = getPlayerById(nextState, decision.playerId);
      if (debtor.cash < decision.amountDue) {
        throw new Error(
          `${debtor.name} cannot cover ${money(nextState, decision.amountDue)} yet.`
        );
      }

      // The insolvent branches of the payment primitives record the debt without
      // moving any money, so this is where it finally moves.
      nextState = decision.creditorPlayerId
        ? resolvePlayerPayment(
            nextState,
            decision.playerId,
            decision.creditorPlayerId,
            decision.amountDue,
            decision.reason
          )
        : resolveBankPayment(
            nextState,
            decision.playerId,
            decision.amountDue,
            decision.reason
          );

      // The next debt from the same card, if the card left more than one.
      const following = nextDecisionAfterDebt(nextState, decision.queued);
      nextState =
        following.type === PendingDecisionType.AssetLiquidation
          ? {
              ...nextState,
              pendingDecision: following,
              turn: { ...nextState.turn, phase: TurnPhase.AwaitDecision },
            }
          : resumeTurnAfterDecision(
              { ...nextState, pendingDecision: following },
              randomSource
            );
      break;
    }
    case GameCommandType.ConfirmBankruptcy: {
      const decision = nextState.pendingDecision;
      if (decision.type !== PendingDecisionType.AssetLiquidation) {
        throw new Error('Bankruptcy is only declared against a debt.');
      }
      const debtor = getPlayerById(nextState, decision.playerId);
      // You are bankrupt when you owe more than everything you have, not when
      // you would rather not pay - so refuse while the debt is still reachable.
      if (debtor.cash + getLiquidationValue(nextState, debtor.id) >= decision.amountDue) {
        throw new Error(
          `${debtor.name} can still raise ${money(nextState, decision.amountDue)}.`
        );
      }

      const creditorId = decision.creditorPlayerId;
      const owned = getPlayerOwnedSpaces(nextState, debtor.id);

      if (creditorId) {
        // Everything the debtor has passes to the creditor, mortgages and all.
        const creditor = getPlayerById(nextState, creditorId);
        nextState = updatePlayer(nextState, creditorId, (player) => ({
          ...player,
          cash: player.cash + debtor.cash,
          jailFreeCards: [...player.jailFreeCards, ...debtor.jailFreeCards],
        }));
        owned.forEach((space) => {
          nextState = updateSpaceOwnership(nextState, space.id, (ownership) => ({
            ...ownership,
            ownerPlayerId: creditorId,
          }));
        });
        nextState = appendEvents(nextState, [
          createEvent(
            nextState.turnNumber,
            `${debtor.name} went bankrupt. ${creditor.name} took ${money(nextState, debtor.cash)} and ${owned.length} site(s).`
          ),
        ]);
      } else {
        // Debt to the bank: the properties return unowned and their mortgages
        // are cancelled. The printed rule auctions them there and then; see
        // docs/india-edition-rules.md section 11 for why that is not done yet.
        owned.forEach((space) => {
          nextState = updateSpaceOwnership(nextState, space.id, () => ({
            ownerPlayerId: null,
            mortgaged: false,
            buildLevel: 0,
          }));
        });
        nextState = appendEvents(nextState, [
          createEvent(
            nextState.turnNumber,
            `${debtor.name} went bankrupt. ${owned.length} site(s) returned to the bank.`
          ),
        ]);
      }

      // Rank counts up from one, so the first player out ranks 1.
      const alreadyOut = nextState.playerOrder.filter(
        (playerId) => nextState.players[playerId].isBankrupt
      ).length;
      nextState = updatePlayer(nextState, debtor.id, (player) => ({
        ...player,
        cash: 0,
        jailFreeCards: [],
        inJail: false,
        isBankrupt: true,
        bankruptcyRank: alreadyOut + 1,
      }));

      // Debts queued behind this one still stand, unless they were this
      // player's - they have left the game and their creditor has already taken
      // everything they held.
      const remaining = nextDecisionAfterDebt(nextState, decision.queued);
      nextState = {
        ...nextState,
        pendingDecision: remaining,
        turn:
          remaining.type === PendingDecisionType.AssetLiquidation
            ? { ...nextState.turn, phase: TurnPhase.AwaitDecision }
            : { ...nextState.turn, phase: TurnPhase.TurnComplete, canRollAgain: false },
      };
      // A bankruptcy is the only way a player leaves, so it is the only place
      // the game can become won.
      nextState = concludeIfWon(nextState);
      break;
    }
    // Building and selling share their guards with the UI: buildBlockedReason /
    // sellBlockedReason are the single statement of the rules, so a disabled
    // button and a thrown command can never disagree.
    case GameCommandType.BuildHouse:
    case GameCommandType.BuildHotel: {
      const activePlayer = getActivePlayer(nextState);
      const space = getSpaceById(nextState, command.spaceId);
      const blocked = buildBlockedReason(nextState, command.spaceId, activePlayer.id);
      if (blocked) {
        throw new Error(`Cannot build on ${space.name}: ${blocked}.`);
      }
      if (!isStreetSpace(space)) {
        throw new Error(`${space.name} cannot be built on.`);
      }

      const level = getBuildLevel(nextState, space.id);
      const isHotel = level === MAX_HOUSES_PER_SITE;
      const cost = isHotel ? space.hotelCost : space.houseCost;

      nextState = resolveBankPayment(
        nextState,
        activePlayer.id,
        cost,
        isHotel ? `built a hotel on ${space.name}` : `built a house on ${space.name}`
      );
      nextState = updateSpaceOwnership(nextState, space.id, (ownership) => ({
        ...ownership,
        buildLevel: level + 1,
      }));
      // A hotel takes the site's four houses back into stock, which is what
      // makes a house shortage a real constraint rather than a counter.
      nextState = {
        ...nextState,
        bank: {
          ...nextState.bank,
          housesAvailable: isHotel
            ? nextState.bank.housesAvailable + MAX_HOUSES_PER_SITE
            : nextState.bank.housesAvailable - 1,
          hotelsAvailable: isHotel
            ? nextState.bank.hotelsAvailable - 1
            : nextState.bank.hotelsAvailable,
        },
      };
      break;
    }
    case GameCommandType.SellHouse:
    case GameCommandType.SellHotel: {
      const activePlayer = getActivePlayer(nextState);
      const space = getSpaceById(nextState, command.spaceId);
      const blocked = sellBlockedReason(nextState, command.spaceId, activePlayer.id);
      if (blocked) {
        throw new Error(`Cannot sell on ${space.name}: ${blocked}.`);
      }
      if (!isStreetSpace(space)) {
        throw new Error(`${space.name} carries no buildings.`);
      }

      const level = getBuildLevel(nextState, space.id);
      const isHotel = level === HOTEL_BUILD_LEVEL;

      nextState = creditFromBank(
        nextState,
        activePlayer.id,
        getSaleRefund(nextState, space),
        isHotel ? `sold the hotel on ${space.name}` : `sold a house on ${space.name}`
      );
      nextState = updateSpaceOwnership(nextState, space.id, (ownership) => ({
        ...ownership,
        buildLevel: level - 1,
      }));
      nextState = {
        ...nextState,
        bank: {
          ...nextState.bank,
          housesAvailable: isHotel
            ? nextState.bank.housesAvailable - MAX_HOUSES_PER_SITE
            : nextState.bank.housesAvailable + 1,
          hotelsAvailable: isHotel
            ? nextState.bank.hotelsAvailable + 1
            : nextState.bank.hotelsAvailable,
        },
      };
      // Like mortgaging, this deliberately leaves pendingDecision and turn
      // alone: selling buildings is how a player raises cash mid-liquidation.
      break;
    }
    case GameCommandType.ChooseBusMove: {
      const decision = nextState.pendingDecision;
      if (decision.type !== PendingDecisionType.SpeedDieBus) {
        throw new Error('There is no bus to catch.');
      }
      const [whiteOne, whiteTwo] = decision.whiteDice;
      // One die, the other, or both - and nothing else. A free choice of steps
      // would be a different game.
      const allowed = [whiteOne, whiteTwo, whiteOne + whiteTwo];
      if (!allowed.includes(command.steps)) {
        throw new Error(
          `A bus moves ${whiteOne}, ${whiteTwo} or ${whiteOne + whiteTwo} spaces.`
        );
      }

      const busPlayer = getPlayerById(nextState, decision.playerId);
      nextState = {
        ...nextState,
        pendingDecision: { type: PendingDecisionType.None },
        turn: { ...nextState.turn, phase: TurnPhase.ResolvingMovement, reason: null },
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${busPlayer.name} took the bus ${command.steps} spaces.`
        ),
      ]);
      // The white dice were a double, so the extra roll still follows: the bus
      // decides how far, not whether the turn continues.
      nextState = advanceAndResolve(
        nextState,
        decision.playerId,
        command.steps,
        whiteOne === whiteTwo
      );
      break;
    }
    case GameCommandType.ChooseSpeedDieDestination: {
      const decision = nextState.pendingDecision;
      if (decision.type !== PendingDecisionType.SpeedDieDestination) {
        throw new Error('There is no free move to make.');
      }
      const target = nextState.board.findIndex((space) => space.id === command.spaceId);
      if (target < 0) {
        throw new Error('No such space.');
      }

      const moving = getPlayerById(nextState, decision.playerId);
      nextState = {
        ...nextState,
        pendingDecision: { type: PendingDecisionType.None },
        turn: { ...nextState.turn, phase: TurnPhase.ResolvingMovement, reason: null },
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${moving.name} moved to ${nextState.board[target].name}.`
        ),
      ]);
      // Forward round the board, so the trip past GO is paid for like any
      // other - the printed rule moves the token, it does not teleport it.
      const forwardSteps =
        (target - moving.position + nextState.board.length) % nextState.board.length;
      // A triple grants no extra roll: it is not a double. And a utility picked
      // this way is charged on a fresh throw rather than the matching triple.
      nextState = advanceAndResolve(
        nextState,
        decision.playerId,
        forwardSteps,
        false,
        rollDie(randomSource) + rollDie(randomSource)
      );
      break;
    }
    case GameCommandType.ProposeTrade: {
      const activePlayer = getActivePlayer(nextState);
      const trade = command.payload;
      if (trade.proposerPlayerId !== activePlayer.id) {
        throw new Error('Only the player whose turn it is can propose a trade.');
      }
      const blocked = proposalBlockedReason(nextState, trade);
      if (blocked) {
        throw new Error(`${blocked}.`);
      }

      const recipient = getPlayerById(nextState, trade.recipientPlayerId);
      nextState = appendEvents(
        {
          ...nextState,
          tradeState: trade,
          pendingDecision: {
            type: PendingDecisionType.TradeResponse,
            proposerPlayerId: trade.proposerPlayerId,
            recipientPlayerId: trade.recipientPlayerId,
          },
          turn: { ...nextState.turn, phase: TurnPhase.AwaitDecision },
        },
        [
          createEvent(
            nextState.turnNumber,
            `${activePlayer.name} offered ${recipient.name} a trade.`
          ),
        ]
      );
      break;
    }
    case GameCommandType.AcceptTrade: {
      const trade = nextState.tradeState;
      if (
        nextState.pendingDecision.type !== PendingDecisionType.TradeResponse ||
        !trade
      ) {
        throw new Error('There is no trade to answer.');
      }
      const blocked = acceptanceBlockedReason(nextState, trade);
      if (blocked) {
        throw new Error(`${blocked}.`);
      }

      nextState = settleTrade(nextState, trade);
      nextState = resumeTurnAfterDecision(
        {
          ...nextState,
          tradeState: null,
          pendingDecision: { type: PendingDecisionType.None },
        },
        randomSource
      );
      break;
    }
    case GameCommandType.RejectTrade: {
      const trade = nextState.tradeState;
      if (
        nextState.pendingDecision.type !== PendingDecisionType.TradeResponse ||
        !trade
      ) {
        throw new Error('There is no trade to answer.');
      }
      const recipient = getPlayerById(nextState, trade.recipientPlayerId);
      nextState = appendEvents(
        {
          ...nextState,
          tradeState: null,
          pendingDecision: { type: PendingDecisionType.None },
        },
        [createEvent(nextState.turnNumber, `${recipient.name} rejected the trade.`)]
      );
      nextState = resumeTurnAfterDecision(nextState, randomSource);
      break;
    }
    default:
      break;
  }

  return {
    nextState,
    events: eventsSince(state.history, nextState.history),
    // Derived rather than hardcoded true. Every helper returns a new state
    // object, so identity is what "nothing happened" looks like. In practice
    // every command either changes state or throws, so this is still always
    // true today - but it is now a fact about the state, not an assertion.
    saveRequired: nextState !== state,
    uiHints,
  };
};
