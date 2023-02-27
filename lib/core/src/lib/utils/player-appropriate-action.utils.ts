import chanceData from '../data/chanceData.json';
import chestData from '../data/chestData.json';
import {
  CARD_TYPES,
  CHEST_OR_CHANCE_ACTION_TYPES,
  DIRECTIONS,
  MODAL_TYPES,
} from '../enums';
import chestOrChanceLogicalFunctions from './chest-or-chance-logical-functions.utils';
import { calcRent } from './player.utils';
export const checkIfUserCrossedStart = (
  cs,
  ps,
  direction,
  currentPlayerId,
  creditPlayerMoney
) => {
  // Check if user crossed start(siteId === 0), if YES then add $200 credit
  if (ps <= 39 && cs >= 0 && ps > cs && direction === DIRECTIONS.FORWARD) {
    creditPlayerMoney(currentPlayerId, 200);
    console.log('+++++++++|Crossed START|++++++++');
  }
};

export const ifCurrentSiteIsOfTypeIsTax = (
  currentSite,
  currentPlayerId,
  debitPlayerMoney,
  setIsDone
) => {
  debitPlayerMoney(currentPlayerId, currentSite.debit);
  setIsDone(true);
};

export const ifCurrentSiteIsOfTypeIsSpecial = (
  currentSiteId,
  currentPlayerId,
  debitPlayerMoney,
  setIsDone,
  movePlayer
) => {
  if (currentSiteId === 10) {
    // If current site is jail
    debitPlayerMoney(currentPlayerId, 100);
    setIsDone(true);
  } else if (currentSiteId === 30) {
    movePlayer(currentPlayerId, 10, DIRECTIONS.BACKWARD);
  } else {
    setIsDone(true);
  }
};

export const ifCurrentSiteIsOfTypeIsSiteOrUtilityOrRealmRails = (
  currentSite,
  currentPlayer,
  activePlayer,
  siteData,
  diceSum,
  noOfCardsInCategory,
  debitPlayerMoney,
  creditPlayerMoney,
  setIsDone,
  setShowModal
) => {
  const money = currentPlayer.money;
  if (siteData.boughtSites.includes(currentSite.id)) {
    const boughtBy = siteData.boughtBy[currentSite.id];
    if (!currentSite.isMortgaged && boughtBy !== currentPlayer.playerId) {
      const rent = calcRent(
        currentSite,
        siteData.playersSites[boughtBy],
        diceSum,
        noOfCardsInCategory
      );
      debitPlayerMoney(activePlayer, rent);
      creditPlayerMoney(boughtBy, rent);
    }
    setIsDone(true);
  } else {
    if (currentSite.sellingPrice <= money) {
      setShowModal(true, MODAL_TYPES.BUY_CARD);
    } else {
      setShowModal(true, MODAL_TYPES.AUCTION_CARD);
    }
  }
};

export const performAction = (
  action,
  currentPlayer,
  siteData,
  totalPlayers,
  debitPlayerMoney,
  creditPlayerMoney,
  movePlayer,
  setIsDone
) => {
  if (action.type === CHEST_OR_CHANCE_ACTION_TYPES.DEBIT) {
    debitPlayerMoney(currentPlayer.playerId, action.amount);
    setIsDone(true);
  } else if (action.type === CHEST_OR_CHANCE_ACTION_TYPES.CREDIT) {
    creditPlayerMoney(currentPlayer.playerId, action.amount);
    setIsDone(true);
  } else if (action.type === CHEST_OR_CHANCE_ACTION_TYPES.MOVE) {
    movePlayer(currentPlayer.playerId, action.to, action.direction);
  } else if (action.type === CHEST_OR_CHANCE_ACTION_TYPES.LOGICAL) {
    const logicalFunc = chestOrChanceLogicalFunctions[action.logicalId];
    if (action.logicalId === 1)
      logicalFunc(
        currentPlayer,
        siteData.playersSites[currentPlayer.playerId],
        debitPlayerMoney,
        setIsDone
      );
    else if (action.logicalId === 2)
      logicalFunc(
        currentPlayer,
        totalPlayers,
        debitPlayerMoney,
        creditPlayerMoney,
        setIsDone
      );
  }
};

export const ifCurrentSiteIsOfTypeIsChestOrChance = (
  currentPlayer,
  currentSite,
  diceSum,
  siteData,
  totalPlayers,
  debitPlayerMoney,
  creditPlayerMoney,
  movePlayer,
  setIsDone
) => {
  let action = {};
  if (currentSite.type === CARD_TYPES.CHEST) action = chestData[diceSum];
  else if (currentSite.type === CARD_TYPES.CHANCE) action = chanceData[diceSum];

  performAction(
    action,
    currentPlayer,
    siteData,
    totalPlayers,
    debitPlayerMoney,
    creditPlayerMoney,
    movePlayer,
    setIsDone
  );
};

export const appropriateActionHelper = (
  currentSite,
  currentPlayer,
  activePlayer,
  totalPlayers,
  siteData,
  diceSum,
  noOfCardsInCategory,
  debitPlayerMoney,
  creditPlayerMoney,
  setIsDone,
  setShowModal,
  movePlayer
) => {
  if (
    currentSite.type === CARD_TYPES.SITE ||
    currentSite.type === CARD_TYPES.REALM_RAILS ||
    currentSite.type === CARD_TYPES.UTILITY
  ) {
    ifCurrentSiteIsOfTypeIsSiteOrUtilityOrRealmRails(
      currentSite,
      currentPlayer,
      activePlayer,
      siteData,
      diceSum,
      noOfCardsInCategory,
      debitPlayerMoney,
      creditPlayerMoney,
      setIsDone,
      setShowModal
    );
  } else if (currentSite.type === CARD_TYPES.SPECIAL) {
    ifCurrentSiteIsOfTypeIsSpecial(
      currentSite.id,
      currentPlayer.playerId,
      debitPlayerMoney,
      setIsDone,
      movePlayer
    );
  } else if (currentSite.type === CARD_TYPES.TAX) {
    ifCurrentSiteIsOfTypeIsTax(
      currentSite,
      currentPlayer.playerId,
      debitPlayerMoney,
      setIsDone
    );
  } else if (
    currentSite.type === CARD_TYPES.CHEST ||
    currentSite.type === CARD_TYPES.CHANCE
  ) {
    ifCurrentSiteIsOfTypeIsChestOrChance(
      currentPlayer,
      currentSite,
      diceSum,
      siteData,
      totalPlayers,
      debitPlayerMoney,
      creditPlayerMoney,
      movePlayer,
      setIsDone
    );
  }
  checkIfUserCrossedStart(
    currentPlayer.site,
    currentPlayer.previousSite,
    currentPlayer.direction,
    currentPlayer.playerId,
    creditPlayerMoney
  );
};
