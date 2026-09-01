import type { TradableSite } from './trade.interfaces';

export type { TradableSite, TradeSide } from './trade.interfaces';

import { MORTGAGE_INTEREST_PERCENT } from '../constants/game.constants';
import { MortgageChoice } from '../types/game.enums';
import type { GameState, PlayerId, SpaceId, TradeState } from '../types/game.interfaces';
import { groupHasBuildings, getPlayerOwnedSpaces } from './holdings.utils';
import { isStreetSpace } from './space.utils';

/**
 * Trade rules, kept pure. As with buildings, one statement of each rule serves
 * both the engine's throw and the builder's disabled control.
 */

/** The 10% a receiver pays the bank to take a mortgaged site as it stands. */
export const getMortgageTransferFee = (mortgageValue: number): number =>
  Math.ceil((mortgageValue * MORTGAGE_INTEREST_PERCENT) / 100);

/**
 * Why a site cannot go into a trade, or '' when it can.
 *
 * Buildings are the only real blocker, and the rule covers the whole colour
 * group: you cannot trade one green site while another green site holds houses.
 */
export const tradeBlockedReason = (
  state: GameState,
  spaceId: SpaceId,
  ownerId: PlayerId
): string => {
  const space = state.board.find((candidate) => candidate.id === spaceId);
  if (!space) return 'No such space';
  if (state.ownership[spaceId]?.ownerPlayerId !== ownerId) {
    return 'Not owned by that player';
  }
  if (isStreetSpace(space) && groupHasBuildings(state, space.colorGroup)) {
    return 'Sell the buildings in this colour set first';
  }
  return '';
};

/** Everything a player holds, with the reason any of it cannot be traded. */
export const getTradableSites = (state: GameState, playerId: PlayerId): TradableSite[] =>
  getPlayerOwnedSpaces(state, playerId).map((space) => ({
    spaceId: space.id,
    space,
    ownership: state.ownership[space.id],
    blockedReason: tradeBlockedReason(state, space.id, playerId),
  }));

/**
 * What the receiver of these sites owes the bank, given what they chose to do
 * about each mortgage.
 *
 * `keep` is the 10% interest; `redeem` clears the mortgage outright, which is
 * the mortgage value plus the same 10%. Anything unstated is `keep`, so an
 * omitted choice costs the less of the two.
 */
export const getTransferFees = (
  state: GameState,
  spaceIds: SpaceId[],
  choices: Partial<Record<SpaceId, MortgageChoice>> = {}
): number =>
  spaceIds.reduce((total, spaceId) => {
    if (!state.ownership[spaceId]?.mortgaged) return total;
    const space = state.board.find((candidate) => candidate.id === spaceId);
    if (!space || !('mortgageValue' in space)) return total;

    const interest = getMortgageTransferFee(space.mortgageValue);
    return (
      total +
      (choices[spaceId] === MortgageChoice.Redeem
        ? space.mortgageValue + interest
        : interest)
    );
  }, 0);

const sideBlockedReason = (
  state: GameState,
  playerId: PlayerId,
  cash: number,
  spaceIds: SpaceId[],
  jailCards: number,
  who: string
): string => {
  const player = state.players[playerId];
  if (!player) return `${who} is not in this game`;
  if (player.isBankrupt) return `${who} has left the game`;
  if (cash < 0 || jailCards < 0) return 'A trade cannot ask for a negative amount';
  if (player.cash < cash) return `${who} does not have that much cash`;
  if (player.jailFreeCards.length < jailCards) {
    return `${who} does not have that many Get Out of Jail Free cards`;
  }

  const blocked = spaceIds
    .map((spaceId) => tradeBlockedReason(state, spaceId, playerId))
    .find((reason) => reason !== '');
  return blocked ?? '';
};

/**
 * Why a proposed trade cannot be made, or '' when it can.
 *
 * The recipient's cash is checked here too, so the proposer is told up front
 * rather than having the trade fail on acceptance. Their mortgage fees are not:
 * those are only owed once they accept, and a recipient short of them can still
 * decline.
 */
export const proposalBlockedReason = (state: GameState, trade: TradeState): string => {
  if (trade.proposerPlayerId === trade.recipientPlayerId) {
    return 'You cannot trade with yourself';
  }

  const emptyOffer =
    trade.offeredCash === 0 &&
    trade.offeredSpaceIds.length === 0 &&
    trade.offeredJailCards === 0;
  const emptyRequest =
    trade.requestedCash === 0 &&
    trade.requestedSpaceIds.length === 0 &&
    trade.requestedJailCards === 0;
  if (emptyOffer && emptyRequest) {
    return 'A trade has to move something';
  }

  return (
    sideBlockedReason(
      state,
      trade.proposerPlayerId,
      trade.offeredCash,
      trade.offeredSpaceIds,
      trade.offeredJailCards,
      'You'
    ) ||
    sideBlockedReason(
      state,
      trade.recipientPlayerId,
      trade.requestedCash,
      trade.requestedSpaceIds,
      trade.requestedJailCards,
      state.players[trade.recipientPlayerId]?.name ?? 'They'
    )
  );
};

/**
 * Why an agreed trade cannot be carried out, or '' when it can.
 *
 * Re-checks everything: a trade sits pending while its own decision blocks the
 * turn, but mortgage fees were never part of the proposal's checks and the
 * recipient has to be able to pay them.
 */
export const acceptanceBlockedReason = (
  state: GameState,
  trade: TradeState,
  choices: Partial<Record<SpaceId, MortgageChoice>> = {}
): string => {
  const proposal = proposalBlockedReason(state, trade);
  if (proposal) return proposal;

  // Each side pays for the mortgaged sites it receives, and its own cash out,
  // from the same pocket. Only the recipient gets a choice - the proposer
  // agreed to the deal without knowing what the other side would elect.
  const proposerOwes =
    trade.offeredCash + getTransferFees(state, trade.requestedSpaceIds);
  const recipientOwes =
    trade.requestedCash + getTransferFees(state, trade.offeredSpaceIds, choices);

  if (state.players[trade.proposerPlayerId].cash < proposerOwes) {
    return 'The proposer cannot cover the mortgage interest on this trade';
  }
  if (state.players[trade.recipientPlayerId].cash < recipientOwes) {
    return 'You cannot cover the mortgage interest on this trade';
  }
  return '';
};
