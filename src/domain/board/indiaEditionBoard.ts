import { buildBoard } from '../themes/buildBoard.utils';
import { indiaTheme } from '../themes/india.theme';

/**
 * The India board, built from the India theme.
 *
 * Kept as its own export because `board.rules.test.ts` reads section 13 of
 * docs/india-edition-rules.md as a fixture and compares all forty squares
 * against it - so this is the thing that stays pinned to the documented
 * ruleset, and it now proves the theme pipeline produces exactly what the doc
 * says rather than merely that a hand-written array does.
 */
export const indiaEditionBoard = buildBoard(indiaTheme);

export { STANDARD_RULESET_ID as indiaEditionRulesetId } from '../constants/board.constants';
export { toSpaceId } from '../themes/buildBoard.utils';
