# Monopoly — India Edition

A browser Monopoly with the full printed ruleset, built as a **pure rules engine with a React
shell**. Games have stable ids, save to `localStorage`, and resume from `/game/:gameId`.

**[Play it](https://amankori2307.github.io/monopoly/)** · [Ruleset](docs/india-edition-rules.md) ·
[Architecture](docs/architecture.md) · [File index](docs/file-index.md)

---

## Getting started

```bash
pnpm install
pnpm dev          # Vite dev server on :3000
```

| Command          | What it does                                             |
| ---------------- | -------------------------------------------------------- |
| `pnpm dev`       | dev server on :3000                                      |
| `pnpm build`     | production build into `build/`                           |
| `pnpm test`      | unit and integration tests (vitest)                      |
| `pnpm test:e2e`  | end-to-end tests (playwright, starts its own dev server) |
| `pnpm typecheck` | tsc --noEmit                                             |
| `pnpm lint`      | eslint over `src/` and `tests/`                          |
| `pnpm check-all` | typecheck, lint and formatting in one                    |
| `pnpm fix-all`   | eslint --fix, then prettier                              |
| `pnpm deploy`    | build and publish to gh-pages                            |

Typecheck with `pnpm typecheck`, or `pnpm check-all` for typecheck, lint and formatting together.

This project is pnpm-only. `packageManager` pins the version, and a `preinstall` script checks the
installer's user agent and stops anything that is not pnpm — so `npm install` cannot quietly leave a
second lockfile behind.

## The one architectural idea

**The rules engine knows nothing about React or Redux.** It is a pure module: give it a state and a
command, it hands back a new state.

```
UI event  →  dispatch(runGameCommand({ type: 'rollTurnDice' }))
          →  executeGameCommand(state, command, randomSource)   ← pure, deterministic
          →  { nextState, events, saveRequired }
          →  saveGame(nextState)  →  setActiveGame(nextState)  →  React re-renders
```

Everything follows from that. The engine is exhaustively unit-testable without a DOM; the UI holds
no rules; and a bug is either in a rule or in a component, never smeared across both. Twenty-four
commands go through one function, and every rupee moves through one of three logged choke points.

```
src/
  domain/      the engine. no React, no Redux, no DOM
  features/    pages, redux slices, persistence
  components/  presentational — props in, callbacks out
  styles/      SCSS; every colour is a theme token
```

`domain/` importing from anywhere else is a bug, and eslint enforces it.

## What is implemented

The whole printed ruleset. Dice and doubles including all three Jail interactions, rent with
colour-set doubling, the full Chance and Community Chest decks with chained draws, buying,
declining and the auction that follows, building and selling houses and hotels under both even
rules with a real bank inventory, mortgaging and redeeming, trading between players, insolvency and
bankruptcy with the bank auctioning what it takes back, win detection, and the optional Speed Die.

Every rule, every edge case and the handful of interpretation calls are written down in
[docs/india-edition-rules.md](docs/india-edition-rules.md), which is kept in sync with the in-app
rules booklet by a test.

## Testing

Every change ships with unit, integration and e2e coverage — see
[docs/coding-guidelines.md](docs/coding-guidelines.md) for the definition of done.

- **Unit**: pure logic, with a seeded RNG so dice are deterministic.
- **Integration**: thunk → engine → persistence → store, asserting on the store _and_ on what
  landed in `localStorage`.
- **E2E**: the user journey in Playwright, queried by accessible role and name.

## Documentation

| Document                                              | What it covers                              |
| ----------------------------------------------------- | ------------------------------------------- |
| [india-edition-rules.md](docs/india-edition-rules.md) | every rule and edge case, with a status key |
| [architecture.md](docs/architecture.md)               | layers, data flow, state shape              |
| [coding-guidelines.md](docs/coding-guidelines.md)     | definition of done, testing policy          |
| [conventions.md](docs/conventions.md)                 | naming, file layout, enforced lint rules    |
| [theming.md](docs/theming.md)                         | the token system and adding a theme         |
| [features/](docs/features/README.md)                  | one document per feature                    |
| [file-index.md](docs/file-index.md)                   | one line per file, what each one does       |

## Credits

Board icons are Font Awesome Free (CC BY 4.0); the dice sound is from OpenGameArt (CC0). Each is
attributed in an `ATTRIBUTION.md` beside the files.

Monopoly is a trademark of Hasbro. This is a personal project for learning, not affiliated with or
endorsed by them.

## Licence

MIT.
