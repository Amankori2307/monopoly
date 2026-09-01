import { MORTGAGE_INTEREST_PERCENT } from '../../constants/game.constants';
import { GameEventTone, PendingDecisionType, TurnPhase } from '../../types/game.enums';
import type {
  DebtRecord,
  GameState,
  PendingDecision,
  PlayerId,
} from '../../types/game.interfaces';
import {
  appendEvents,
  createEvent,
  getPlayerById,
  money,
  updatePlayer,
} from './state.utils';

/**
 * Every rupee in the game moves through this module, and every movement is
 * logged by the function that makes it.
 *
 * That is the whole point of the three primitives: feedback, the history and
 * the toast feed all read those events, so an amount that moves without one is
 * invisible to the player. Buying and auctions used to move cash inline and the
 * invariant was not total until they stopped.
 *
 * The out-of-cash branches do not move money. They record a debt instead and
 * leave a decision standing, which is what the liquidation panel answers.
 */

/**
 * Money in, from the bank. The counterpart to resolveBankPayment: every credit
 * goes through here so it is logged, rather than each caller remembering to.
 */
export const creditFromBank = (
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
      `${player.name} collected ${money(nextState, amount)} - ${reason}.`,
      GameEventTone.Credit
    ),
  ]);
};

/**
 * What it costs to lift a mortgage: the value borrowed plus interest.
 *
 * The printed rule says "plus 10%" without saying how to round, and every other
 * amount in this game is a whole number. Rounds the interest up, which favours
 * the bank - documented in docs/india-edition-rules.md section 9.
 */
export const getRedemptionCost = (mortgageValue: number): number =>
  mortgageValue + Math.ceil((mortgageValue * MORTGAGE_INTEREST_PERCENT) / 100);

/**
 * Records a debt nobody can currently pay.
 *
 * One card can leave several players insolvent, and only one decision can be
 * pending - so the second and later debts queue behind the first instead of
 * overwriting it. Before this, everyone after the first was silently forgiven.
 */
export const enqueueDebt = (state: GameState, debt: DebtRecord): GameState => {
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
export const nextDecisionAfterDebt = (
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

export const resolveBankPayment = (
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
        `${player.name} paid ${money(paidState, amount)} to the bank - ${reason}.`,
        GameEventTone.Debit
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

export const resolvePlayerPayment = (
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
        `${payer.name} paid ${payee.name} ${money(nextState, amount)} - ${reason}.`,
        GameEventTone.Debit
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
