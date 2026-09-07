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

  // Vivid and clearly distinguishable: the board tokens are plain coloured
  // discs, so colour is the only thing telling two players apart.
  tokenCatalog: [
    { id: 'elephant', label: 'Elephant', emoji: '🐘', color: '#e01b1b' },
    { id: 'train', label: 'Train', emoji: '🚂', color: '#1466ff' },
    { id: 'auto', label: 'Auto', emoji: '🛺', color: '#ffd400' },
    { id: 'peacock', label: 'Peacock', emoji: '🦚', color: '#00b352' },
    { id: 'tiger', label: 'Tiger', emoji: '🐅', color: '#ff7a00' },
    { id: 'lotus', label: 'Lotus', emoji: '🪷', color: '#a020f0' },
    { id: 'rickshaw', label: 'Rickshaw', emoji: '🚲', color: '#00c8c8' },
    { id: 'kite', label: 'Kite', emoji: '🪁', color: '#ff4fa3' },
  ],

  boardCenter: { title: 'Monopoly', subtitle: 'India Edition' },

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
