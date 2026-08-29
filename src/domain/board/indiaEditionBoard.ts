import type { BoardSpace } from '../types/game';

const street = (
  index: number,
  name: string,
  colorGroup: string,
  price: number,
  mortgageValue: number,
  houseCost: number,
  rents: [number, number, number, number, number, number, number]
): BoardSpace => ({
  id: `space-${index}`,
  index,
  kind: 'street',
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
  id: `space-${index}`,
  index,
  kind: 'railway',
  name,
  price: 200,
  mortgageValue: 100,
  rentByCount: [25, 50, 100, 200],
});

const utility = (index: number, name: string): BoardSpace => ({
  id: `space-${index}`,
  index,
  kind: 'utility',
  name,
  price: 150,
  mortgageValue: 75,
  rentMultiplierOne: 4,
  rentMultiplierBoth: 10,
});

const action = (
  index: number,
  name: string,
  kind:
    | 'go'
    | 'chance'
    | 'community-chest'
    | 'jail'
    | 'free-parking'
    | 'go-to-jail'
): BoardSpace => ({
  id: `space-${index}`,
  index,
  kind,
  name,
});

const tax = (index: number, name: string, amount: number): BoardSpace => ({
  id: `space-${index}`,
  index,
  kind: 'tax',
  name,
  amount,
});

export const indiaEditionBoard: BoardSpace[] = [
  action(0, 'GO', 'go'),
  street(1, 'Guwahati', 'brown', 60, 30, 50, [2, 4, 10, 30, 90, 160, 250]),
  action(2, 'Community Chest', 'community-chest'),
  street(3, 'Bhubaneshwar', 'brown', 60, 30, 50, [4, 8, 20, 60, 180, 320, 450]),
  tax(4, 'Income Tax', 200),
  railway(5, 'Chennai Central Railway Station'),
  street(6, 'Panaji (Goa)', 'light-blue', 100, 50, 50, [6, 12, 30, 90, 270, 400, 550]),
  action(7, 'Chance', 'chance'),
  street(8, 'Agra', 'light-blue', 100, 50, 50, [6, 12, 30, 90, 270, 400, 550]),
  street(9, 'Vadodara', 'light-blue', 120, 60, 50, [8, 16, 40, 100, 300, 450, 600]),
  action(10, 'Jail / Just Visiting', 'jail'),
  street(11, 'Ludhiana', 'pink', 140, 70, 100, [10, 20, 50, 150, 450, 625, 750]),
  utility(12, 'Electric Company'),
  street(13, 'Patna', 'pink', 140, 70, 100, [10, 20, 50, 150, 450, 625, 750]),
  street(14, 'Bhopal', 'pink', 160, 80, 100, [12, 24, 60, 180, 500, 700, 900]),
  railway(15, 'Howrah Railway Station'),
  street(16, 'Indore', 'orange', 180, 90, 100, [14, 28, 70, 200, 550, 750, 950]),
  action(17, 'Community Chest', 'community-chest'),
  street(18, 'Nagpur', 'orange', 180, 90, 100, [14, 28, 70, 200, 550, 750, 950]),
  street(19, 'Kochi', 'orange', 200, 100, 100, [16, 32, 80, 220, 600, 800, 1000]),
  action(20, 'Free Parking', 'free-parking'),
  street(21, 'Lucknow', 'red', 220, 110, 150, [18, 36, 90, 250, 700, 875, 1050]),
  action(22, 'Chance', 'chance'),
  street(23, 'Chandigarh', 'red', 220, 110, 150, [18, 36, 90, 250, 700, 875, 1050]),
  street(24, 'Jaipur', 'red', 240, 120, 150, [20, 40, 100, 300, 750, 925, 1100]),
  railway(25, 'New Delhi Railway Station'),
  street(26, 'Ahmedabad', 'yellow', 260, 130, 150, [22, 44, 110, 330, 800, 975, 1150]),
  utility(27, 'Water Works'),
  street(28, 'Hyderabad', 'yellow', 260, 130, 150, [22, 44, 110, 330, 800, 975, 1150]),
  street(29, 'Pune', 'yellow', 280, 140, 150, [24, 48, 120, 360, 850, 1025, 1200]),
  action(30, 'Go To Jail', 'go-to-jail'),
  street(31, 'Kolkata', 'green', 300, 150, 200, [26, 52, 130, 390, 900, 1100, 1275]),
  street(32, 'Chennai', 'green', 300, 150, 200, [26, 52, 130, 390, 900, 1100, 1275]),
  action(33, 'Community Chest', 'community-chest'),
  street(34, 'Bengaluru', 'green', 320, 160, 200, [28, 56, 150, 450, 1000, 1200, 1400]),
  railway(35, 'Chhatrapati Shivaji Terminus'),
  action(36, 'Chance', 'chance'),
  street(37, 'Delhi', 'dark-blue', 350, 175, 200, [35, 70, 175, 500, 1100, 1300, 1500]),
  tax(38, 'Super Tax', 100),
  street(39, 'Mumbai', 'dark-blue', 400, 200, 200, [50, 100, 200, 600, 1400, 1700, 2000]),
];

export const indiaEditionRulesetId = 'india-edition-2021';
