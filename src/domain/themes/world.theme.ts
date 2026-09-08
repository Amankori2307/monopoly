import type { GameTheme } from './theme.interfaces';

/**
 * Monopoly, world cities.
 *
 * In the spirit of the 2008 "Here & Now: World Edition", where the twenty-two
 * properties were cities chosen by a public vote and the cheapest-to-dearest
 * order followed how many votes each got.
 *
 * **This is not a faithful reproduction of that licensed board.** I could not
 * verify the official ordering, and inventing one and calling it authentic
 * would be worse than saying so: the cities below are the ones that placed in
 * that vote, ordered plausibly rather than exactly, and the four transport
 * squares are airports the way that edition had them rather than railways.
 * If you want the real board, it is forty strings in this file and nothing
 * else needs touching.
 */
export const worldTheme: GameTheme = {
  id: 'world-edition',
  name: 'Monopoly World Cities',
  currencySymbol: '$',

  tokenCatalog: [
    { id: 'globe', label: 'Globe', emoji: '🌍', color: '#e01b1b' },
    { id: 'aeroplane', label: 'Aeroplane', emoji: '✈️', color: '#1466ff' },
    { id: 'camera', label: 'Camera', emoji: '📷', color: '#ffd400' },
    { id: 'compass', label: 'Compass', emoji: '🧭', color: '#00b352' },
    { id: 'suitcase', label: 'Suitcase', emoji: '🧳', color: '#ff7a00' },
    { id: 'passport', label: 'Passport', emoji: '🛂', color: '#a020f0' },
    { id: 'sailboat', label: 'Sailboat', emoji: '⛵', color: '#00c8c8' },
    { id: 'hot-air-balloon', label: 'Balloon', emoji: '🎈', color: '#ff4fa3' },
  ],

  boardCenter: { title: 'Monopoly', subtitle: 'World Cities' },

  spaceNames: [
    'GO', // 0
    'Taipei', // 1  brown
    'Community Chest', // 2
    'Gdynia', // 3  brown
    'Income Tax', // 4
    'Beijing Airport', // 5
    'Jerusalem', // 6  light blue
    'Chance', // 7
    'Hong Kong', // 8  light blue
    'Belgrade', // 9  light blue
    'Jail / Just Visiting', // 10
    'Athens', // 11 pink
    'Solar Power', // 12
    'Barcelona', // 13 pink
    'Kyiv', // 14 pink
    'Shanghai Airport', // 15
    'Toronto', // 16 orange
    'Community Chest', // 17
    'Istanbul', // 18 orange
    'Rome', // 19 orange
    'Free Parking', // 20
    'Sydney', // 21 red
    'Chance', // 22
    'Vancouver', // 23 red
    'Tokyo', // 24 red
    'Paris Airport', // 25
    'New York', // 26 yellow
    'Water Works', // 27
    'London', // 28 yellow
    'Cape Town', // 29 yellow
    'Go To Jail', // 30
    'Seoul', // 31 green
    'Lisbon', // 32 green
    'Community Chest', // 33
    'Hamburg', // 34 green
    'Montréal Airport', // 35
    'Chance', // 36
    'Riga', // 37 dark blue
    'Super Tax', // 38
    'Montréal', // 39 dark blue
  ],
};
