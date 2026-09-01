import { MortgageChoice } from '../../types/game.enums';
import type {
  GameState,
  PlayerId,
  SpaceId,
  TradeState,
} from '../../types/game.interfaces';
import { getTransferFees } from '../trade.utils';
import { resolveBankPayment, resolvePlayerPayment } from './money.utils';
import {
  appendEvents,
  createEvent,
  getPlayerById,
  updatePlayer,
  updateSpaceOwnership,
} from './state.utils';

/**
 * Carrying out a trade both players have agreed to.
 *
 * Everything moves at once: cash both ways, the sites, and the jail cards
 * themselves rather than a count, so each keeps the deck it has to return to.
 *
 * Only the receiving side chooses what to do about a mortgage. The proposer
 * agreed to the deal without knowing what the other player would elect, so
 * letting them choose would change the price of a deal already struck.
 */

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
export const settleTrade = (
  state: GameState,
  trade: TradeState,
  // Only the recipient chooses: the proposer agreed to the deal without
  // knowing what the other side would elect to do about a mortgage.
  choices: Partial<Record<SpaceId, MortgageChoice>>
): GameState => {
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

  const moveSites = (
    spaceIds: SpaceId[],
    toPlayerId: PlayerId,
    sideChoices: Partial<Record<SpaceId, MortgageChoice>>
  ) => {
    const fees = getTransferFees(nextState, spaceIds, sideChoices);
    spaceIds.forEach((spaceId) => {
      const redeemed =
        nextState.ownership[spaceId]?.mortgaged &&
        sideChoices[spaceId] === MortgageChoice.Redeem;
      nextState = updateSpaceOwnership(nextState, spaceId, (ownership) => ({
        ...ownership,
        ownerPlayerId: toPlayerId,
        // Redeeming clears it as part of the transfer; keeping leaves it
        // mortgaged for the new owner to lift later at the usual cost.
        mortgaged: redeemed ? false : ownership.mortgaged,
      }));
    });
    if (fees > 0) {
      nextState = resolveBankPayment(
        nextState,
        toPlayerId,
        fees,
        'mortgages on traded sites'
      );
    }
  };

  moveSites(trade.offeredSpaceIds, trade.recipientPlayerId, choices);
  // The proposer never gets the choice, so their side is always kept mortgaged.
  moveSites(trade.requestedSpaceIds, trade.proposerPlayerId, {});

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
