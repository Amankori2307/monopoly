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
import { isOwnableSpace } from './space.utils';
import { DefaultRandomSource, rollDie, shuffle, type RandomSource } from './rng';

const createEvent = (turnNumber: number, message: string): GameEvent => ({
  id: crypto.randomUUID(),
  turnNumber,
  createdAt: new Date().toISOString(),
  message,
});

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

const movePlayerTo = (
  state: GameState,
  playerId: PlayerId,
  nextPosition: number,
  collectGo: boolean
): GameState => {
  const player = getPlayerById(state, playerId);
  let nextState = state;

  if (collectGo && nextPosition < player.position) {
    nextState = updatePlayer(nextState, playerId, (currentPlayer) => ({
      ...currentPlayer,
      cash: currentPlayer.cash + PASS_GO_AMOUNT,
    }));
    nextState = appendEvents(nextState, [
      createEvent(nextState.turnNumber, `${player.name} collected M200 for passing GO.`),
    ]);
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
    return updatePlayer(state, playerId, (currentPlayer) => ({
      ...currentPlayer,
      cash: currentPlayer.cash - amount,
    }));
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
    let nextState = updatePlayer(state, fromPlayerId, (currentPlayer) => ({
      ...currentPlayer,
      cash: currentPlayer.cash - amount,
    }));
    nextState = updatePlayer(nextState, toPlayerId, (currentPlayer) => ({
      ...currentPlayer,
      cash: currentPlayer.cash + amount,
    }));
    return nextState;
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

const ownsEntireColorSet = (
  state: GameState,
  playerId: PlayerId,
  colorGroup: string
): boolean => {
  const matchingSpaces = state.board.filter(
    (space): space is StreetSpace =>
      space.kind === SpaceKind.Street && space.colorGroup === colorGroup
  );

  return matchingSpaces.every(
    (space) => state.ownership[space.id]?.ownerPlayerId === playerId
  );
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

const resolveCard = (state: GameState, deckName: DeckName): GameState => {
  const card = state.decks[deckName][0];
  const remainingCards = state.decks[deckName].slice(1);
  const activePlayer = getActivePlayer(state);
  let nextState = {
    ...state,
    decks: {
      ...state.decks,
      [deckName]:
        card.effect.kind === CardEffectKind.JailFree
          ? remainingCards
          : [...remainingCards, card],
    },
  };

  nextState = appendEvents(nextState, [
    createEvent(nextState.turnNumber, `${activePlayer.name} drew ${card.title}.`),
  ]);

  const { effect } = card;

  switch (effect.kind) {
    case CardEffectKind.Collect:
      return updatePlayer(nextState, activePlayer.id, (player) => {
        return {
          ...player,
          cash: player.cash + effect.amount,
        };
      });
    case CardEffectKind.Pay:
      return resolveBankPayment(
        nextState,
        activePlayer.id,
        effect.amount,
        card.description
      );
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
    case CardEffectKind.JailFree:
      return updatePlayer(nextState, activePlayer.id, (player) => ({
        ...player,
        jailFreeCards: player.jailFreeCards + 1,
      }));
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
            card.description
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
            card.description
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
    nextState = resolveBankPayment(
      nextState,
      player.id,
      space.amount,
      `${space.name} due`
    );
  } else if (space.kind === SpaceKind.GoToJail) {
    return sendPlayerToJail(nextState, player.id, 'Landed on Go To Jail');
  } else if (space.kind === SpaceKind.Chance) {
    nextState = resolveCard(nextState, DeckName.Chance);
  } else if (space.kind === SpaceKind.CommunityChest) {
    nextState = resolveCard(nextState, DeckName.CommunityChest);
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

      nextState = resolvePlayerPayment(
        nextState,
        player.id,
        owner.id,
        rent,
        `${player.name} owes ${owner.name} rent on ${space.name}.`
      );
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${player.name} paid ${getThemeOrDefault(nextState.themeId).currencySymbol}${rent} rent to ${owner.name}.`
        ),
      ]);
    }
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
