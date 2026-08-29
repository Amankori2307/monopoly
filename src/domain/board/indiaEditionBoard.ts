import {
  RAILWAY_MORTGAGE_VALUE,
  RAILWAY_PRICE,
  RAILWAY_RENT_BY_COUNT,
  UTILITY_MORTGAGE_VALUE,
  UTILITY_PRICE,
  UTILITY_RENT_MULTIPLIER_BOTH,
  UTILITY_RENT_MULTIPLIER_ONE,
} from '../constants/board.constants';
import { ColorGroup, SpaceKind } from '../types/game.enums';
import type { ActionSpace, BoardSpace } from '../types/game.interfaces';

/** Space ids are positional and stable: index 7 is always `space-7`. */
const toSpaceId = (index: number) => `space-${index}`;

type StreetRentTuple = [number, number, number, number, number, number, number];

const street = (
  index: number,
  name: string,
  colorGroup: ColorGroup,
  price: number,
  mortgageValue: number,
  houseCost: number,
  rents: StreetRentTuple
): BoardSpace => ({
  id: toSpaceId(index),
  index,
  kind: SpaceKind.Street,
  name,
  colorGroup,
  price,
  mortgageValue,
  houseCost,
  hotelCost: houseCost,
  rents: {
    baseRent: rents[0],
    monopolyRent: rents[1],
    with1House: rents[2],
    with2Houses: rents[3],
    with3Houses: rents[4],
    with4Houses: rents[5],
    withHotel: rents[6],
  },
});

const railway = (index: number, name: string): BoardSpace => ({
  id: toSpaceId(index),
  index,
  kind: SpaceKind.Railway,
  name,
  price: RAILWAY_PRICE,
  mortgageValue: RAILWAY_MORTGAGE_VALUE,
  rentByCount: RAILWAY_RENT_BY_COUNT,
});

const utility = (index: number, name: string): BoardSpace => ({
  id: toSpaceId(index),
  index,
  kind: SpaceKind.Utility,
  name,
  price: UTILITY_PRICE,
  mortgageValue: UTILITY_MORTGAGE_VALUE,
  rentMultiplierOne: UTILITY_RENT_MULTIPLIER_ONE,
  rentMultiplierBoth: UTILITY_RENT_MULTIPLIER_BOTH,
});

const action = (index: number, name: string, kind: ActionSpace['kind']): BoardSpace => ({
  id: toSpaceId(index),
  index,
  kind,
  name,
});

const tax = (index: number, name: string, amount: number): BoardSpace => ({
  id: toSpaceId(index),
  index,
  kind: SpaceKind.Tax,
  name,
  amount,
});

export const indiaEditionBoard: BoardSpace[] = [
  action(0, 'GO', SpaceKind.Go),
  street(1, 'Guwahati', ColorGroup.Brown, 60, 30, 50, [2, 4, 10, 30, 90, 160, 250]),
  action(2, 'Community Chest', SpaceKind.CommunityChest),
  street(3, 'Bhubaneshwar', ColorGroup.Brown, 60, 30, 50, [4, 8, 20, 60, 180, 320, 450]),
  tax(4, 'Income Tax', 200),
  railway(5, 'Chennai Central Railway Station'),
  street(
    6,
    'Panaji (Goa)',
    ColorGroup.LightBlue,
    100,
    50,
    50,
    [6, 12, 30, 90, 270, 400, 550]
  ),
  action(7, 'Chance', SpaceKind.Chance),
  street(8, 'Agra', ColorGroup.LightBlue, 100, 50, 50, [6, 12, 30, 90, 270, 400, 550]),
  street(
    9,
    'Vadodara',
    ColorGroup.LightBlue,
    120,
    60,
    50,
    [8, 16, 40, 100, 300, 450, 600]
  ),
  action(10, 'Jail / Just Visiting', SpaceKind.Jail),
  street(11, 'Ludhiana', ColorGroup.Pink, 140, 70, 100, [10, 20, 50, 150, 450, 625, 750]),
  utility(12, 'Electric Company'),
  street(13, 'Patna', ColorGroup.Pink, 140, 70, 100, [10, 20, 50, 150, 450, 625, 750]),
  street(14, 'Bhopal', ColorGroup.Pink, 160, 80, 100, [12, 24, 60, 180, 500, 700, 900]),
  railway(15, 'Howrah Railway Station'),
  street(16, 'Indore', ColorGroup.Orange, 180, 90, 100, [14, 28, 70, 200, 550, 750, 950]),
  action(17, 'Community Chest', SpaceKind.CommunityChest),
  street(18, 'Nagpur', ColorGroup.Orange, 180, 90, 100, [14, 28, 70, 200, 550, 750, 950]),
  street(
    19,
    'Kochi',
    ColorGroup.Orange,
    200,
    100,
    100,
    [16, 32, 80, 220, 600, 800, 1000]
  ),
  action(20, 'Free Parking', SpaceKind.FreeParking),
  street(21, 'Lucknow', ColorGroup.Red, 220, 110, 150, [18, 36, 90, 250, 700, 875, 1050]),
  action(22, 'Chance', SpaceKind.Chance),
  street(
    23,
    'Chandigarh',
    ColorGroup.Red,
    220,
    110,
    150,
    [18, 36, 90, 250, 700, 875, 1050]
  ),
  street(24, 'Jaipur', ColorGroup.Red, 240, 120, 150, [20, 40, 100, 300, 750, 925, 1100]),
  railway(25, 'New Delhi Railway Station'),
  street(
    26,
    'Ahmedabad',
    ColorGroup.Yellow,
    260,
    130,
    150,
    [22, 44, 110, 330, 800, 975, 1150]
  ),
  utility(27, 'Water Works'),
  street(
    28,
    'Hyderabad',
    ColorGroup.Yellow,
    260,
    130,
    150,
    [22, 44, 110, 330, 800, 975, 1150]
  ),
  street(
    29,
    'Pune',
    ColorGroup.Yellow,
    280,
    140,
    150,
    [24, 48, 120, 360, 850, 1025, 1200]
  ),
  action(30, 'Go To Jail', SpaceKind.GoToJail),
  street(
    31,
    'Kolkata',
    ColorGroup.Green,
    300,
    150,
    200,
    [26, 52, 130, 390, 900, 1100, 1275]
  ),
  street(
    32,
    'Chennai',
    ColorGroup.Green,
    300,
    150,
    200,
    [26, 52, 130, 390, 900, 1100, 1275]
  ),
  action(33, 'Community Chest', SpaceKind.CommunityChest),
  street(
    34,
    'Bengaluru',
    ColorGroup.Green,
    320,
    160,
    200,
    [28, 56, 150, 450, 1000, 1200, 1400]
  ),
  railway(35, 'Chhatrapati Shivaji Terminus'),
  action(36, 'Chance', SpaceKind.Chance),
  street(
    37,
    'Delhi',
    ColorGroup.DarkBlue,
    350,
    175,
    200,
    [35, 70, 175, 500, 1100, 1300, 1500]
  ),
  tax(38, 'Super Tax', 100),
  street(
    39,
    'Mumbai',
    ColorGroup.DarkBlue,
    400,
    200,
    200,
    [50, 100, 200, 600, 1400, 1700, 2000]
  ),
];

export const indiaEditionRulesetId = 'india-edition-2021';
