/**
 * A rule id mapped to the test titles that prove it.
 *
 * Ids follow the ruleset doc's own section numbering: `5.3` is the third row of
 * section 5, `7a.4` of the auctions subsection, `Q1.2` of the first Quick
 * answers table. Prose gets reworded; ids do not.
 */
export type RuleCoverageMap = Record<string, readonly string[]>;
