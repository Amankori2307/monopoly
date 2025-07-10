import { MAX_PLAYERS } from './constants';

export const siteDataIntialPlayersSites = () => {
  const player = {};
  for (let i = 0; i < MAX_PLAYERS; i++) {
    player[i] = [];
  }

  return player;
};
