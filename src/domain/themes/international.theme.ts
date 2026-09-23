import type { GameTheme } from './theme.interfaces';

/**
 * Monopoly, the London board.
 *
 * The 1936 edition and the one most of the world plays - Old Kent Road to
 * Mayfair, in pounds. Chosen as the "international" edition because it is the
 * board outside the US, and because its prices are identical to every other
 * standard edition's, so it slots onto the shared layout without a single
 * number changing.
 *
 * Written as the second theme mainly to prove the first one is a theme rather
 * than the game: this file is a name, a currency, eight pieces and forty
 * strings, and nothing else needed touching to add it.
 */
export const internationalTheme: GameTheme = {
  id: 'international-edition',
  name: 'Monopoly Classic (London)',
  currencySymbol: '£',

  boardCenter: { title: 'Monopoly', subtitle: 'Classic Edition' },

  // What this edition calls the things on its board, for the rules booklet.
  nouns: {
    site: 'street',
    sites: 'streets',
    railway: 'station',
    railways: 'stations',
  },

  spaceNames: [
    'GO', // 0
    'Old Kent Road', // 1  brown
    'Community Chest', // 2
    'Whitechapel Road', // 3  brown
    'Income Tax', // 4
    "King's Cross Station", // 5
    'The Angel Islington', // 6  light blue
    'Chance', // 7
    'Euston Road', // 8  light blue
    'Pentonville Road', // 9  light blue
    'Jail / Just Visiting', // 10
    'Pall Mall', // 11 pink
    'Electric Company', // 12
    'Whitehall', // 13 pink
    'Northumberland Avenue', // 14 pink
    'Marylebone Station', // 15
    'Bow Street', // 16 orange
    'Community Chest', // 17
    'Marlborough Street', // 18 orange
    'Vine Street', // 19 orange
    'Free Parking', // 20
    'Strand', // 21 red
    'Chance', // 22
    'Fleet Street', // 23 red
    'Trafalgar Square', // 24 red
    'Fenchurch Street Station', // 25
    'Leicester Square', // 26 yellow
    'Water Works', // 27
    'Coventry Street', // 28 yellow
    'Piccadilly', // 29 yellow
    'Go To Jail', // 30
    'Regent Street', // 31 green
    'Oxford Street', // 32 green
    'Community Chest', // 33
    'Bond Street', // 34 green
    'Liverpool Street Station', // 35
    'Chance', // 36
    'Park Lane', // 37 dark blue
    'Super Tax', // 38
    'Mayfair', // 39 dark blue
  ],
};
