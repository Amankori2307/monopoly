import { buildCards } from '../themes/buildCards.utils';
import { indiaTheme } from '../themes/india.theme';

/**
 * The India decks, built from the India theme.
 *
 * They used to be written out here with the currency symbol hardcoded, which
 * meant a second edition's cards would have promised rupees on a board priced
 * in pounds. Built from the theme, the money and the place names come out right
 * for whichever edition asks.
 */
const cards = buildCards(indiaTheme);

export const chanceCards = cards.chance;
export const communityChestCards = cards.communityChest;
