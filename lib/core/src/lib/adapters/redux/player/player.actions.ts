import { IActionType } from '../../../interfaces';

// Player
export const MOVE_PLAYER: IActionType = 'MOVE_PLAYER';
export const SET_TOTAL_PLAYERS: IActionType = 'SET_TOTAL_PLAYERS';
export const SET_ACTIVE_PLAYER: IActionType = 'SET_ACTIVE_PLAYER';
export const DEBIT_PLAYER_MONEY: IActionType = 'DEBIT_PLAYER_MONEY';
export const CREDIT_PLAYER_MONEY: IActionType = 'CREDIT_PLAYER_MONEY';
export const SET_IS_MOVING: IActionType = 'SET_IS_MOVING';

export function movePlayer(playerId, currentSite, direction) {
  return {
    type: MOVE_PLAYER,
    payload: {
      playerId,
      currentSite,
      direction,
    },
  };
}

export function setTotalPlayers(data) {
  return {
    type: SET_TOTAL_PLAYERS,
    payload: data,
  };
}

export function setActivePlayer() {
  return {
    type: SET_ACTIVE_PLAYER,
    payload: null,
  };
}

export function debitPlayerMoney(playerId, amount) {
  return {
    type: DEBIT_PLAYER_MONEY,
    payload: {
      playerId,
      amount,
    },
  };
}
export function creditPlayerMoney(playerId, amount) {
  return {
    type: CREDIT_PLAYER_MONEY,
    payload: {
      playerId,
      amount,
    },
  };
}

export function setIsMoving(playerId, isMoving) {
  return {
    type: SET_IS_MOVING,
    payload: {
      playerId: playerId,
      isMoving: isMoving,
    },
  };
}
