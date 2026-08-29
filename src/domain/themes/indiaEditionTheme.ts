import type { ThemeConfig } from '../types/game.interfaces';

/**
 * Player pieces use vivid, clearly distinguishable colours - the board tokens
 * are plain coloured spheres, so colour is the only thing telling them apart.
 */
export const indiaEditionTheme: ThemeConfig = {
  id: 'india-edition',
  name: 'Monopoly India Edition',
  currencySymbol: 'M',
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
};

export const availableThemes = [indiaEditionTheme];
