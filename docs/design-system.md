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

There is deliberately **no button-lift rung**. `$emboss-press` was one, and the
button's hover was its only reader — see the control surface above.

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

### Controls — one surface, one height

**Every control in the app is `$control-tap` tall** — buttons, text fields and
selects alike. A field used to be 48px and a button beside it 44, so a form row
was four pixels out of line for no reason anybody had chosen; the field's height
was simply whatever `body` leading plus its padding came to.

**A button is a hairline edge on a flat ground, and it casts no shadow in any
state.** Panels, inputs, the deed card, the header and the site panel all carry
`1px solid var(--border-...)`; the button was the only surface in the app with
`border: 0`, which mattered most for `.secondary-button` — a near-white ground
on a near-white page, held together by nothing but its shadow.

That shadow was `$emboss-press`, a hard 5px blurless offset, cast on hover under
a 1px lift. The same treatment is still right on the board's colour ribbon and
on the die, because **those are objects** — ink and plastic, drawn as ink and
plastic. On chrome it read as a toy. Three things follow:

- **No `box-shadow` on a button, ever.** `controls.spec.ts` checks each variant
  at rest and under the pointer.
- **Press feedback is `:active`, never `:hover`.** `:hover` _latches_ on touch —
  Android holds it after a tap until you press something else — so the old lift
  left a button you had just tapped raised over a slab of ink.
- **No colour transition either.** An appearance is a `data-theme` swap, so a
  transition on `background-color` makes every button fade into the new palette
  while the rest of the page flips at once. `appearance.spec.ts` reads a
  button's colour immediately after the switch, and that is what catches it.

A filled variant's edge is a darker shade of its own fill rather than a ring, so
`.primary-button` borrows `--button-primary-hover` instead of asking for a token
of its own. In `midnight` that shade is _lighter_, which is correct: on a dark
ground an edge lifts by lightening.

`.is-compact` is the one size modifier. It changes the **width and the label,
never the height** — a finger needs 44px whatever the button is for.

**A bespoke `min-height` on one button in a row is how a row becomes two
sizes.** `.end-turn-button` carried 58px while `.dice-roll-button` narrowed its
own padding, in the row a player looks at every single turn — two overrides
pulling opposite ways. The dice beside them are still a different size, and
that is right: they are objects, not controls.

### The tap floor

`$control-tap: 44px` is the floor for anything a thumb has to hit, and
`$control-checkbox: 20px` is the one deliberate exception.

The floor is not advisory, and it is not only for `<button>`. The button base
states it once, so every button variant was already correct — and a measurement
pass over a 360×640 Android frame found **five controls under it, every one of
them something other than a button**: the header's nav links at 30px, the
wordmark at 12, the booklet's ten section chips at 21, the deed sheet's close
cross at 30×30 and a native checkbox at 13×13. What the misses have in common
is that nothing stated the floor for them.

A sixth turned up later and is the one worth remembering: `.chip-button`, the
auction's bid shortcuts, at **23px**. No route sweep could see it, because
reaching it takes a live auction — so the tap-floor test now plays on until one
opens rather than only walking the pages.

A checkbox stays 20px because a native control drawn at 44 looks broken. The
**`<label>` around it carries the tap area instead**, which only works while
the label really is the target — so `.checkbox-field` is a `<label>`, and
`mobile.spec.ts` measures the label rather than the box.

Two things follow from the floor rather than being separate decisions:
`$header-height-landscape` is `$control-tap`, because a bar cannot be shorter
than the tallest thing standing in it; and the board's forty cells are exempt,
because a square on a 336px board is 27px wide and cannot be 44 without
ceasing to be a board.

### The phone tier

Most of the system is one size everywhere, and that is right: a rung is a
decision, not a measurement of a particular screen. A handful of places
genuinely differ on a phone, and each is a case where **the thing being sized
has itself changed**, not merely the window around it:

| What                                               | Why it differs                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| The type, all of it (`$root-scale-phone`)          | See below — one root scale, not a rung per role                                                   |
| The die (`$die-size-phone`)                        | 58px beside a 336px board is the biggest object on the screen                                     |
| The deed card's tier (`$deed-card-width-phone`)    | It is a fixed rectangle at every size — just a smaller one below `$breakpoint-mobile`. See below. |
| The deed's padding (`$deed-card-pad-phone/-tight`) | 18px is a fine share of a 280px card and a sixth of a 200px one                                   |
| The scrim's inset                                  | 20px each side of a 360px window is 11% of it spent on inset                                      |

#### The site card is one rectangle, at one ratio

The deed card is **one fixed box** — same width, same height, for every square
— and a square with less to say leaves the bottom blank. That is the point of
having a single card component: it must not resize as you move around the
board.

**The ratio is structural, not a second token.** The card sets
`aspect-ratio: 3 / 5` and takes only a **width per tier** (`$deed-card-width`
280, `$deed-card-width-phone` 200). The height is derived, so the two cannot
drift apart, and adding a third tier keeps the ratio for free.
`$deed-card-height` still exists because the auction panel and a selected
trade deed read a height directly — but it is computed from the width, never
chosen.

Every container is derived from the card, never the other way round: the
drawer is one card plus its gutters, the buy modal is two cards plus a gap,
the stacked peek clears the card's own head. When a tier changes, they follow.

Two ways this has actually broken, both worth knowing:

- **`width: 100%` is only right where a WRAPPER sets the width.** The holdings
  drawer and the trade stack do; a decision's `1fr` grid track does not. The
  same declaration gave 246px in the title-deed modal and 302px in the buy
  decision — one card, two sizes.
- **A rule about one side is half a rule.** `board.spec.ts` checked the height
  and not the width for months, and the phone had no check at all — which is
  exactly where it drifted. Both axes, every kind, both tiers.

#### Type on a phone is one declaration

`:root { font-size: $root-scale-phone }` — 87.5%, so 14px — in a `below()`
block at the end of `base/_reset.scss`. Every role in `$type-scale` is in
`rem`, so that moves all fifteen together and none can be left behind, which a
sweep of per-component overrides cannot promise. **There is no `*-phone` type
role, and there should not be**: a rung is a decision, and "this screen is
smaller" is a measurement.

Three things deliberately do not follow it, and each is the point:

- **Spacing.** `$space-scale` is in `px`, so the 4px grid is untouched.
- **The tap floor.** `$control-tap` is `px`, so a control stays 44px tall while
  its label gets smaller. But **pin the width too where a label sets it**: the
  header's nav links were 44px tall and as wide as the word "Play" happened to
  be, which was 44 before the scale and 40 after — the tap-floor sweep failed
  on all five routes at once.
- **The board.** Its type is a `cqw` function of the board's own width, which
  is exactly why it was built that way.

And one thing must actively resist it. **A field under 16px makes iOS zoom the
page on focus**, and the reset gives every control `font: inherit`, so
`.text-input` / `.select-input` pin `$input-font-phone` in their own phone
block. A smaller field costs the player their place on the screen every time
they tap one.

**A phone override of a type role has to come last in its file.** Both
selectors are the same specificity and a media query adds none, so source
order is the whole of what decides it — a phone rule written beside the rule it
overrides loses silently. `components/_space-detail.scss` keeps its phone tier
in one block at the end of the file for exactly this reason.

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
7. **Anything you press clears `$control-tap`** — including the ones that are
   not buttons.
8. **A phone override goes last in its file**, or specificity ties are settled
   by accident.
9. **A button casts no shadow and fades no colour.** Hover and `:active` change
   the paint; nothing moves, and nothing animates.

## The exceptions

Two different things, and the difference matters.

**Out of scope is not an exception.** `components/_board.scss` is frozen: its
geometry is calibrated by 21 e2e tests, its type is a continuous function of
board size (`clamp(5px, 1.3cqw, 0.67rem)`) which a rem ramp cannot express, and
its spacing literals are sub-grid values inside a fluid cell where a 4px grid
means nothing. The guard states that once, with the reason.

Everything drawn on the board is that kind of function, and its metrics live in
`_tokens.scss` beside the other board geometry: `$board-color-bar`,
`$board-inset-short` / `$board-inset-long` (the cell's two axes are not equally
scarce, and one inset for both spends the scarce one at the plentiful one's
rate), and the two container thresholds `$board-short-name-floor` and
`$board-tight-floor`. They are `cqw`, never `vw` — a 768px tablet renders a
board the size of a phone's, and no media query can see that.

**A guard that reads line numbers has to strip comments in place.** The design
system guard's `strip()` used to replace a whole block comment with a single
space, renumbering every line after it, while `exemptions()` read the original
text. Adding one doc comment to a partial therefore slid a
`design-system-exempt:` marker off the literal beneath it, and the failure's own
worklist pointed at the wrong rows. Both halves have to count the same lines.

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
