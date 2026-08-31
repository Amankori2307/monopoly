# Rules booklet

**Status:** Shipped
**Entry points:** [src/features/rules/RulesPage.tsx](../../src/features/rules/RulesPage.tsx)

## What it does

A static, readable rules reference at `/rules`, styled like the printed booklet, with anchor
navigation between sections (start, turn, board, jail, buildings, money, speed die).

## How it works

A single presentational component — no store access, no props. Section links are a local array
mapped to `<a href="#...">` anchors. Styling lives in
[pages/\_rules.scss](../../src/styles/pages/_rules.scss).

## Key decisions

- **Content is hardcoded JSX, not data.** It is prose, read by humans, changed rarely — a data
  model would add indirection with nothing in return.
- **Kept separate from `docs/india-edition-rules.md`**, which is the _implementation_ source of
  truth (values, mappings, what is built). This page is player-facing copy.

## State and data

None.

## Tests

| Level       | File                                                              | Covers                                                                                                                         |
| ----------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Unit        | [rulesSync.test.ts](../../src/features/rules/rulesSync.test.ts)   | The booklet and the ruleset doc cover the same topics and quote the same numbers                                               |
| Integration | [RulesPage.test.tsx](../../src/features/rules/RulesPage.test.tsx) | Every nav link resolves to a rendered section; the FAQ answers the three most-misread rules                                    |
| E2E         | [rules.spec.ts](../../tests/e2e/rules.spec.ts)                    | Nav resolves in a browser, the FAQ renders question-and-answer pairs, amounts render in ₹, and the page is reachable from home |

## Staying in sync with the ruleset doc

The booklet and [india-edition-rules.md](../india-edition-rules.md) are one ruleset in two forms:
the booklet is what a player reads, the doc is what a contributor reads, and they must never
disagree. Two things hold them together, both enforced by
[rulesSync.test.ts](../../src/features/rules/rulesSync.test.ts):

- **Topics.** `RULES_SECTIONS` is the single list behind the in-page nav, the sections the page
  renders, and the heading in the markdown that covers each one. Rename a doc heading or add a
  booklet section and the test names the mismatch and what to do about it.
- **Numbers.** Every amount in the booklet renders from a constant, so it can never go stale. The
  markdown quotes the same values as text, so the test asserts each constant's formatted value still
  appears there — change `STARTING_CASH` and it fails naming the constant.

Prose is not diffable, so wording remains a human responsibility: change a rule in one place and
change it in the other.

## Known gaps

- Anchor targets are not verified against the section ids that actually exist.
- Content can drift from the engine; nothing checks that stated values match the constants.
