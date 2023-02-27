import { MAX_PLAYERS } from '../constants';
import {
  ISite,
  TNoOfCardsInCategory,
  TPlayerSites,
  TPlayersSites,
} from '../interfaces';

export const initPlayersSites = (): TPlayersSites => {
  const player: TPlayersSites = [];
  for (let i = 0; i < MAX_PLAYERS; i++) {
    const sites: TPlayerSites = [];
    player[i] = sites;
  }

  return player;
};

export const initNoOfCardsInCategory = (): TNoOfCardsInCategory => {
  return {
    special: 0,
    brown: 0,
    chest: 0,
    tax: 0,
    realm_rails: 0,
    green: 0,
    chance: 0,
    pink: 0,
    utility: 0,
    orange: 0,
    red: 0,
    yellow: 0,
    skyblue: 0,
    blue: 0,
  };
};

export const calcNoOfCardsInCategory = (sites: ISite[]): TNoOfCardsInCategory => {
  const data: TNoOfCardsInCategory = initNoOfCardsInCategory();
  for (let i = 0; i < sites.length; i++) {
    const subType = sites[i].subType;
    if (data[subType]) data[subType]++;
    else data[subType] = 1;
  }
  return data as TNoOfCardsInCategory;
};
