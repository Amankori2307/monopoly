import {
  Action,
  ISite,
  TActionType,
  TBoughtBy,
  TNoOfCardsInCategory,
  TPlayersSites,
} from '../../../interfaces';
import {
  calcNoOfCardsInCategory,
  initNoOfCardsInCategory,
  initPlayersSites,
} from '../../../utils/site.utils';
import {
  BUILD_ON_SITE,
  BUY_SITE,
  MORTGAGE_SITE,
  REDEEM_SITE,
  SELL_BUILD,
  SET_SITES,
} from './site.actions';

export interface ISiteState {
  sites: ISite[];
  boughtSites: number[];
  boughtBy: TBoughtBy;
  playersSites: TPlayersSites;
  noOfCardsInCategory: TNoOfCardsInCategory;
}

const initialState: ISiteState = {
  sites: [],
  boughtSites: [],
  boughtBy: Array(40).fill(null),
  playersSites: initPlayersSites(),
  noOfCardsInCategory: initNoOfCardsInCategory(),
};

const buySiteReducer = (state: ISiteState, payload: any): ISiteState => {
  const _boughtBy = [...state.boughtBy];
  _boughtBy[payload.siteData.id] = payload.playerId;
  return {
    ...state,
    boughtSites: [...state.boughtSites, payload.siteData.id],
    boughtBy: _boughtBy,
    playersSites: {
      ...state.playersSites,
      [payload.playerId]: [
        ...state.playersSites[payload.playerId],
        payload.siteData,
      ],
    },
  };
};

const setSitesReducer = (state: ISiteState, payload: any): ISiteState => {
  return {
    ...state,
    sites: payload,
    noOfCardsInCategory: calcNoOfCardsInCategory(payload),
  };
};

const redeemOrMortgageReducer = (
  state: ISiteState,
  payload: any
): ISiteState => {
  const _playersSites = { ...state.playersSites };
  const curentPlayersSites = [..._playersSites[payload.playerId]];
  const _sites = [...state.sites];
  _sites[payload.siteId].isMortgaged = payload.isMortgaged;

  for (let i = 0; i < curentPlayersSites.length; i++) {
    if (curentPlayersSites[i].id === payload.siteId) {
      curentPlayersSites[i].isMortgaged = payload.isMortgaged;
    }
  }
  _playersSites[payload.playerId] = curentPlayersSites;

  return {
    ...state,
    sites: _sites,
    playersSites: _playersSites,
  };
};

const sellBuildOrBuildOnSiteReducer = (
  state: ISiteState,
  payload: any,
  type: TActionType
): ISiteState => {
  const _playersSites = { ...state.playersSites };
  const curentPlayersSites = [..._playersSites[payload.playerId]];
  const _sites = [...state.sites];
  const _built = _sites[payload.siteId].built;
  let buildFactor = 0;
  if (type === SELL_BUILD) buildFactor = -1;
  if (type === BUILD_ON_SITE) buildFactor = 1;
  _sites[payload.siteId].built = _built + buildFactor;

  for (let i = 0; i < curentPlayersSites.length; i++) {
    if (curentPlayersSites[i].id === payload.siteId) {
      curentPlayersSites[i].built = _built + buildFactor;
    }
  }
  _playersSites[payload.playerId] = curentPlayersSites;

  return {
    ...state,
    sites: _sites,
    playersSites: _playersSites,
  };
};

export const siteReducer = (
  state = initialState,
  action: Action
): ISiteState => {
  const { type, payload } = action;
  switch (type) {
    case BUY_SITE:
      return buySiteReducer(state, payload);
    case SET_SITES:
      return setSitesReducer(state, payload);
    case MORTGAGE_SITE:
    case REDEEM_SITE:
      return redeemOrMortgageReducer(state, payload);
    case BUILD_ON_SITE:
    case SELL_BUILD:
      return sellBuildOrBuildOnSiteReducer(state, payload, type);
    default:
      return state;
  }
};
