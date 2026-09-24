import { describe, expect, it } from 'vitest';
import {
  DeckName,
  GameCommandType,
  GameStatus,
  PendingDecisionType,
  TurnPhase,
} from '../types/game.enums';
import type { GameState, StreetSpace } from '../types/game.interfaces';
import { createGameState, executeGameCommand } from '../rules/gameEngine';
import { isStreetSpace } from '../rules/space.utils';
import { SeededRandomSource } from '../rules/rng';
import { chooseBotCommand } from './botPolicy';
import { BOT_CASH_RESERVE } from './bot.constants';

/**
 * What a bot decides, given a board.
 *
 * The policy is pure and takes no `RandomSource`, so every case here is a state
 * built by hand and one assertion about the command that comes back - no dice,
 * no store, no mocking. The dice only appear in the last describe, which plays
 * whole games; that one is the real guard, because a policy can be right about
 * every case somebody thought to write down and still hang a table on the one
 * they did not.
 */

const withBots = (bots: boolean[]): GameState =>
  createGameState(
    {
      name: 'Bot game',
      playerConfigs: bots.map((isBot, index) => ({
        name: isBot ? `Bot ${index + 1}` : `Player ${index + 1}`,
        isBot,
      })),
      themeId: 'india-edition',
      createdAt: '2026-09-24T00:00:00.000Z',
    },
    new SeededRandomSource(7)
  );

/** A game whose active player is a bot, sitting at the top of its turn. */
const botToPlay = (): { game: GameState; botId: string } => {
  const game = withBots([true, false]);
  const botId = game.playerOrder[game.activePlayerIndex];
  return {
    game: game.players[botId].isBot
      ? game
      : { ...game, activePlayerIndex: (game.activePlayerIndex + 1) % 2 },
    botId: game.players[botId].isBot
      ? botId
      : game.playerOrder[1 - game.activePlayerIndex],
  };
};

const streets = (game: GameState): StreetSpace[] => game.board.filter(isStreetSpace);

describe('whose move it is', () => {
  it('says nothing at all on a human turn', () => {
    const game = withBots([false, false]);

    // The single most important thing this returns. A policy that answered on
    // a person's turn would move their piece for them.
    expect(chooseBotCommand(game)).toBeNull();
  });

  it('says nothing once the game is over', () => {
    const { game } = botToPlay();

    expect(
      chooseBotCommand({
        ...game,
        status: GameStatus.Completed,
        pendingDecision: { type: PendingDecisionType.GameOver },
      })
    ).toBeNull();
  });

  it('says nothing for a bot that has gone bankrupt', () => {
    const { game, botId } = botToPlay();

    expect(
      chooseBotCommand({
        ...game,
        players: {
          ...game.players,
          [botId]: { ...game.players[botId], isBankrupt: true },
        },
      })
    ).toBeNull();
  });
});

describe('taking a turn', () => {
  it('rolls when there is nothing else to do', () => {
    const { game } = botToPlay();

    expect(chooseBotCommand(game)).toEqual({ type: GameCommandType.RollTurnDice });
  });

  it('takes the extra roll a double earned', () => {
    const { game } = botToPlay();

    expect(
      chooseBotCommand({
        ...game,
        turn: {
          ...game.turn,
          phase: TurnPhase.AwaitExtraRollOrEnd,
          canRollAgain: true,
        },
      })
    ).toEqual({ type: GameCommandType.RollTurnDice });
  });

  it('ends the turn when it has nothing to spend on', () => {
    const { game, botId } = botToPlay();

    expect(
      chooseBotCommand({
        ...game,
        players: { ...game.players, [botId]: { ...game.players[botId], cash: 0 } },
        turn: { ...game.turn, phase: TurnPhase.TurnComplete },
      })
    ).toEqual({ type: GameCommandType.EndTurn });
  });

  /**
   * The phases the engine passes through inside one synchronous command. A bot
   * that answered here would be sending a second command into a turn that is
   * still resolving its first.
   */
  it('says nothing while a move is still resolving', () => {
    const { game } = botToPlay();

    expect(
      chooseBotCommand({
        ...game,
        turn: { ...game.turn, phase: TurnPhase.ResolvingMovement },
      })
    ).toBeNull();
  });
});

describe('buying a square', () => {
  const landedOn = (game: GameState, botId: string, spaceId: string): GameState => ({
    ...game,
    pendingDecision: {
      type: PendingDecisionType.LandedUnownedProperty,
      spaceId,
      playerId: botId,
    },
  });

  it('buys what it can comfortably afford', () => {
    const { game, botId } = botToPlay();
    const cheapest = [...streets(game)].sort((a, b) => a.price - b.price)[0];

    expect(chooseBotCommand(landedOn(game, botId, cheapest.id))).toEqual({
      type: GameCommandType.BuyLandedAsset,
    });
  });

  /**
   * The reserve is the whole of the bot's survival strategy: it exists for the
   * next rent bill. A bot that spends to its last rupee owns a great deal and
   * goes out to the first railway it lands on, which in a two-handed game ends
   * the game rather than losing it.
   */
  it('declines a square it could only afford by spending its float', () => {
    const { game, botId } = botToPlay();
    const street = streets(game)[0];
    const barelyAfford = street.price + BOT_CASH_RESERVE - 1;

    const next = landedOn(
      {
        ...game,
        players: {
          ...game.players,
          [botId]: { ...game.players[botId], cash: barelyAfford },
        },
      },
      botId,
      street.id
    );
    expect(chooseBotCommand(next)).toEqual({ type: GameCommandType.DeclineLandedAsset });
  });

  /**
   * And spends the float anyway for the last street of a colour group, because
   * that is the one purchase there is no second chance at: the other players
   * will not sell it back, and a set is what makes money in this game.
   */
  it('spends its float to complete a colour set', () => {
    const { game, botId } = botToPlay();
    const target = streets(game)[0];
    const siblings = streets(game).filter(
      (street) => street.colorGroup === target.colorGroup && street.id !== target.id
    );
    const ownership = { ...game.ownership };
    siblings.forEach((street) => {
      ownership[street.id] = { ...ownership[street.id], ownerPlayerId: botId };
    });

    const next = landedOn(
      {
        ...game,
        ownership,
        players: {
          ...game.players,
          [botId]: { ...game.players[botId], cash: target.price },
        },
      },
      botId,
      target.id
    );
    expect(chooseBotCommand(next)).toEqual({ type: GameCommandType.BuyLandedAsset });
  });

  /**
   * `buyBlockedReason` is the RULE and the engine throws from it; wanting a
   * square is only an opinion. Asking the opinion alone is how a bot offers the
   * engine a command it will refuse - and an engine throw reaches nothing but
   * `ErrorBoundary`, so it takes the page down rather than the turn.
   */
  it('never tries to buy what it cannot pay for', () => {
    const { game, botId } = botToPlay();
    const target = streets(game)[0];
    const siblings = streets(game).filter(
      (street) => street.colorGroup === target.colorGroup && street.id !== target.id
    );
    const ownership = { ...game.ownership };
    siblings.forEach((street) => {
      ownership[street.id] = { ...ownership[street.id], ownerPlayerId: botId };
    });

    // A set it badly wants, and one rupee short of the price.
    const next = landedOn(
      {
        ...game,
        ownership,
        players: {
          ...game.players,
          [botId]: { ...game.players[botId], cash: target.price - 1 },
        },
      },
      botId,
      target.id
    );
    expect(chooseBotCommand(next)).toEqual({ type: GameCommandType.DeclineLandedAsset });
  });
});

describe('the decisions it is handed', () => {
  it('acknowledges a drawn card', () => {
    const { game, botId } = botToPlay();
    const card = game.decks.chance[0];

    expect(
      chooseBotCommand({
        ...game,
        pendingDecision: {
          type: PendingDecisionType.CardDraw,
          playerId: botId,
          deck: DeckName.Chance,
          card,
        },
      })
    ).toEqual({ type: GameCommandType.AcknowledgeCard });
  });

  /**
   * A stated limit rather than a stub. Valuing an offer is the whole of
   * Monopoly strategy, and a bot that accepted badly would be worse than one
   * that never accepts - a human would find the lever and the game would stop
   * being a game. Rejecting always resolves the decision, so no trade can hang
   * a table.
   */
  it('rejects every trade', () => {
    const { game, botId } = botToPlay();

    expect(
      chooseBotCommand({
        ...game,
        pendingDecision: {
          type: PendingDecisionType.TradeResponse,
          proposerPlayerId: game.playerOrder.find((id) => id !== botId) ?? botId,
          recipientPlayerId: botId,
        },
      })
    ).toEqual({ type: GameCommandType.RejectTrade });
  });

  it('spends a Get Out of Jail Free card rather than rolling for it', () => {
    const { game, botId } = botToPlay();
    const card = game.decks.chance[0];

    expect(
      chooseBotCommand({
        ...game,
        players: {
          ...game.players,
          [botId]: { ...game.players[botId], inJail: true, jailFreeCards: [card] },
        },
      })
    ).toEqual({ type: GameCommandType.UseJailFreeCard });
  });

  /**
   * And rolls when it holds none, never paying voluntarily: the roll is free,
   * the fine is not, and the engine already charges the fine on the third
   * failure. Paying early buys certainty about a move the bot has no particular
   * use for.
   */
  it('rolls its way out of Jail when it holds no card', () => {
    const { game, botId } = botToPlay();

    expect(
      chooseBotCommand({
        ...game,
        players: { ...game.players, [botId]: { ...game.players[botId], inJail: true } },
      })
    ).toEqual({ type: GameCommandType.AttemptJailRoll });
  });

  /**
   * The Jail panel is derived from `player.inJail` rather than from
   * `pendingDecision`, so a jailed player's choice arrives with no decision on
   * the state at all - and `attemptJailRoll` refuses a second roll in one turn.
   * Reading Jail at any phase but `AwaitRoll` is how a bot sends that second
   * roll.
   */
  it('does not try to leave Jail twice in one turn', () => {
    const { game, botId } = botToPlay();

    const next = chooseBotCommand({
      ...game,
      players: { ...game.players, [botId]: { ...game.players[botId], inJail: true } },
      turn: { ...game.turn, phase: TurnPhase.TurnComplete },
    });
    expect(next).toEqual({ type: GameCommandType.EndTurn });
  });
});

/**
 * The guard, and the reason this file exists.
 *
 * Every describe above asserts a case somebody thought to write down. This one
 * plays whole games, and the two things it proves cannot be proved any other
 * way: that the policy never offers the engine a command it refuses, and that
 * it never runs out of moves before the game is over.
 *
 * The second is the one that matters. `null` is how the policy says "no legal
 * move", the driver stops on it, and a bot that stops mid-turn is a table that
 * is simply dead - no modal, no Roll, no End turn, and nothing on screen saying
 * why. That is the `attemptJailRoll` deadlock CLAUDE.md section 8 records, in a
 * form where nobody is even watching for it.
 *
 * Four seeds rather than one, because a single seed exercises one path through
 * the deck and one sequence of squares - and the decisions least likely to be
 * covered by hand are exactly the rare ones: a bankruptcy, a building auction,
 * a bus move, three of a kind.
 */
describe('playing a whole game', () => {
  const STEP_CAP = 20000;

  const playOut = (seed: number) => {
    // Every seat a bot, which the setup form refuses on purpose - a table of
    // nothing but bots is not a game to sit at. It is exactly the right thing
    // HERE, where nobody is sitting at it and the point is to reach every
    // decision the engine can raise.
    let state = withBots([true, true, true, true]);
    const random = new SeededRandomSource(seed);
    let steps = 0;
    let lastCommand: string | null = null;

    for (; steps < STEP_CAP; steps += 1) {
      const command = chooseBotCommand(state);
      if (!command) {
        break;
      }
      lastCommand = command.type;
      // Unwrapped on purpose: a throw here IS the failure, and the message the
      // engine raises is more use than any assertion wrapped around it.
      state = executeGameCommand(state, command, random).nextState;
    }
    return { state, steps, lastCommand };
  };

  it.each([1, 17, 404, 9001])('never runs out of legal moves (seed %i)', (seed) => {
    const { state, steps, lastCommand } = playOut(seed);

    // It stopped. The only acceptable reason is that the game finished: any
    // other stop is a bot sitting on a decision it has no answer for, and the
    // last command it managed names the branch to look at.
    const finished =
      state.pendingDecision.type === PendingDecisionType.GameOver ||
      state.winnerPlayerId !== null ||
      state.status === GameStatus.Completed;

    expect({ finished, lastCommand, steps: steps < STEP_CAP }).toEqual({
      finished: true,
      lastCommand,
      steps: true,
    });
  });

  it('leaves exactly one player standing', () => {
    const { state } = playOut(17);

    const solvent = state.playerOrder.filter((id) => !state.players[id].isBankrupt);
    expect(solvent).toHaveLength(1);
    expect(state.winnerPlayerId).toBe(solvent[0]);
  });
});
