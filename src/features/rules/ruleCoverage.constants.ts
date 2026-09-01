import type { RuleCoverageMap } from './ruleCoverage.interfaces';
import { ASSET_RULE_COVERAGE } from './ruleCoverage.assets.constants';
import { TURN_RULE_COVERAGE } from './ruleCoverage.turns.constants';

export type { RuleCoverageMap } from './ruleCoverage.interfaces';

/**
 * Which test proves which documented rule.
 *
 * Every rule row in docs/india-edition-rules.md carries a stable id, and every
 * id must appear here naming at least one test that actually asserts it.
 * `rulesCoverage.test.ts` enforces both directions: a rule added to the doc
 * fails the build until a test claims it, and a claimed test that gets renamed
 * or deleted fails too.
 *
 * The values are test titles, matched verbatim against the titles in the suite.
 * Nothing about how tests are written has to change - the titles were already
 * descriptive.
 *
 * Split in two halves by section, and merged here, only because one file of all
 * 153 rules runs past the max-lines limit - which is a rule worth keeping rather
 * than an exemption worth adding.
 */
export const RULE_COVERAGE: RuleCoverageMap = {
  ...TURN_RULE_COVERAGE,
  ...ASSET_RULE_COVERAGE,
};
