# Rules booklet

**Status:** Shipped
**Entry points:** [src/features/rules/RulesPage.tsx](../../src/features/rules/RulesPage.tsx)

## What it does
A static, readable rules reference at `/rules`, styled like the printed booklet, with anchor
navigation between sections (start, turn, board, jail, buildings, money, speed die).

## How it works
A single presentational component — no store access, no props. Section links are a local array
mapped to `<a href="#...">` anchors. Styling lives in
[pages/_rules.scss](../../src/styles/pages/_rules.scss).

## Key decisions
- **Content is hardcoded JSX, not data.** It is prose, read by humans, changed rarely — a data
  model would add indirection with nothing in return.
- **Kept separate from `docs/india-edition-rules.md`**, which is the *implementation* source of
  truth (values, mappings, what is built). This page is player-facing copy.

## State and data
None.

## Tests
| Level | File | Covers |
|---|---|---|
| Unit | — | *Gap.* |
| Integration | — | *Gap: no test that sections and anchors render.* |
| E2E | [tests/e2e/app.spec.ts](../../tests/e2e/app.spec.ts) | Asserts the Rules link is present from the game screen. |

## Known gaps
- Anchor targets are not verified against the section ids that actually exist.
- Content can drift from the engine; nothing checks that stated values match the constants.
