import { createContext, useContext, type ReactNode } from 'react';
import { GENERIC_NOUNS } from '../../domain/themes/nouns.constants';
import type { RulesEdition } from './rulesEdition.interfaces';

/**
 * The generic reading: the rules with no board's local colour on them.
 *
 * Also the default, so a section rendered outside a provider - in a unit test,
 * say - reads as the neutral edition rather than throwing.
 */
export const GENERIC_EDITION: RulesEdition = {
  name: 'Monopoly',
  currencySymbol: '',
  nouns: GENERIC_NOUNS,
};

const RulesEditionContext = createContext<RulesEdition>(GENERIC_EDITION);

/**
 * Context rather than props, and that is a deliberate exception.
 *
 * Eleven section components make up the booklet and every one of them needs the
 * same three facts. Threading them through eleven signatures is eleven chances
 * for one to be forgotten, and none of the sections takes any other prop - they
 * are prose. The provider is the page; the sections stay presentational,
 * reading a value handed to them rather than any store.
 */
export function RulesEditionProvider({
  children,
  edition,
}: {
  children: ReactNode;
  edition: RulesEdition;
}) {
  return (
    <RulesEditionContext.Provider value={edition}>
      {children}
    </RulesEditionContext.Provider>
  );
}

export const useRulesEdition = (): RulesEdition => useContext(RulesEditionContext);
