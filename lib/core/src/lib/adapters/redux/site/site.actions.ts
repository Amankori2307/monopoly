import { Action, TActionType } from '../../../interfaces';

// Sites
export const BUY_SITE: TActionType = 'BUY_SITE';
export const SET_SITES: TActionType = 'SET_SITES';
export const MORTGAGE_SITE: TActionType = 'MORTGAGE_SITE';
export const REDEEM_SITE: TActionType = 'REDEEM_SITE';
export const BUILD_ON_SITE: TActionType = 'BUILD_ON_SITE';
export const SELL_BUILD: TActionType = 'SELL_BUILD';

export const buySite = (playerId: number, siteData): Action => {
  return {
    type: BUY_SITE,
    payload: {
      siteData,
      playerId,
    },
  };
};

export const setSites = (data): Action => {
  return {
    type: SET_SITES,
    payload: data,
  };
};

export const mortgageSite = (siteId: number, playerId: number): Action => {
  return {
    type: MORTGAGE_SITE,
    payload: {
      siteId: siteId,
      playerId: playerId,
      isMortgaged: true,
    },
  };
};

export const redeemSite = (siteId: number, playerId: number): Action => {
  return {
    type: REDEEM_SITE,
    payload: {
      siteId: siteId,
      playerId: playerId,
      isMortgaged: false,
    },
  };
};

export const buildOnSite = (siteId: number, playerId: number): Action => {
  return {
    type: BUILD_ON_SITE,
    payload: {
      siteId: siteId,
      playerId: playerId,
    },
  };
};

export const sellBuild = (siteId: number, playerId: number): Action => {
  return {
    type: SELL_BUILD,
    payload: {
      siteId: siteId,
      playerId: playerId,
    },
  };
};
