# Rules booklet

**Status:** Shipped
**Entry points:** [src/features/rules/RulesPage.tsx](../../src/features/rules/RulesPage.tsx)

## What it does

A readable rules reference at `/rules`, styled like the printed booklet, with anchor navigation
between sections (start, turn, board, jail, buildings, money, speed die). It reads as **the edition
you are playing** — its name, its money, and its own words for the things on its board — and
generically when no game is open.

## How it works

Presentational sections under `src/components/rules/`, wrapped by `RulesEditionProvider`. The page
resolves the edition with [useRulesEdition](../../src/features/rules/useRulesEdition.ts) — the
active game's theme, or `GENERIC_EDITION` — and each section reads `name`, `currencySymbol` and
`nouns` from context. Section links are `<Link to="/rules#id">`, never bare anchors. Styling lives
in [pages/\_rules.scss](../../src/styles/pages/_rules.scss).

## Key decisions

- **Content is hardcoded JSX, not data.** It is prose, read by humans, changed rarely — a data
  model would add indirection with nothing in return.
- **One set of prose, four vocabularies.** The printed rules are identical in every edition; only
  the names, the money and the _words_ differ. So the words live on the theme as `nouns` and the
  prose interpolates them, rather than there being four copies of the booklet — a rule fixed in one
  copy would be silently stale in three.
- **Context, not props, and that is the exception.** Eleven prose sections need the same three
  facts and take no other prop; threading them through eleven signatures is eleven chances to
  forget one. The provider is the page, so the sections stay presentational — they read a value
  handed to them, not a store.
- **No game means generic, not default.** With nothing open the booklet says "property" and
  "station" and prints bare numbers. India's vocabulary is wrong for three of the four boards and
  arbitrary for a reader who has not chosen one; `formatMoney(1500, '')` is `1500`, which is the
  honest way to state a rule that is the same in every currency.
- **Kept separate from `docs/india-edition-rules.md`**, which is the _implementation_ source of
  truth (values, mappings, what is built). This page is player-facing copy.

## State and data

Reads `game.activeGame?.themeId` only, through `useRulesEdition`. Writes nothing, persists nothing.

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

- Nothing outstanding. `rulesSync.test.ts` checks three kinds of drift: that every nav link reaches
  a section the page renders, that the booklet and the ruleset doc cover the same topics, and that
  every ruleset constant's formatted value still appears in the markdown. Prose is still on you.
