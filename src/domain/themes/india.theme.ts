import type { GameTheme } from './theme.interfaces';

/**
 * Monopoly India Edition.
 *
 * Everything that makes the game read as this edition, in one file: what it is
 * called, what it counts in, what the pieces are, and what the forty squares
 * are named. The prices, the rents and the rules are the ruleset's, shared with
 * every other edition - see boardLayout.constants.
 *
 * The squares are ordered by board position, and the comments mark the groups
 * so a name can be checked against the board without counting.
 */
export const indiaTheme: GameTheme = {
  id: 'india-edition',
  name: 'Monopoly India Edition',
  currencySymbol: '₹',

  boardCenter: { title: 'Monopoly', subtitle: 'India Edition' },

  // What this edition calls the things on its board, for the rules booklet.
  nouns: {
    site: 'city',
    sites: 'cities',
    railway: 'railway station',
    railways: 'railway stations',
  },

  spaceNames: [
    'GO', // 0
    'Guwahati', // 1  brown
    'Community Chest', // 2
    'Bhubaneshwar', // 3  brown
    'Income Tax', // 4
    'Chennai Central Railway Station', // 5
    'Panaji (Goa)', // 6  light blue
    'Chance', // 7
    'Agra', // 8  light blue
    'Vadodara', // 9  light blue
    'Jail / Just Visiting', // 10
    'Ludhiana', // 11 pink
    'Electric Company', // 12
    'Patna', // 13 pink
    'Bhopal', // 14 pink
    'Howrah Railway Station', // 15
    'Indore', // 16 orange
    'Community Chest', // 17
    'Nagpur', // 18 orange
    'Kochi', // 19 orange
    'Free Parking', // 20
    'Lucknow', // 21 red
    'Chance', // 22
    'Chandigarh', // 23 red
    'Jaipur', // 24 red
    'New Delhi Railway Station', // 25
    'Ahmedabad', // 26 yellow
    'Water Works', // 27
    'Hyderabad', // 28 yellow
    'Pune', // 29 yellow
    'Go To Jail', // 30
    'Kolkata', // 31 green
    'Chennai', // 32 green
    'Community Chest', // 33
    'Bengaluru', // 34 green
    'Chhatrapati Shivaji Terminus', // 35
    'Chance', // 36
    'Delhi', // 37 dark blue
    'Super Tax', // 38
    'Mumbai', // 39 dark blue
  ],
};
