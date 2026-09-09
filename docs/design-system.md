# The design system

Every scale the app is allowed to reach for, why each one exists, and what
stops it drifting again.

**See it rendered at [`#/style`](https://amankori2307.github.io/monopoly/#/style).**
That page is written entirely from the scales it displays — if it ever needed a
literal to look right, the ladder would be missing a rung.

---

## Why

The app had half a system, and the half it had was excellent: colour has been
guarded three ways for a long time, and font families were never once
hardcoded. Everything else was ad hoc. Measured across 24 partials:

| Axis      | Before                                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Type      | 118 declarations, **38 distinct rem values** — twelve inside the 0.76–0.90rem band, differences of 0.16px. `h2` was the only heading in the app with a size.                               |
| Spacing   | **201 literals against 91 token uses**, running two incompatible ladders at once: the tokens were 5/9/14/22/28 while the three commonest literals — 12px, 10px, 6px — had no token at all. |
| Elevation | 39 shadows, 4 tokenised. **Eleven near-identical inks** for one colour.                                                                                                                    |
| Motion    | 8 durations, one easing repeated verbatim seven times with no name.                                                                                                                        |
| Focus     | **The three most-used controls had no `:focus-visible` at all**, while eleven others each invented one.                                                                                    |

And it had produced real defects, not just untidiness: `.masthead-lede`
rendered two ways, `.error-panel` was a `.panel` that overrode everything a
panel is, and the trade scrim sat above the header — so for as long as an offer
was being assembled, the app's navigation was dead.

---

## The layers

- **`abstracts/_scale.scss`** — the system. Space, type, weight, tracking,
  elevation, layers, motion, borders, measure, glyphs.
- **`abstracts/_tokens.scss`** — this app's own metrics: board tracks, the deed
  card, the player stack's fan, header heights, breakpoints. It `@forward`s the
  scale, so `t.$space-3` and `t.text(body)` resolve in every partial that
  already writes `@use '../abstracts/tokens' as t`.
- **`themes/_themes.scss`** — colour, and only colour. See [theming.md](theming.md).

A **scale** is a ladder you pick a rung from; a **metric** is one measurement
that happens to matter. Adding a rung is a design decision, adding a metric is
a layout fact.

---

## The scales

### Space — a 4px grid

`$space-1` … `$space-18`, where **the number is the multiple**: `$space-3` is
12px. The one scale deliberately not role-named, because the same 12px is a
form's field gap, a card's inner padding and a button's inline padding — a role
name would be a lie about what it is for.

`$space-hair: 1px` sits below the grid on purpose. A 1px gap between two
stacked figures is the thinnest visible separation, not a quarter of a rhythm
unit, and if the grid ever re-bases it must stay 1px.

Ties round **down**, consistently: 6→4, 10→8, 14→12, 22→20.

### Type — roles, not sizes

A role carries **size, leading, weight, tracking, family and case together**,
because they were always one decision and splitting them is exactly how 38
sizes, 14 leadings and 19 trackings drifted apart. Reach for one with
`@include t.text(body-sm)`.

Two body sizes are deliberate: `body` is 1rem for prose (the rules booklet) and
`body-sm` is 0.86rem for interface text. Reading text and interface text are
different jobs; that is not drift.

> **`text()` emits the `font` shorthand, so it RESETS weight, family, leading
> and tracking.** Anything set before the include is discarded silently. Put the
> role first, then any override. A guard rule enforces this — the migration hit
> it ten times, including on the booklet's FAQ questions, which lost their bold
> and said nothing.

### Elevation — geometry here, ink in the palette

`box-shadow: $elevation-2 var(--shadow-ink)`. How far a surface floats does not
change between palettes; what colour its shadow is does. Splitting them is what
made a dark appearance possible without a second shadow ladder per theme.

### Layers

`$z-space-detail` 30 · `$z-spectator` 35 · `$z-drawer` 38 · `$z-modal` 40 ·
`$z-notice` 45 · `$z-header` 50.

**The header outranks every full-viewport scrim, always**, so navigation is
never dead while one is up. Below `$z-layer-floor` (10) a z-index is local to a
component's own stacking context and stays a bare integer.

### Motion

`$duration-fast/base/slow`, `$ease-standard/plain`. **Every transition and
animation sits inside `m.motion { … }`**, which is `prefers-reduced-motion:
no-preference` — so the still state is the default and a new animation is
respectful without anyone remembering. Six partials used to undo their motion
in a separate `reduce` block, and the dice proved why that fails: an infinite
tumble with no block anywhere.

---

## The rules

1. **A scale rung, never a literal.** Space, type, weight, tracking, elevation,
   layers, motion, borders.
2. **A colour is a theme token.** Never a hex, never an `rgba`.
3. **A breakpoint goes through `below()` or `landscape-compact()`.**
4. **The role first, then the override** — see the warning above.
5. **One base rule per control family.** A variant is a modifier, never a
   restatement.
6. **`text()` for type, `focus-ring()` for focus, `motion()` for movement,
   `card-surface()` for a card.**

## The exceptions

Two different things, and the difference matters.

**Out of scope is not an exception.** `components/_board.scss` is frozen: its
geometry is calibrated by 21 e2e tests, its type is a continuous function of
board size (`clamp(5px, 1.4cqw, 0.67rem)`) which a rem ramp cannot express, and
its spacing literals are sub-grid values inside a fluid cell where a 4px grid
means nothing. The guard states that once, with the reason.

**A genuine exception is marked inline, at the site:**

```scss
// design-system-exempt: shades an arbitrary inline player colour, so there is
// no theme-dependent decision to express. See docs/theming.md.
background: radial-gradient(…);
```

The guard reads the comment and **fails if the reason says nothing**. Inline
rather than an allowlist, because an allowlist is invisible from the code it
excuses. The census is ratcheted: another exception can be added, but only by
raising a number where a reviewer sees it.

---

## Enforcement

| Where                                                                           | What                                                                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `abstracts/_scale.scss` `@error`                                                | The grid is a grid, the layers are ordered, every type role is complete. Compile time, so a broken ladder fails `pnpm build`.  |
| [designSystem.guard.test.ts](../src/styles/designSystem.guard.test.ts)          | No literal in any partial: space, type, colour, radius, z-index, motion. Plus the role-ordering rule and the exemption census. |
| [themeContract.guard.test.ts](../src/styles/themeContract.guard.test.ts)        | Every contract token is read by something.                                                                                     |
| [styleGuide.guard.test.ts](../src/features/styleguide/styleGuide.guard.test.ts) | The `#/style` page still shows every rung.                                                                                     |
| `tests/e2e/styleguide.spec.ts`                                                  | The scales render, and repaint with the appearance.                                                                            |
| `tests/e2e/navigation.spec.ts`                                                  | Every control draws the same focus ring.                                                                                       |

A Sass `@error` in a partial nothing `@use`s is **dead code** — `abstracts/` is
absent from `main.scss` because it emits no CSS, so `_scale.scss`'s compile-time
guards were inert until `_tokens.scss` forwarded it. Worth remembering before
trusting one.

## Adding to the system

- **A rung**: add it to the scale, and to the style guide's list if it is not
  derived. `styleGuide.guard.test.ts` will tell you.
- **A theme token**: add it to `$theme-contract`, to **every** palette, and to
  the rule that reads it — all in one commit, because each guard fires on any
  two of the three.
- **An exception**: mark it inline with a real reason and raise
  `EXEMPTION_CENSUS`.
