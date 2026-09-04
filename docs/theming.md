# Theming

How the visual theme system works, and how to add a theme.

## The split: SCSS owns colour, the domain owns game data

Two different things are called "theme" in this codebase, and keeping them apart is the point:

|                  | Lives in                                                             | Holds                                       | Consumed by             |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------- | ----------------------- |
| **Visual theme** | [src/styles/themes/\_themes.scss](../src/styles/themes/_themes.scss) | Every colour, shadow, and surface           | CSS, via `var(--token)` |
| **Theme config** | [src/domain/themes/](../src/domain/themes/)                          | Name, currency symbol, player token catalog | Game logic and UI copy  |

They are joined by one string: the theme **id**. `ThemeConfig.id` must equal the key used in the
SCSS `$themes` map. The React tree writes it to the DOM as `data-theme`, and CSS does the rest.

## How it works

```
HomePage / GamePage
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

| Token                | Paints                                        |
| -------------------- | --------------------------------------------- |
| `--board-space-bg`   | one of the 40 cells                           |
| `--surface-board`    | `.board-card`, the slab under the grid        |
| `--board-icon-ink`   | the `currentColor` every space glyph inherits |
| `--piece-outline`    | the edge around a house or hotel              |
| `--jail-cell-bg`     | the Jail corner's barred cell                 |
| `--jail-bars`        | the bars' `currentColor`                      |
| `--jail-visiting-bg` | the L-shaped Just Visiting band               |

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
- integration — selecting it on `HomePage` creates a game whose `themeId` persists
- e2e — the board renders with `data-theme="monsoon"` applied

**4. Update docs** — add the theme to this file and note it in the file index if you added a file.

### Changing the default

`$default-theme` in `_themes.scss` decides which token set lands on bare `:root`, i.e. what
renders before any `data-theme` attribute applies.

## Current themes

| id              | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `india-edition` | Shipped. The default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `midnight`      | Dark palette, fully defined in SCSS. **Not registered** in `src/domain/themes/`, so it is not yet selectable — it exists to prove the engine, and an e2e test flips `data-theme` to it to prove the board carries no hardcoded colour. Registering it needs a `ThemeConfig` with id `midnight`; what still blocks that is the literals outside the board — `_dice.scss` (the die face is a hardcoded white gradient), `_overlays.scss`, `_trade.scss`, `_space-detail.scss`, `_player.scss`, `_holdings.scss`, `_buttons.scss`, `_rules.scss`. |
