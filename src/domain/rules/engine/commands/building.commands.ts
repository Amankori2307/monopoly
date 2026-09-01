import type { RandomSource } from '../../rng';
import {
  HOTEL_BUILD_LEVEL,
  MAX_HOUSES_PER_SITE,
} from '../../../constants/game.constants';
import {
  BuildingKind,
  GameCommandType,
  PendingDecisionType,
} from '../../../types/game.enums';
import type { GameState, RuntimeGameCommand } from '../../../types/game.interfaces';
import {
  buildBlockedReason,
  getBuildLevel,
  getPlacementSites,
  getSaleRefund,
  isBuildingStockContested,
  sellBlockedReason,
} from '../../buildings.utils';
import { isStreetSpace } from '../../space.utils';
import { startAuction } from '../auction.utils';
import { creditFromBank, resolveBankPayment } from '../money.utils';
import {
  appendEvents,
  createEvent,
  getActivePlayer,
  getPlayerById,
  getSpaceById,
  updateSpaceOwnership,
} from '../state.utils';
import { resumeTurnAfterDecision } from '../turn.utils';
import type { CommandHandlers } from './command.interfaces';

/**
 * Building, selling, and placing a building won at auction.
 *
 * The rules themselves are in buildings.utils, stated once, so the engine's
 * throw here and the site panel's disabled button read from the same sentence.
 * Selling leaves `pendingDecision` alone for the same reason mortgaging does:
 * it is how a built-up player raises cash mid-liquidation.
 */

const buildHouseHandler = (
  state: GameState,
  command: Extract<
    RuntimeGameCommand,
    { type: GameCommandType.BuildHouse | GameCommandType.BuildHotel }
  >,
  _randomSource: RandomSource
): GameState => {
  let nextState = state;
  const activePlayer = getActivePlayer(nextState);
  const space = getSpaceById(nextState, command.spaceId);
  const blocked = buildBlockedReason(nextState, command.spaceId, activePlayer.id);
  if (blocked) {
    throw new Error(`Cannot build on ${space.name}: ${blocked}.`);
  }
  if (!isStreetSpace(space)) {
    throw new Error(`${space.name} cannot be built on.`);
  }

  const level = getBuildLevel(nextState, space.id);
  const isHotel = level === MAX_HOUSES_PER_SITE;
  const cost = isHotel ? space.hotelCost : space.houseCost;
  const kind = isHotel ? BuildingKind.Hotel : BuildingKind.House;

  // The printed rule: when the bank cannot satisfy everyone who could
  // build, the last buildings are sold at auction rather than to whoever
  // asked first. Opening price is this site's printed cost.
  if (isBuildingStockContested(nextState, kind)) {
    nextState = startAuction(nextState, space.id, {
      buildingKind: kind,
      startPrice: cost,
    });
    return nextState;
  }

  nextState = resolveBankPayment(
    nextState,
    activePlayer.id,
    cost,
    isHotel ? `built a hotel on ${space.name}` : `built a house on ${space.name}`
  );
  nextState = updateSpaceOwnership(nextState, space.id, (ownership) => ({
    ...ownership,
    buildLevel: level + 1,
  }));
  // A hotel takes the site's four houses back into stock, which is what
  // makes a house shortage a real constraint rather than a counter.
  nextState = {
    ...nextState,
    bank: {
      ...nextState.bank,
      housesAvailable: isHotel
        ? nextState.bank.housesAvailable + MAX_HOUSES_PER_SITE
        : nextState.bank.housesAvailable - 1,
      hotelsAvailable: isHotel
        ? nextState.bank.hotelsAvailable - 1
        : nextState.bank.hotelsAvailable,
    },
  };
  return nextState;
};

const sellHouseHandler = (
  state: GameState,
  command: Extract<
    RuntimeGameCommand,
    { type: GameCommandType.SellHouse | GameCommandType.SellHotel }
  >,
  _randomSource: RandomSource
): GameState => {
  let nextState = state;
  const activePlayer = getActivePlayer(nextState);
  const space = getSpaceById(nextState, command.spaceId);
  const blocked = sellBlockedReason(nextState, command.spaceId, activePlayer.id);
  if (blocked) {
    throw new Error(`Cannot sell on ${space.name}: ${blocked}.`);
  }
  if (!isStreetSpace(space)) {
    throw new Error(`${space.name} carries no buildings.`);
  }

  const level = getBuildLevel(nextState, space.id);
  const isHotel = level === HOTEL_BUILD_LEVEL;

  nextState = creditFromBank(
    nextState,
    activePlayer.id,
    getSaleRefund(nextState, space),
    isHotel ? `sold the hotel on ${space.name}` : `sold a house on ${space.name}`
  );
  nextState = updateSpaceOwnership(nextState, space.id, (ownership) => ({
    ...ownership,
    buildLevel: level - 1,
  }));
  nextState = {
    ...nextState,
    bank: {
      ...nextState.bank,
      housesAvailable: isHotel
        ? nextState.bank.housesAvailable - MAX_HOUSES_PER_SITE
        : nextState.bank.housesAvailable + 1,
      hotelsAvailable: isHotel
        ? nextState.bank.hotelsAvailable + 1
        : nextState.bank.hotelsAvailable,
    },
  };
  // Like mortgaging, this deliberately leaves pendingDecision and turn
  // alone: selling buildings is how a player raises cash mid-liquidation.
  return nextState;
};

export const buildingCommands: CommandHandlers = {
  // Building and selling share their guards with the UI: buildBlockedReason /
  // sellBlockedReason are the single statement of the rules, so a disabled
  // button and a thrown command can never disagree.
  [GameCommandType.BuildHouse]: buildHouseHandler,
  [GameCommandType.BuildHotel]: buildHouseHandler,
  [GameCommandType.ChooseBuildingSite]: (state, command, randomSource) => {
    let nextState = state;
    const decision = nextState.pendingDecision;
    if (decision.type !== PendingDecisionType.BuildingPlacement) {
      throw new Error('There is no building waiting to be placed.');
    }
    const legalSites = getPlacementSites(
      nextState,
      decision.playerId,
      decision.buildingKind
    );
    if (!legalSites.some((site) => site.spaceId === command.spaceId)) {
      throw new Error('That site cannot take this building.');
    }

    const space = getSpaceById(nextState, command.spaceId);
    const isHotel = decision.buildingKind === BuildingKind.Hotel;
    // Already paid for at auction, so this only moves the building.
    nextState = updateSpaceOwnership(nextState, command.spaceId, (ownership) => ({
      ...ownership,
      buildLevel: ownership.buildLevel + 1,
    }));
    nextState = {
      ...nextState,
      bank: {
        ...nextState.bank,
        housesAvailable: isHotel
          ? nextState.bank.housesAvailable + MAX_HOUSES_PER_SITE
          : nextState.bank.housesAvailable - 1,
        hotelsAvailable: isHotel
          ? nextState.bank.hotelsAvailable - 1
          : nextState.bank.hotelsAvailable,
      },
    };
    nextState = appendEvents(nextState, [
      createEvent(
        nextState.turnNumber,
        `${getPlayerById(nextState, decision.playerId).name} placed the ${decision.buildingKind} on ${space.name}.`
      ),
    ]);
    nextState = resumeTurnAfterDecision(
      { ...nextState, pendingDecision: { type: PendingDecisionType.None } },
      randomSource
    );
    return nextState;
  },
  [GameCommandType.SellHouse]: sellHouseHandler,
  [GameCommandType.SellHotel]: sellHouseHandler,
};
