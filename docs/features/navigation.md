# Navigation, the header and the front door

**Status:** Shipped
**Entry points:** [src/App.tsx](../../src/App.tsx), [src/features/shell/AppShell.tsx](../../src/features/shell/AppShell.tsx), [src/components/layout/AppHeader.tsx](../../src/components/layout/AppHeader.tsx)

## What it does

Every screen has a header: the wordmark, the nav, and a settings menu holding sound and
appearance. The front door asks one question — how are you playing? — and each answer gets a
screen carrying only what belongs to it: a hot-seat setup form, hosting an online table, or
joining one with a code.

## How it works

```
App.tsx  (HashRouter)
  /            ChooserPage      how are you playing, plus Continue when there is a save
  /new         NewGamePage      the setup form + the saved games
  /host        HostPage         host name/token, ruleset, Speed Die -> opens a table
  /join        JoinPage         a six-character code -> a lobby, or straight into a game
  /rules       RulesPage
  /game/:id    GamePage
  /lobby/:id   LobbyPage
  *            NotFoundPage

every page
  └─ <AppShell editionId={…}>          .app-shell + data-theme + <AppHeader/>
       └─ <AppHeader>
            ├─ NAV_ITEMS -> NavLink (aria-current)
            └─ <SettingsMenu>  sound + appearance
```

## Key decisions

- **Each page renders its own `AppShell`; there is no router layout route.** The tidier-looking
  option was rejected because `data-theme` comes from a different place on each page — the game's
  own edition, the one being picked in the setup form, or the default — so hoisting the shell above
  the routes would mean pushing that value back down through context to get exactly what a prop
  already gives. `AppShell` still owns the shell, the theme and the header, so a new screen gets all
  three by rendering it rather than by remembering to.
- **The header is inside `.app-shell`, not above it.** The theme engine emits its tokens on `:root`
  and on `[data-theme="<id>"]`, so a header outside the themed element would resolve against `:root`
  for ever — permanently the default palette, visibly out of step with the board the moment a player
  chose another appearance.
- **The header paints above the decision backdrop (`z-index: 50` over its 40), and it has to.**
  That backdrop is a fixed sheet over the whole viewport, so with the header unpositioned the app's
  only navigation went dead the moment a card or a buy decision came up — no rules, no mute, no way
  out until it was answered. The controls used to live in the game sidebar, which is under the
  backdrop too, so this was a pre-existing dead zone that moving them merely made obvious. A
  decision modal is deliberately not dismissible; that is about the decision, not the app's chrome.
  Consequence: **`.drawer-backdrop` starts at `var(--app-header-height)`**, because the side drawer
  is top-anchored and the header was covering its own close button.
- **The header negates the shell's padding from one source.** `.app-shell` publishes
  `--shell-pad`, and the header applies its negative — so the header sits flush with the window
  while the page stays inset, and the two cannot drift. Found by measuring: the header was floating
  28px down the page.
- **Settings are a menu, not a page control.** The appearance was a `<select>` inside the new-game
  form, which implied it was saved with the game — it is a per-device preference. Sound was a
  switch in the game's own sidebar. Three controls for two settings, none where a player would look.
- **Dismissal is both halves.** Escape via `useEscapeKey`, click-away via the new
  `useOutsideClick`, which listens on `pointerdown` rather than `click`: a `click` listener fires
  after the press has moved focus, so on a trigger that toggles the very thing being dismissed the
  dismiss and the re-open land in the same gesture.
- **A catch-all route, at last.** An unmatched hash rendered a blank page, and under `HashRouter`
  that is easy to reach by accident — a bare `<a href="#faq">` is a route, not an anchor.
- **`/new` keeps the masthead.** It follows the ruleset picked in the form below it, which is its
  documented purpose, so it belongs with the form rather than on the front door.
- **The chooser offers all three choices, always.** The online two used to be hidden behind
  `isOnlineEnabled()`, which made the _kind_ of game a property of the build rather than a choice
  the player makes — and meant the ordinary dev server could not offer online play at all. A build
  genuinely without a backend says so on the screen you land on, and `/join` distinguishes "no game
  with that code" from "this copy cannot play online"; it used to report the former for both.

## State and data

- Reads `state.game.recentGames` and `state.ui.soundEnabled`; the appearance comes from
  `useAppearance`.
- Writes `monopoly.sound.v1` and `monopoly.appearance.v1` — both per-device preferences, neither in
  a save. No `GameState` change, so no `GAME_STATE_VERSION` bump.
- `NAV_ITEMS` ([nav.constants.ts](../../src/shared/constants/nav.constants.ts)) is the single list
  behind the header's nav.
- New geometry tokens: `$header-height`, `$header-height-compact`, `$header-height-landscape`, and
  `$shell-frame-reserve` — which finally names the bare `72` that `_game.scss` carried.
  `--app-header-height` and `--app-frame-height` are published on `.app-shell` so every `calc()`
  reads one source.

## Tests

| Level       | File                                                                       | Covers                                                                                                                                                             |
| ----------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unit        | [AppHeader.test.tsx](../../src/components/layout/AppHeader.test.tsx)       | Banner + named nav as landmarks; `aria-current` on the active link only; `end` on the home link.                                                                   |
| Unit        | [SettingsMenu.test.tsx](../../src/components/layout/SettingsMenu.test.tsx) | `aria-expanded` flips; Escape and outside-press close; a press inside does not; both settings in the label.                                                        |
| Unit        | [useOutsideClick.test.ts](../../src/shared/hooks/useOutsideClick.test.ts)  | Fires outside, not inside or on a descendant; inert while closed; unhooks on unmount.                                                                              |
| Integration | [RulesPage.test.tsx](../../src/features/rules/RulesPage.test.tsx)          | The booklet's own back button is gone and the header carries the way home.                                                                                         |
| E2E         | [navigation.spec.ts](../../tests/e2e/navigation.spec.ts)                   | The chooser, Continue, each route, the header everywhere, no nav left in the sidebar, sound mid-game, the catch-all, and the header working over a decision modal. |
| E2E         | [join.spec.ts](../../tests/e2e/join.spec.ts)                               | The code field's uppercasing, dropped characters, length cap and blocked reasons.                                                                                  |
| E2E         | [deepLinks.spec.ts](../../tests/routing/deepLinks.spec.ts)                 | The catch-all against the real static host — the only suite that can prove it.                                                                                     |

## Known gaps

- The header is the same on every route apart from its height. A game in progress might warrant
  something of its own there — whose turn it is, say — and nothing is designed for that yet.
- `NAV_ITEMS` has two entries. A third would need a decision about the phone layout, where the nav
  and the settings trigger already share a 360px row.
