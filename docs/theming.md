# Theming

How the visual theme system works, and how to add a theme.

## The split: SCSS owns colour, the domain owns game data

Two different things are called "theme" in this codebase, and keeping them apart is the point:

| | Lives in | Holds | Consumed by |
|---|---|---|---|
| **Visual theme** | [src/styles/themes/_themes.scss](../src/styles/themes/_themes.scss) | Every colour, shadow, and surface | CSS, via `var(--token)` |
| **Theme config** | [src/domain/themes/](../src/domain/themes/) | Name, currency symbol, player token catalog | Game logic and UI copy |

They are joined by one string: the theme **id**. `ThemeConfig.id` must equal the key used in the
SCSS `$themes` map. The React tree writes it to the DOM as `data-theme`, and CSS does the rest.

> `ThemeConfig` still carries `accentColor` and `background` fields. They are **not used for
> rendering** — SCSS owns presentation. Treat them as legacy until removed.

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

**1. Add the token map** in [_themes.scss](../src/styles/themes/_themes.scss):

```scss
$themes: (
  'india-edition': ( … ),
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
  id: 'monsoon',          // MUST match the SCSS map key
  name: 'Monsoon Edition',
  currencySymbol: 'M',
  tokenCatalog: [ /* at least 8 tokens - the max player count */ ],
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

| id | Status |
|---|---|
| `india-edition` | Shipped. The default. |
| `midnight` | Dark palette, fully defined in SCSS. **Not registered** in `src/domain/themes/`, so it is not yet selectable — it exists to prove the engine and as a starting point. Add a `ThemeConfig` with id `midnight` to turn it on. |
