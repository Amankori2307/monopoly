import { communityChestCards, chanceCards } from '../cards/indiaEditionCards';
import { indiaEditionBoard, indiaEditionRulesetId } from '../board/indiaEditionBoard';
import {
  GAME_STATE_VERSION,
  HOTELS_AVAILABLE,
  SPEED_DIE_BONUS_CASH,
  HOUSES_AVAILABLE,
  STARTING_CASH,
} from '../constants/game.constants';
import { GameStatus, PendingDecisionType, TurnPhase } from '../types/game.enums';
import type {
  BoardSpace,
  CreateGameInput,
  GameCommandResult,
  GameState,
  OwnershipState,
  PlayerId,
  PlayerState,
  RuntimeGameCommand,
} from '../types/game.interfaces';
import {} from './holdings.utils';
import {} from './trade.utils';
import {} from './buildings.utils';
import { isOwnableSpace } from './space.utils';
import {} from './speedDie.utils';
import { DefaultRandomSource, rollDie, shuffle, type RandomSource } from './rng';
import { createEvent, eventsSince } from './engine/state.utils';
import {} from './engine/money.utils';
import {} from './engine/movement.utils';
import { ensureGameNotFinished } from './engine/turn.utils';
import {} from './engine/auction.utils';
import { auctionCommands } from './engine/commands/auction.commands';
import { buildingCommands } from './engine/commands/building.commands';
import { cardCommands } from './engine/commands/card.commands';
import type { CommandHandlers } from './engine/commands/command.interfaces';
import { debtCommands } from './engine/commands/debt.commands';
import { jailCommands } from './engine/commands/jail.commands';
import { propertyCommands } from './engine/commands/property.commands';
import { speedDieCommands } from './engine/commands/speedDie.commands';
import { tradeCommands } from './engine/commands/trade.commands';
import { turnCommands } from './engine/commands/turn.commands';

/**
 * Every command, in one table.
 *
 * Merged here rather than in a barrel file so that this - the only module that
 * dispatches - is also the only place the full set is visible. A command with
 * no entry is a no-op, which is why the count is worth checking: there are 24.
 */
const COMMAND_HANDLERS: CommandHandlers = {
  ...turnCommands,
  ...propertyCommands,
  ...auctionCommands,
  ...jailCommands,
  ...cardCommands,
  ...debtCommands,
  ...buildingCommands,
  ...speedDieCommands,
  ...tradeCommands,
};

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

/**
 * A bound on re-rolling a tie, so an unlucky run of identical throws cannot
 * hang setup. Ten rounds of every contender throwing the same total is beyond
 * astronomically unlikely; the fallback exists because "beyond unlikely" is not
 * "impossible".
 */
const MAX_OPENING_ROLL_ROUNDS = 10;

/**
 * Who takes the first turn: the highest opening throw, ties re-rolled.
 *
 * Only the players who tied throw again, which is the printed rule - not
 * everyone, and not a silent tie-break.
 */
const rollForStarter = (playerIds: PlayerId[], randomSource: RandomSource): PlayerId => {
  let contenders = playerIds;

  for (let round = 0; round < MAX_OPENING_ROLL_ROUNDS; round += 1) {
    if (contenders.length === 1) {
      return contenders[0];
    }
    const scores = contenders.map((playerId) => ({
      playerId,
      score: rollDie(randomSource) + rollDie(randomSource),
    }));
    const best = Math.max(...scores.map((entry) => entry.score));
    contenders = scores
      .filter((entry) => entry.score === best)
      .map((entry) => entry.playerId);
  }

  return contenders[0];
};

/**
 * The turn order, from the opening throw.
 *
 * The dice decide only who *starts*. Play then passes to the left, so everyone
 * else keeps their seating order relative to the starter - which, with no
 * physical table, is the order they were entered in. So this is a rotation of
 * that order onto the winner, not a ranking.
 *
 * It used to sort every player by their throw, which invented a ranking the
 * rules do not have and broke ties by `Array.prototype.sort` being stable - so
 * the player entered first quietly won every tie.
 */
const chooseFirstPlayerOrder = (
  playerIds: PlayerId[],
  randomSource: RandomSource
): PlayerId[] => {
  const starter = rollForStarter(playerIds, randomSource);
  const startIndex = playerIds.indexOf(starter);

  return [...playerIds.slice(startIndex), ...playerIds.slice(0, startIndex)];
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
        lastMove: null,
        isBankrupt: false,
        bankruptcyRank: null,
      };
      return accumulator;
    },
    {}
  );

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
    pendingAuctionSpaceIds: [],
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
 * The one way anything happens to a game.
 *
 * Every command in the game goes through here: it checks the game is still
 * running, hands off to the one handler registered for that command type, and
 * reports what changed. The handlers live in `engine/commands/`, grouped by
 * area, and each is state in / state out.
 *
 * Throws on an invalid command rather than returning an error, and callers do
 * not catch - `runGameCommand` in the game slice does, which is what keeps a
 * rejected command out of React's event path.
 */
export const executeGameCommand = (
  state: GameState,
  command: RuntimeGameCommand,
  randomSource: RandomSource = new DefaultRandomSource()
): GameCommandResult => {
  ensureGameNotFinished(state);

  const handler = COMMAND_HANDLERS[command.type];
  // The cast is the seam of the dispatch and the only one: CommandHandlers
  // narrows each handler to its own command variant, which a lookup by a
  // runtime value cannot prove to the type checker.
  const nextState = handler
    ? (handler as (s: GameState, c: RuntimeGameCommand, r: RandomSource) => GameState)(
        state,
        command,
        randomSource
      )
    : state;

  return {
    nextState,
    events: eventsSince(state.history, nextState.history),
    // Derived rather than hardcoded true. Every helper returns a new state
    // object, so identity is what "nothing happened" looks like. In practice
    // every command either changes state or throws, so this is still always
    // true today - but it is now a fact about the state, not an assertion.
    saveRequired: nextState !== state,
    /**
     * Advisory notes for the UI. Empty since every command was implemented -
     * the only messages it ever carried were "not implemented yet". Kept in the
     * contract for a future command that needs to say something the history
     * does not; nothing renders it.
     */
    uiHints: [],
  };
};
