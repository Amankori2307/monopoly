import { HOTEL_BUILD_LEVEL } from '../../../constants/game.constants';
import {
  GameCommandType,
  GameStatus,
  PendingDecisionType,
  TurnPhase,
} from '../../../types/game.enums';
import { getLiquidationValue } from '../../buildings.utils';
import { getPlayerOwnedSpaces } from '../../holdings.utils';
import { afterDecisionResolved } from '../auction.utils';
import { resolveBankPayment, resolvePlayerPayment } from '../money.utils';
import {
  appendEvents,
  createEvent,
  getPlayerById,
  money,
  updatePlayer,
  updateSpaceOwnership,
} from '../state.utils';
import { concludeIfWon } from '../turn.utils';
import type { CommandHandlers } from './command.interfaces';

/**
 * Paying a debt you could not, and leaving the game when you cannot.
 *
 * Both end by asking afterDecisionResolved what comes next - the next debt from
 * the same card, then any queued auction, then the turn. That order lives in
 * one place so settling and going bankrupt cannot disagree about it.
 */

export const debtCommands: CommandHandlers = {
  [GameCommandType.SettleDebt]: (state, _command, randomSource) => {
    let nextState = state;
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

    nextState = afterDecisionResolved(nextState, decision.queued, randomSource);
    return nextState;
  },
  [GameCommandType.ConfirmBankruptcy]: (state, _command, randomSource) => {
    let nextState = state;
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
    // Captured before ownership is cleared: the buildings have to be counted
    // back into the bank's stock, and clearing wipes the levels.
    const buildLevels: Record<string, number> = Object.fromEntries(
      owned.map((space) => [space.id, nextState.ownership[space.id]?.buildLevel ?? 0])
    );

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
      // Debt to the bank: everything returns unowned with its mortgage and
      // buildings cancelled, and the bank auctions each one in turn - which
      // is what the queue is for, since only one auction can run at a time.
      owned.forEach((space) => {
        nextState = updateSpaceOwnership(nextState, space.id, () => ({
          ownerPlayerId: null,
          mortgaged: false,
          buildLevel: 0,
        }));
      });
      // The buildings go back into stock; they were never the bank's to keep.
      const returnedHouses = owned.reduce(
        (total, space) =>
          total +
          (buildLevels[space.id] === HOTEL_BUILD_LEVEL
            ? 0
            : (buildLevels[space.id] ?? 0)),
        0
      );
      const returnedHotels = owned.filter(
        (space) => buildLevels[space.id] === HOTEL_BUILD_LEVEL
      ).length;
      nextState = {
        ...nextState,
        bank: {
          ...nextState.bank,
          housesAvailable: nextState.bank.housesAvailable + returnedHouses,
          hotelsAvailable: nextState.bank.hotelsAvailable + returnedHotels,
        },
        pendingAuctionSpaceIds: [
          ...nextState.pendingAuctionSpaceIds,
          ...owned.map((space) => space.id),
        ],
      };
      nextState = appendEvents(nextState, [
        createEvent(
          nextState.turnNumber,
          `${debtor.name} went bankrupt. ${owned.length} site(s) go to auction.`
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

    // A bankruptcy is the only way a player leaves, so it is the only place
    // the game can become won - and it is checked before the queued auctions
    // run, because auctioning to a lone survivor is theatre.
    const won = concludeIfWon({
      ...nextState,
      turn: { ...nextState.turn, phase: TurnPhase.TurnComplete, canRollAgain: false },
    });
    if (won.status !== GameStatus.InProgress) {
      nextState = { ...won, pendingAuctionSpaceIds: [] };
      return nextState;
    }

    // Debts queued behind this one still stand, unless they were this
    // player's - they have left the game and their creditor has already taken
    // everything they held. Auctions wait until every debt is answered.
    nextState = afterDecisionResolved(nextState, decision.queued, randomSource);
    return nextState;
  },
};
