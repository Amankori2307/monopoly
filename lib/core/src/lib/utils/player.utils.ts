import { CARD_TYPES, DIRECTIONS, IPlayer } from 'lib/core/src/lib';

export const initPlayer = (playerId: number): IPlayer => {
  return {
    site: 0,
    previousSite: 0,
    playerId: playerId,
    money: 1000,
    isMoving: false,
    direction: DIRECTIONS.FORWARD,
  };
};

export const createPlayerData = (totalPlayers: number): IPlayer[] => {
  const players: IPlayer[] = Array(totalPlayers);
  for (let playerId = 0; playerId < totalPlayers; playerId++) {
    players[playerId] = initPlayer(playerId);
  }
  return players;
};

export const calcTurningPoints = (ps, cs) => {
  const points = [0, 10, 20, 30];
  const turningPoints = [];
  for (let i = 0; i < points.length; i++) {
    if (ps < points[i] && cs > points[i]) turningPoints.push(points[i]);
  }
  return turningPoints;
};

export const getAllTurningPoints = (ps, cs, direction) => {
  if (direction === DIRECTIONS.BACKWARD) {
    const temp = ps;
    ps = cs;
    cs = temp;
  }
  const turningPoints = [];
  if (ps < cs) {
    turningPoints.push(...calcTurningPoints(ps, cs));
  } else if (ps > cs) {
    turningPoints.push(...calcTurningPoints(ps, 39));
    if (cs !== 0) turningPoints.push(0);
    turningPoints.push(...calcTurningPoints(0, cs));
  }
  if (direction === DIRECTIONS.BACKWARD) turningPoints.reverse();
  return turningPoints;
};

export const delay = (millis) =>
  new Promise((resolve, reject) => {
    setTimeout((_) => resolve(), millis);
  });

export const calcRentForSite = (cs, sites, noOfCardsInCategory) => {
  // check if built
  if (cs.built > 0) return cs.rentWithHouse[cs.built - 1];
  // check if all
  const totalSites = sites.filter((site) => site.subType === cs.subType);
  let isDouble = false;
  if (totalSites.length === noOfCardsInCategory[cs.subType]) {
    // If none of the site is morgaged then take double rent else take single rent
    let i = 0;
    for (; i < totalSites.length; i++) {
      if (totalSites[i].isMortgaged) {
        isDouble = false;
        break;
      }
    }
    if (i === noOfCardsInCategory[cs.subType]) isDouble = true;
  }
  return isDouble ? 2 * cs.rent : cs.rent;
};

export const calcRentForRealmRails = (sites) => {
  const realRails = sites.filter((site) => site.type === CARD_TYPES.REALM_RAILS);
  return Math.pow(2, realRails.length - 1) * 25;
};

export const calcRentForUtility = (sites, diceSum) => {
  const utility = sites.filter((site) => site.type === CARD_TYPES.UTILITY);
  if (utility.length === 1) return 4 * diceSum;
  else if (utility.length === 2) return 10 * diceSum;
};

export const calcRent = (
  cs,
  otherPlayerSites,
  diceSum,
  noOfCardsInCategory
) => {
  if (cs.type === CARD_TYPES.SITE)
    return calcRentForSite(cs, otherPlayerSites, noOfCardsInCategory);
  else if (cs.type === CARD_TYPES.REALM_RAILS)
    return calcRentForRealmRails(otherPlayerSites);
  else if (cs.type === CARD_TYPES.UTILITY)
    return calcRentForUtility(otherPlayerSites, diceSum);
};
