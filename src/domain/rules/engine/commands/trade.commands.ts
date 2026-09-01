import {
  GameCommandType,
  PendingDecisionType,
  TurnPhase,
} from '../../../types/game.enums';
import { acceptanceBlockedReason, proposalBlockedReason } from '../../trade.utils';
import {
  appendEvents,
  createEvent,
  getActivePlayer,
  getPlayerById,
} from '../state.utils';
import { settleTrade } from '../tradeSettlement.utils';
import { resumeTurnAfterDecision } from '../turn.utils';
import type { CommandHandlers } from './command.interfaces';

/**
 * Proposing a trade, and answering one.
 *
 * The proposal is checked when it is made and again when it is accepted:
 * mortgage interest is not part of the first check, and the recipient has to be
 * able to cover what they chose. Rejecting hands the turn straight back.
 */

export const tradeCommands: CommandHandlers = {
  [GameCommandType.ProposeTrade]: (state, command, _randomSource) => {
    let nextState = state;
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
    return nextState;
  },
  [GameCommandType.AcceptTrade]: (state, command, randomSource) => {
    let nextState = state;
    const trade = nextState.tradeState;
    if (nextState.pendingDecision.type !== PendingDecisionType.TradeResponse || !trade) {
      throw new Error('There is no trade to answer.');
    }
    const choices = command.mortgageChoices ?? {};
    const blocked = acceptanceBlockedReason(nextState, trade, choices);
    if (blocked) {
      throw new Error(`${blocked}.`);
    }

    nextState = settleTrade(nextState, trade, choices);
    nextState = resumeTurnAfterDecision(
      {
        ...nextState,
        tradeState: null,
        pendingDecision: { type: PendingDecisionType.None },
      },
      randomSource
    );
    return nextState;
  },
  [GameCommandType.RejectTrade]: (state, _command, randomSource) => {
    let nextState = state;
    const trade = nextState.tradeState;
    if (nextState.pendingDecision.type !== PendingDecisionType.TradeResponse || !trade) {
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
    return nextState;
  },
};
