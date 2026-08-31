import { communityChestCards, chanceCards } from '../cards/indiaEditionCards';
import { indiaEditionBoard, indiaEditionRulesetId } from '../board/indiaEditionBoard';
import { availableThemes, indiaEditionTheme } from '../themes/indiaEditionTheme';
import {
  AUCTION_MIN_INCREMENT,
  AUCTION_START_PRICE,
  DOUBLES_BEFORE_JAIL,
  GAME_STATE_VERSION,
  HOTEL_BUILD_LEVEL,
  HOTELS_AVAILABLE,
  HOUSES_AVAILABLE,
  JAIL_FINE,
  JAIL_POSITION,
  MAX_HISTORY_EVENTS,
  MAX_JAIL_TURNS,
  PASS_GO_AMOUNT,
  STARTING_CASH,
} from '../constants/game.constants';
import {
  CardEffectKind,
  DeckName,
  GameCommandType,
  GameStatus,
  PendingDecisionType,
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
  OwnableSpace,
  OwnershipState,
  PlayerId,
  PlayerState,
  RuntimeGameCommand,
  StreetSpace,
  ThemeConfig,
} from '../types/game.interfaces';
import { ownsEntireColorSet } from './holdings.utils';
import { isOwnableSpace } from './space.utils';
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
        cash: STARTING_CASH,
        position: 0,
        inJail: false,
        jailTurnsServed: 0,
        jailFreeCards: 0,
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
  collectGo: boolean
): GameState => {
  const player = getPlayerById(state, playerId);
  let nextState = state;

  if (collectGo && nextPosition < player.position) {
    nextState = creditFromBank(nextState, playerId, PASS_GO_AMOUNT, 'passing GO');
  }

  return updatePlayer(nextState, playerId, (currentPlayer) => ({
    ...currentPlayer,
    position: nextPosition,
  }));
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

  return {
    ...state,
    pendingDecision: {
      type: PendingDecisionType.AssetLiquidation,
      playerId,
      amountDue: amount,
      creditorPlayerId: null,
      reason,
    },
    turn: {
      ...state.turn,
      phase: TurnPhase.AwaitDecision,
      reason,
    },
  };
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

  return {
    ...state,
    pendingDecision: {
      type: PendingDecisionType.AssetLiquidation,
      playerId: fromPlayerId,
      amountDue: amount,
      creditorPlayerId: toPlayerId,
      reason,
    },
    turn: {
      ...state.turn,
      phase: TurnPhase.AwaitDecision,
      reason,
    },
  };
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

const completeAuctionIfPossible = (state: GameState): GameState => {
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
    return {
      ...state,
      auctionState: null,
      pendingDecision: { type: PendingDecisionType.None },
      turn: {
        ...state.turn,
        phase: state.turn.canRollAgain
          ? TurnPhase.AwaitExtraRollOrEnd
          : TurnPhase.TurnComplete,
        reason: null,
      },
    };
  }

  const winnerId = auction.highestBidderId;
  const winner = getPlayerById(state, winnerId);
  const space = getSpaceById(state, auction.spaceId);
  let nextState = updatePlayer(state, winnerId, (player) => ({
    ...player,
    cash: player.cash - auction.highestBid,
  }));

  nextState = updateSpaceOwnership(nextState, auction.spaceId, (ownership) => ({
    ...ownership,
    ownerPlayerId: winnerId,
  }));

  nextState = {
    ...nextState,
    auctionState: null,
    pendingDecision: { type: PendingDecisionType.None },
    turn: {
      ...nextState.turn,
      phase: nextState.turn.canRollAgain
        ? TurnPhase.AwaitExtraRollOrEnd
        : TurnPhase.TurnComplete,
      reason: null,
    },
  };

  return appendEvents(nextState, [
    createEvent(
      nextState.turnNumber,
      `${winner.name} won the auction for ${space.name} at ${getThemeOrDefault(nextState.themeId).currencySymbol}${auction.highestBid}.`
    ),
  ]);
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

const advanceToNextTurn = (state: GameState): GameState => {
  const nextIndex = (state.activePlayerIndex + 1) % state.playerOrder.length;
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
const applyCardEffect = (state: GameState, card: DeckCard): GameState => {
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
      return resolveCurrentSpace(nextState, activePlayer.id, false);
    }
    case CardEffectKind.MoveSteps: {
      const destination =
        (activePlayer.position + effect.steps + nextState.board.length) %
        nextState.board.length;
      nextState = movePlayerTo(nextState, activePlayer.id, destination, false);
      return resolveCurrentSpace(nextState, activePlayer.id, false);
    }
    case CardEffectKind.GoToJail:
      return sendPlayerToJail(nextState, activePlayer.id, 'Card sent player to Jail');
    case CardEffectKind.JailFree: {
      const withCard = updatePlayer(nextState, activePlayer.id, (player) => ({
        ...player,
        jailFreeCards: player.jailFreeCards + 1,
      }));
      return appendEvents(withCard, [
        createEvent(withCard.turnNumber, `${activePlayer.name} kept ${card.title}.`),
      ]);
    }
    case CardEffectKind.CollectFromEach: {
      state.playerOrder
        .filter(
          (playerId) =>
            playerId !== activePlayer.id && !state.players[playerId].isBankrupt
        )
        .forEach((playerId) => {
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
      state.playerOrder
        .filter(
          (playerId) =>
            playerId !== activePlayer.id && !state.players[playerId].isBankrupt
        )
        .forEach((playerId) => {
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
  allowExtraRoll: boolean
): GameState => {
  const player = getPlayerById(state, playerId);
  const space = state.board[player.position];
  const lastRollTotal = state.turn.lastRoll?.reduce((sum, roll) => sum + roll, 0) ?? 0;
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
  };
};

const ensureGameNotFinished = (state: GameState) => {
  if (state.status !== GameStatus.InProgress) {
    throw new Error('This game is already complete.');
  }
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
      const isDouble = dieOne === dieTwo;
      const nextDoublesCount = isDouble ? nextState.turn.doublesCount + 1 : 0;

      nextState = {
        ...nextState,
        turn: {
          phase: TurnPhase.ResolvingMovement,
          doublesCount: nextDoublesCount,
          lastRoll: [dieOne, dieTwo],
          canRollAgain: false,
          reason: null,
        },
      };

      if (nextDoublesCount === DOUBLES_BEFORE_JAIL) {
        nextState = sendPlayerToJail(
          nextState,
          activePlayer.id,
          'Rolled doubles three times'
        );
        break;
      }

      const total = dieOne + dieTwo;
      const destination = (activePlayer.position + total) % nextState.board.length;
      nextState = movePlayerTo(nextState, activePlayer.id, destination, true);
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${activePlayer.name} rolled ${dieOne} and ${dieTwo}.`
        ),
      ]);
      nextState = resolveCurrentSpace(nextState, activePlayer.id, isDouble);
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

      nextState = updatePlayer(nextState, buyer.id, (player) => ({
        ...player,
        cash: player.cash - space.price,
      }));
      nextState = updateSpaceOwnership(nextState, space.id, (ownership) => ({
        ...ownership,
        ownerPlayerId: buyer.id,
      }));
      nextState = {
        ...nextState,
        pendingDecision: { type: PendingDecisionType.None },
        turn: {
          ...nextState.turn,
          phase:
            nextState.turn.doublesCount > 0
              ? TurnPhase.AwaitExtraRollOrEnd
              : TurnPhase.TurnComplete,
          canRollAgain: nextState.turn.doublesCount > 0,
          reason: null,
        },
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${buyer.name} bought ${space.name} for ${getThemeOrDefault(nextState.themeId).currencySymbol}${space.price}.`
        ),
      ]);
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
          activeBidderIndex:
            (auction.activeBidderIndex + 1) % auction.activeBidderOrder.length,
        },
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${activeBidder.name} bid ${getThemeOrDefault(nextState.themeId).currencySymbol}${command.amount}.`
        ),
      ]);
      nextState = completeAuctionIfPossible(nextState);
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
        auctionState: {
          ...auction,
          activeBidderIndex:
            (auction.activeBidderIndex + 1) % auction.activeBidderOrder.length,
          passedPlayerIds: [...auction.passedPlayerIds, activeBidderId],
        },
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${getPlayerById(nextState, activeBidderId).name} passed in the auction.`
        ),
      ]);
      nextState = completeAuctionIfPossible(nextState);
      break;
    }
    case GameCommandType.PayJailFine: {
      const activePlayer = getActivePlayer(nextState);
      if (!activePlayer.inJail) {
        throw new Error('Active player is not in Jail.');
      }
      nextState = resolveBankPayment(nextState, activePlayer.id, JAIL_FINE, 'Jail fine');
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
      if (!activePlayer.inJail || activePlayer.jailFreeCards < 1) {
        throw new Error('Get Out of Jail Free card is not available.');
      }
      nextState = updatePlayer(nextState, activePlayer.id, (player) => ({
        ...player,
        inJail: false,
        jailTurnsServed: 0,
        jailFreeCards: player.jailFreeCards - 1,
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
      nextState = applyCardEffect(nextState, decision.card);

      // The effect may have raised its own decision - a MoveTo landing on an
      // unowned site, or a payment the player cannot afford. Only settle the
      // phase when it did not. The inJail guard matters because a card can send
      // the player to jail, and a jailed player must not keep an extra roll.
      if (nextState.pendingDecision.type === PendingDecisionType.None) {
        const canRollAgain =
          nextState.turn.doublesCount > 0 && !getActivePlayer(nextState).inJail;
        nextState = {
          ...nextState,
          turn: {
            ...nextState.turn,
            phase: canRollAgain ? TurnPhase.AwaitExtraRollOrEnd : TurnPhase.TurnComplete,
            canRollAgain,
            reason: null,
          },
        };
      }
      break;
    }
    case GameCommandType.MortgageAsset:
    case GameCommandType.UnmortgageAsset:
    case GameCommandType.BuildHouse:
    case GameCommandType.BuildHotel:
    case GameCommandType.SellHouse:
    case GameCommandType.SellHotel:
    case GameCommandType.ProposeTrade:
    case GameCommandType.AcceptTrade:
    case GameCommandType.RejectTrade:
    case GameCommandType.ConfirmBankruptcy:
      uiHints.push(
        `${command.type} is scaffolded in the engine contract and will be implemented in the next phase.`
      );
      break;
    default:
      break;
  }

  return {
    nextState,
    events: nextState.history,
    saveRequired: true,
    uiHints,
  };
};
