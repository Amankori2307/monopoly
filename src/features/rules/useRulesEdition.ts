import { useAppSelector } from '../../app/hooks';
import { getThemeOrDefault } from '../../domain/themes/themes.registry';
import { GENERIC_EDITION } from '../../components/rules/RulesEditionContext';
import type { RulesEdition } from '../../components/rules/rulesEdition.interfaces';

/**
 * Which edition the booklet is being read as.
 *
 * The game you are in, if you are in one - checking a rule mid-game is what
 * the header's Rules link is mostly for, and the booklet saying "cities" and
 * "₹" while your board says streets and dollars is the bug this fixes.
 *
 * With no game open there is nothing to follow, so it reads generically:
 * neutral words and bare numbers. Deliberately NOT the default edition -
 * India's vocabulary is wrong for three of the four boards and arbitrary for a
 * reader who has not picked one.
 */
export const useRulesEdition = (): RulesEdition => {
  const themeId = useAppSelector((state) => state.game.activeGame?.themeId ?? null);

  if (!themeId) {
    return GENERIC_EDITION;
  }

  const theme = getThemeOrDefault(themeId);
  return {
    name: theme.name,
    currencySymbol: theme.currencySymbol,
    nouns: theme.nouns,
  };
};
