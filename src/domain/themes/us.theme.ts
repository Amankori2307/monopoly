import type { GameTheme } from './theme.interfaces';

/**
 * Monopoly, the Atlantic City board.
 *
 * The 1935 original and the one most people picture: Mediterranean Avenue to
 * Boardwalk, in dollars, with four railroads rather than four stations.
 *
 * The one real difference from the London board is that square 38 is **Luxury
 * Tax** rather than Super Tax. That is a name, not a rule - both are 100 - so
 * it is theme data like every other name here, and the layout is untouched.
 */
export const usTheme: GameTheme = {
  id: 'us-edition',
  name: 'Monopoly Classic (Atlantic City)',
  currencySymbol: '$',

  // The eight tokens from the modern box. Colours match the other editions
  // position for position, so no player is harder to pick out on one board
  // than another.
  tokenCatalog: [
    { id: 'racecar', label: 'Racecar', emoji: '🏎️', color: '#e01b1b' },
    { id: 'top-hat-us', label: 'Top Hat', emoji: '🎩', color: '#1466ff' },
    { id: 'rubber-duck', label: 'Rubber Duck', emoji: '🦆', color: '#ffd400' },
    { id: 't-rex', label: 'T-Rex', emoji: '🦖', color: '#00b352' },
    { id: 'penguin', label: 'Penguin', emoji: '🐧', color: '#ff7a00' },
    { id: 'battleship-us', label: 'Battleship', emoji: '🚢', color: '#a020f0' },
    { id: 'wheelbarrow-us', label: 'Wheelbarrow', emoji: '🛒', color: '#00c8c8' },
    { id: 'scottie-dog-us', label: 'Scottie Dog', emoji: '🐕', color: '#ff4fa3' },
  ],

  boardCenter: { title: 'Monopoly', subtitle: 'Atlantic City' },

  // What this edition calls the things on its board, for the rules booklet.
  nouns: {
    site: 'street',
    sites: 'streets',
    railway: 'railroad',
    railways: 'railroads',
  },

  spaceNames: [
    'GO', // 0
    'Mediterranean Avenue', // 1  brown
    'Community Chest', // 2
    'Baltic Avenue', // 3  brown
    'Income Tax', // 4
    'Reading Railroad', // 5
    'Oriental Avenue', // 6  light blue
    'Chance', // 7
    'Vermont Avenue', // 8  light blue
    'Connecticut Avenue', // 9  light blue
    'Jail / Just Visiting', // 10
    'St. Charles Place', // 11 pink
    'Electric Company', // 12
    'States Avenue', // 13 pink
    'Virginia Avenue', // 14 pink
    'Pennsylvania Railroad', // 15
    'St. James Place', // 16 orange
    'Community Chest', // 17
    'Tennessee Avenue', // 18 orange
    'New York Avenue', // 19 orange
    'Free Parking', // 20
    'Kentucky Avenue', // 21 red
    'Chance', // 22
    'Indiana Avenue', // 23 red
    'Illinois Avenue', // 24 red
    'B. & O. Railroad', // 25
    'Atlantic Avenue', // 26 yellow
    'Water Works', // 27
    'Ventnor Avenue', // 28 yellow
    'Marvin Gardens', // 29 yellow
    'Go To Jail', // 30
    'Pacific Avenue', // 31 green
    'North Carolina Avenue', // 32 green
    'Community Chest', // 33
    'Pennsylvania Avenue', // 34 green
    'Short Line', // 35
    'Chance', // 36
    'Park Place', // 37 dark blue
    'Luxury Tax', // 38
    'Boardwalk', // 39 dark blue
  ],
};
