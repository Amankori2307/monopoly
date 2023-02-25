import { IPositions, PLAYER_SIZE } from 'lib/core/src/lib';

export const calculateSimilarPositions = ({
  site,
  right,
  bottom,
  left,
  top,
}: IPositions): IPositions[] => {
  return [
    {
      right: right,
      bottom: bottom,
      left: left,
      top: top,
      site: site,
    },
    {
      bottom: right,
      left: bottom,
      top: left,
      right: top,
      site: site + 10,
    },
    {
      left: right,
      top: bottom,
      right: left,
      bottom: top,
      site: site + 20,
    },
    {
      top: right,
      right: bottom,
      bottom: left,
      left: top,
      site: site + 30,
    },
  ];
};

export const calcSiteLength = (side: number): number => {
  return side / 15;
};

export const calcRowWidth = (side: number): number => {
  return side / 5;
};

const calculateSitePostion = (side: number, site: number): IPositions => {
  let right;
  const siteLength = calcSiteLength(side);
  const rowWidth = calcRowWidth(side);
  if (site === 0) right = Math.floor(rowWidth / 2 - PLAYER_SIZE / 2);
  else
    right = Math.floor(
      rowWidth + siteLength * (site - 1) + siteLength / 2 - PLAYER_SIZE / 2
    );

  const bottom = Math.floor(rowWidth / 2 - PLAYER_SIZE / 2);
  const left = side - right - PLAYER_SIZE;
  const top = side - bottom - PLAYER_SIZE;
  return {
    top,
    left,
    right,
    bottom,
    site,
  };
};

export const calculatePositions = (side: number): IPositions[] => {
  const positions = Array(40);
  for (let site = 0; site < 10; site++) {
    const sitePosition = calculateSitePostion(side, site);
    const similarPositions = calculateSimilarPositions(sitePosition);
    positions[site] = similarPositions[0];
    positions[site + 10] = similarPositions[1];
    positions[site + 20] = similarPositions[2];
    positions[site + 30] = similarPositions[3];
  }
  return positions;
};
