import type { ThemeConfig } from '../types/game';

export const indiaEditionTheme: ThemeConfig = {
  id: 'india-edition',
  name: 'Monopoly India Edition',
  currencySymbol: 'M',
  accentColor: '#cf2f2f',
  background: 'radial-gradient(circle at top, #f7f1d8, #efe2b1 42%, #d7c38b 100%)',
  tokenCatalog: [
    { id: 'elephant', label: 'Elephant', emoji: '🐘', color: '#8a6c47' },
    { id: 'train', label: 'Train', emoji: '🚂', color: '#2f4858' },
    { id: 'auto', label: 'Auto', emoji: '🛺', color: '#2d6a4f' },
    { id: 'peacock', label: 'Peacock', emoji: '🦚', color: '#1f5fbf' },
    { id: 'tiger', label: 'Tiger', emoji: '🐅', color: '#b85c00' },
    { id: 'lotus', label: 'Lotus', emoji: '🪷', color: '#a4133c' },
    { id: 'rickshaw', label: 'Rickshaw', emoji: '🚲', color: '#5a189a' },
    { id: 'kite', label: 'Kite', emoji: '🪁', color: '#005f73' },
  ],
};

export const availableThemes = [indiaEditionTheme];
