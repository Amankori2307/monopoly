/**
 * The booklet's sections, in reading order.
 *
 * One source of truth for three things that must not drift apart: the in-page
 * nav, the sections the page actually renders, and the matching heading in
 * docs/india-edition-rules.md. `rulesSync.test.ts` enforces all three.
 */
export const RULES_SECTIONS = [
  { id: 'faq', label: 'FAQ', docHeading: '## Quick answers' },
  { id: 'start', label: 'Start', docHeading: '## 3. Setup' },
  { id: 'turn', label: 'Turn', docHeading: '## 4. The turn sequence' },
  { id: 'board', label: 'Board', docHeading: '## 7. Landing on a space' },
  { id: 'auction', label: 'Auction', docHeading: '### 7a. Auctions' },
  { id: 'jail', label: 'Jail', docHeading: '## 6. Jail — every case' },
  { id: 'buildings', label: 'Buildings', docHeading: '## 8. Building houses and hotels' },
  { id: 'money', label: 'Money', docHeading: '## 9. Mortgages' },
  { id: 'speed-die', label: 'Speed Die', docHeading: '## 12. Speed Die' },
] as const;

export type RulesSectionId = (typeof RULES_SECTIONS)[number]['id'];
