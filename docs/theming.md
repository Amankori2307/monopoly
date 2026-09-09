# Theming

How the visual theme system works, and how to add a theme.

## The split: SCSS owns colour, the domain owns game data

Three different things are called "theme" in this codebase, and keeping them apart is the point:

|                | Lives in                                                                                        | Holds                                          | Consumed by                       |
| -------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------- |
| **Palette**    | [src/styles/themes/\_themes.scss](../src/styles/themes/_themes.scss)                            | Every colour, shadow, and surface              | CSS, via `var(--token)`           |
| **Edition**    | [src/domain/themes/](../src/domain/themes/)                                                     | Name, currency symbol, pieces, 40 square names | Game logic and UI copy            |
| **Appearance** | [src/shared/constants/appearance.constants.ts](../src/shared/constants/appearance.constants.ts) | Which palette the player chose                 | `data-theme`, via `useAppearance` |

They are joined by one string: the **id**. A `GameTheme.id` must equal the key used in the SCSS
`$themes` map, and so must an appearance's id. The React tree writes one of them to the DOM as
`data-theme`, and CSS does the rest.

### An appearance is not an edition

An **edition** decides what the forty squares are called, what the money is counted in and what the
pieces are. An **appearance** decides only the colours.

They were the same choice until recently: `data-theme` was written straight from
`GameState.themeId`, so the only way to recolour the board was to play a different board — and
because `international-edition`, `us-edition` and `world-edition` all map to `$india-palette`,
picking one of them changed the names and nothing else.

An appearance overrides the palette and leaves the game alone:

```
useAppearance(editionId)
  └─ resolveAppearanceTheme(appearance, editionId)
        'edition'    → editionId          // the edition's own colours
        'aesthetic'  → 'aesthetic'        // any edition, recoloured
```

`edition` is a sentinel, **not a palette** — there is no `[data-theme="edition"]` block. It resolves
to the edition's own id, which is exactly what the attribute carried before appearances existed, so
the default is byte-identical to the old behaviour rather than merely close to it.

**It is a per-device preference, not game state**, stored under `monopoly.appearance.v1` — the same
standing as the sound switch, and the same reasoning: two people playing online from two phones can
look at one game in different palettes with nothing to reconcile. A field on `GameState` has to be
agreed by every device (which is why `tableMode` is one), and there is nothing to agree about here.
It also means adding an appearance needs **no `GAME_STATE_VERSION` bump and no migration**.

A stored id is validated on read rather than cast: the value comes off the disk of a browser that
may have run an older build, and an unknown id would reach `data-theme` and match no palette at all
— not the wrong colours, no colours.

## How it works

```
AppShell (every page)
  └─ <div className="app-shell" data-theme={themeId}>
                                   │
        src/styles/themes/_themes.scss emits:
          :root                      { --accent: …; --group-red: …; }   ← default theme
          [data-theme="india-edition"] { … }
          [data-theme="midnight"]      { … }
                                   │
        every component reads var(--accent), var(--surface-panel), …
```

Because each theme is just a map of tokens, adding one changes **data**, not stylesheets. The
engine loops over `$themes` and emits a `[data-theme]` block per entry automatically.

### The contract guard, and the third direction

The Sass guard runs both directions over the contract. Neither direction can see a token that is
in the contract, defined by every palette, and **read by nothing** — Sass cannot scan the other
stylesheets. That gap hid six dead tokens (`decision-bg`, `decision-border`, `token-bg`,
`action-sell`, `action-redeem`, `action-text`), one of which had been orphaned by a stylesheet
deletion with nothing to notice. Every palette had to keep inventing values for them.

[themeContract.guard.test.ts](../src/styles/themeContract.guard.test.ts) closes it: it parses
`$theme-contract` and asserts something, somewhere, reads each `--token`. So the rule is:
**add a contract token in the same change as the rule that reads it, not before.**

### The contract guard

`$theme-contract` lists every token a theme must define. At compile time the engine checks each
theme against it (and against every colour group in `$color-groups`) and raises `@error` on a
miss. A partially-defined theme fails the build instead of silently inheriting the default
theme's colour at runtime, which is close to impossible to debug by eye.

**It runs in both directions.** A second pass `@error`s on any key a theme defines that is neither in
the contract nor a `group-*`. For a long time the guard only asked whether the contract was covered,
never whether a theme had grown a key past it — which is how `--board-active-outline` survived a
redesign in both themes, referenced by no stylesheet at all. An extra key is not harmless: it is a
token the next person will assume something reads.

### Board tokens

Easily confused with each other, and with `--surface-panel`:

| Token                 | Paints                                        |
| --------------------- | --------------------------------------------- |
| `--board-space-bg`    | one of the 40 cells                           |
| `--surface-board`     | `.board-card`, the slab under the grid        |
| `--board-icon-ink`    | the `currentColor` every space glyph inherits |
| `--piece-outline`     | the edge around a house or hotel              |
| `--jail-cell-bg`      | the Jail corner's barred cell                 |
| `--jail-bars`         | the bars' `currentColor`                      |
| `--jail-visiting-bg`  | the L-shaped Just Visiting band               |
| `--board-field`       | the centre's printed field                    |
| `--board-emboss`      | the card's lit top edge, and the name halo    |
| `--board-shade`       | the card's shaded bottom edge                 |
| `--board-paper-tooth` | the crossed grain gradients                   |
| `--board-vignette`    | the corner falloff                            |
| `--ribbon-keyline`    | the rule between a colour band and its cell   |
| `--ribbon-sheen`      | the light half of a band's sheen              |

The whole set is proven by one e2e test: it flips `data-theme` to `midnight` mid-run and asserts
**every** board colour moves. Anything hardcoded — in a stylesheet or baked into an asset — does not,
which is how the icons and five literals in `_board.scss` were found in the first place.

`--board-icon-ink` is what made the glyphs themeable at all: they were `<img src>` files with their
ink baked in, invisible on a dark cell and unreachable from CSS. They are inline SVG filled with
`currentColor` now — see [game-layout.md](features/game-layout.md).

### Deliberately not tokenised

The `.token-chip` and `.pip` shading gradients are hardcoded white and black, and should stay that
way. They are colour-agnostic _shading_ layered over an arbitrary inline player colour — the thing
that makes a flat disc read as a sphere. A theme that could change them could break the illusion, and
there is no theme-dependent decision for them to express.

### Button roles

`--button-primary` / `--button-secondary` (plus their `-hover` and `-text` pairs) are part of the
theme contract, so every theme decides its own button palette. Components use `.primary-button`
and `.secondary-button` and never pick a colour themselves.

### Street colour groups

The eight property colour groups are tokens like `--group-red`, and
`@each $group in $color-groups` generates matching `.group-*` utility classes. Components apply
`group-${space.colorGroup}` as a class instead of an inline hex:

```tsx
<div className={`space-color group-${space.colorGroup}`} />   // board square
<div className={`deed-band group-${space.colorGroup}`} />     // title deed band
```

This replaced two hardcoded hex maps that were duplicated between `GamePage.tsx` and
`SpaceDetailCard.tsx`, and it means colour groups change with the theme.

## Adding a theme

**1. Add the token map** in [\_themes.scss](../src/styles/themes/_themes.scss):

```scss
$themes: (
  'india-edition': (
    …,
  ),
  'monsoon': (
    surface-app: #eef4f2,
    // … every key in $theme-contract, plus group-* for each colour group
  ),
);
```

Miss a token and the build fails with the exact key name. That is intentional.

**2. Register the game-facing config** so it becomes selectable, in `src/domain/themes/`:

```ts
export const monsoonTheme: ThemeConfig = {
  id: 'monsoon', // MUST match the SCSS map key
  name: 'Monsoon Edition',
  currencySymbol: 'M',
  tokenCatalog: [
    /* at least 8 tokens - the max player count */
  ],
  // …
};

export const availableThemes = [indiaEditionTheme, monsoonTheme];
```

`availableThemes` drives the setup dropdown and the in-game token lookup, so that one export is
all the UI needs.

**3. Test it**, per [coding-guidelines.md](coding-guidelines.md):

- unit — the `ThemeConfig` is well-formed (id matches, ≥8 tokens, unique token ids)
- integration — selecting it on `NewGamePage` creates a game whose `themeId` persists
- e2e — the board renders with `data-theme="monsoon"` applied

**4. Update docs** — add the theme to this file and note it in the file index if you added a file.

## Adding an appearance

Three edits, and no game state involved:

1. **The palette** in [\_themes.scss](../src/styles/themes/_themes.scss): a `$<name>-palette` map
   with every key in `$theme-contract` plus a `group-*` for each colour group, registered in
   `$themes` under the id you will use. Miss a token and the build fails with its name.
2. **The choice** in
   [appearance.constants.ts](../src/shared/constants/appearance.constants.ts): an entry in
   `APPEARANCES` whose `id` equals the `$themes` key. `AppearanceId` is derived from that list, so
   the picker, the cycle control and the stored-value validation all pick it up with no other edit.
3. **A row in the table above**, saying what it is for.

There is nothing to do in `src/domain/themes/` — that is for editions. And nothing in the zod
schema or the migrations: `themeId` on a save is a plain string and the appearance is not on the
save at all.

### Changing the default

`$default-theme` in `_themes.scss` decides which token set lands on bare `:root`, i.e. what
renders before any `data-theme` attribute applies.

## Current themes

| id              | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `india-edition` | Shipped. The default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `aesthetic`     | Shipped, as an **appearance** rather than an edition — no `GameTheme` is registered for it, so it recolours whichever edition is being played. Modern, sharp and minimal: a neutral near-white shell with hairline borders and near-black ink, the printed-paper treatment (tooth, vignette, emboss) dialled almost out, and the eight street groups left as the only saturated things on the board. Deliberately light, for the same reason `midnight` is not selectable — see below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `midnight`      | Dark palette, fully defined in SCSS. Now that appearances exist, exposing it needs only a row in `APPEARANCES` — but the blockers below are real, and they are what makes any **dark** appearance dishonest rather than merely imperfect: the dice are a hardcoded white gradient with near-black pips, the modal scrims are dark translucent, and the drop shadows are ink-tinted. All three read correctly under a light palette and wrongly under a dark one. **Not registered** in `src/domain/themes/`, so it is not yet selectable — it exists to prove the engine, and an e2e test flips `data-theme` to it to prove the board carries no hardcoded colour. Registering it needs a `ThemeConfig` with id `midnight`; what still blocks that is the literals outside the board — `_dice.scss` (the die face is a hardcoded white gradient), `_overlays.scss`, `_trade.scss`, `_space-detail.scss`, `_player.scss`, `_holdings.scss`, `_buttons.scss`, `_rules.scss`. |
