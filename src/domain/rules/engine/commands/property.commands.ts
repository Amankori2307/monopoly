import {
  GameCommandType,
  GameEventCue,
  PendingDecisionType,
} from '../../../types/game.enums';
import { groupHasBuildings, isOwnedBy } from '../../holdings.utils';
import { buyBlockedReason } from '../../playerActions.utils';
import { isOwnableSpace, isStreetSpace } from '../../space.utils';
import { startAuction } from '../auction.utils';
import { creditFromBank, getRedemptionCost, resolveBankPayment } from '../money.utils';
import {
  getActivePlayer,
  getPlayerById,
  getSpaceById,
  updateSpaceOwnership,
} from '../state.utils';
import { resumeTurnAfterDecision } from '../turn.utils';
import type { CommandHandlers } from './command.interfaces';

/**
 * Buying what you landed on, declining it, and the two mortgage commands.
 *
 * Mortgaging deliberately leaves `pendingDecision` and `turn` alone: it is how
 * a player raises cash during a liquidation, and clearing the decision would
 * recreate the deadlock it exists to answer.
 */

export const propertyCommands: CommandHandlers = {
  [GameCommandType.BuyLandedAsset]: (state, _command, randomSource) => {
    let nextState = state;
    if (nextState.pendingDecision.type !== PendingDecisionType.LandedUnownedProperty) {
      throw new Error('There is no property awaiting purchase.');
    }
    const decision = nextState.pendingDecision;
    const buyer = getPlayerById(nextState, decision.playerId);
    const space = getSpaceById(nextState, decision.spaceId);
    if (!isOwnableSpace(space)) {
      throw new Error('Current space is not buyable.');
    }
    // From the shared rule, so the disabled Buy button and this throw always
    // give the same answer - the auction's bid guard works the same way.
    const blockedReason = buyBlockedReason(buyer.cash, space.price);
    if (blockedReason) {
      throw new Error(blockedReason);
    }

    // Through the money primitive, not inline: it is what logs the movement,
    // and an amount that skips it is invisible to the feedback that reads the
    // history. Affordability is guarded above, so no liquidation can arise.
    nextState = resolveBankPayment(
      nextState,
      buyer.id,
      space.price,
      `bought ${space.name}`,
      GameEventCue.Bought
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
    return nextState;
  },
  [GameCommandType.DeclineLandedAsset]: (state, _command, _randomSource) => {
    let nextState = state;
    if (nextState.pendingDecision.type !== PendingDecisionType.LandedUnownedProperty) {
      throw new Error('There is no property awaiting decline.');
    }
    nextState = startAuction(nextState, nextState.pendingDecision.spaceId);
    return nextState;
  },
  [GameCommandType.MortgageAsset]: (state, command, _randomSource) => {
    let nextState = state;
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
    return nextState;
  },
  [GameCommandType.UnmortgageAsset]: (state, command, _randomSource) => {
    let nextState = state;
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
    return nextState;
  },
};
