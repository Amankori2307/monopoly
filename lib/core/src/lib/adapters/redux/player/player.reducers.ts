import { IAction, IPlayerState, SetIsMovingAction } from 'lib/core/src/lib';
import { createPlayerData } from '../../../utils/player.utils';
import rfdc from 'rfdc';
import {
  CREDIT_PLAYER_MONEY,
  DEBIT_PLAYER_MONEY,
  MOVE_PLAYER,
  SET_ACTIVE_PLAYER,
  SET_IS_MOVING,
  SET_TOTAL_PLAYERS,
} from './player.actions';


const clone = rfdc();
const initialState: IPlayerState = {
  activePlayer: 0,
  totalPlayers: 0,
  players: [],
};

const movePlayerReducer = (state: IPlayerState, payload: any): IPlayerState => {
  const players = [...state.players];
  const currentPlayer = players[payload.playerId];
  players[payload.playerId] = {
    ...currentPlayer,
    previousSite: currentPlayer.site,
    site: payload.currentSite,
    isMoving: true,
    direction: payload.direction,
  };
  return {
    ...state,
    players: players,
  };
};
const setTotalPlayersReducer = (
  state: IPlayerState,
  payload: any
): IPlayerState => {
  return {
    ...state,
    players: createPlayerData(payload),
    totalPlayers: payload,
  };
};

const setActivePlayerReducer = (state: IPlayerState): IPlayerState => {
  return {
    ...state,
    activePlayer: (state.activePlayer + 1) % state.totalPlayers,
  };
};

const debitPlayerMoneyReducer = (
  state: IPlayerState,
  payload: any
): IPlayerState => {
  const _state = { ...state };
  const money = _state.players[payload.playerId].money;
  _state.players[payload.playerId].money = money - payload.amount;
  return {
    ..._state,
  };
};

const creditPlayerMoneyReducer = (
  state: IPlayerState,
  payload: any
): IPlayerState => {
  const _players = { ...state.players };
  const currentPlayer = { ...state.players[payload.playerId] };
  const money = currentPlayer.money;
  currentPlayer.money = money + payload.amount;
  _players[payload.playerId] = currentPlayer;
  return {
    ...state,
    players: _players,
  };
};

const setIsMovingReducer = (
  state: IPlayerState,
  payload: SetIsMovingAction
): IPlayerState => {
  const players = clone(state.players);
  players[payload.playerId].isMoving = payload.isMoving;
  return {
    ...state,
    ...players,
  };
};

export const playerReducer = (state = initialState, action: IAction) => {
  const { type, payload } = action;
  switch (type) {
    case MOVE_PLAYER:
      return movePlayerReducer(state, payload);
    case SET_TOTAL_PLAYERS:
      return setTotalPlayersReducer(state, payload);
    case SET_ACTIVE_PLAYER:
      return setActivePlayerReducer(state);
    case DEBIT_PLAYER_MONEY:
      return debitPlayerMoneyReducer(state, payload);
    case CREDIT_PLAYER_MONEY:
      return creditPlayerMoneyReducer(state, payload);
    case SET_IS_MOVING:
      return setIsMovingReducer(state, payload);
    default:
      return state;
  }
};
