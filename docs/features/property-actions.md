# Property actions

**Status:** Shipped
**Entry points:** [PlayerActionRail.tsx](../../src/components/game/panels/PlayerActionRail.tsx), [playerActions.utils.ts](../../src/domain/rules/playerActions.utils.ts), [playerActions.selectors.ts](../../src/features/game/playerActions.selectors.ts)

## What it does

A row of five buttons under the board — **Build, Sell, Mortgage, Redeem, Trade** — always in the
same place, whether or not they can be used. Tapping one opens a sheet listing exactly the sites
that action is legal on right now, with what each costs or pays; picking one runs the command.

Before this, every property action was reachable only by tapping the right board square to open
its title deed — which on a phone means hitting a 30px target you have to find first.

## How it works

```
getSiteActions(state, spaceId, playerId)        domain/rules  - one square, four actions
  └─ getPlayerActionOptions(state, playerId)    domain/rules  - the same, across a whole holding
       └─ selectActionRail(game, viewer)        features      - + Trade, + who may act
            └─ PlayerActionRail                 components    - five buttons
                 └─ ActionPickerSheet           components    - which one?
                      └─ commands.runPropertyCommand(command, spaceId)
```

`getPlayerActionOptions` maps `getPlayerOwnedSpaces` through `getSiteActions` and buckets the
results by action: the enabled ones become `sites`, the rest become the refusal. **No rule is
restated** — every answer comes from the per-site predicates the engine throws from, so a live
button is always a command that will succeed.

`selectActionRail` adds the two things the domain cannot know: who is looking (`viewerControls`)
and Trade, which is not a property action at all.

## Key decisions

- **The rail was tried before, and removed.** [pages/\_game.scss](../../src/styles/pages/_game.scss)
  records why: _"every action it listed needs a spaceId, and the site panel is where one exists"._
  That objection is answered rather than worked around — the picker sheet is where a `spaceId` now
  comes from, and it can only offer one the command accepts.
- **Every button is always rendered, disabled when it cannot be used.** A row that changes shape
  cannot be learned. And a dead control has to say why: `title` carries the refusal, which is the
  bug [CLAUDE.md](../../CLAUDE.md) records for Buy — live regardless of cash, throwing into the
  console with a modal over it.
- **One word on the button, the object in the accessible name.** Five buttons share the width of a
  phone (~56px each at 320px). `docs/conventions.md` §3d wants verb plus object, so the object is
  in `aria-label` — `Build on a city`, in the edition's own noun — where it costs no pixels.
- **The aggregate refusal prefers the single reason.** When every holding refuses for the same
  reason, that reason is more use than a summary of it (`Already mortgaged`, not "nothing can be
  mortgaged"). Only when they differ does it summarise. `blockedReasons.guard.test.ts` sweeps these
  along with every other refusal, so they cannot drift out of shape.
- **The actor is the asset holder, never the active player.** During a liquidation the debtor
  raises the cash, and a collect-from-each card can bill somebody whose turn it is not. That is the
  same actor `selectSitePanel` uses, so the rail and the site panel always agree.
- **Trade is `action: null`, not a fifth `PropertyAction`.** It needs an opponent rather than one
  of your own squares, and inventing an enum member would put a value in the engine's vocabulary
  that no command takes. With exactly one solvent opponent the sheet is skipped — a question with
  one answer is not worth asking — which is the two-player game, and most of them.
- **The sheet is `SideDrawer` with a class, not a new surface.** The backdrop, Escape, the close
  button and the inset below the header are already right. On a phone it rises from the bottom,
  because it is answering a question about something the thumb just touched; above the phone tier
  it stays the right-hand drawer every other overlay is.
- **`.is-fill` is a button modifier, not a descendant rule.** The rail's grid track sets the width,
  so the inline padding has nothing to do. `_buttons.scss` explicitly retired five anonymous
  `.some-row button { … }` overrides; this does not add a sixth.

## State and data

Nothing persists. `useGameOverlays` holds `actionPickerRow` — the whole row rather than just the
action, because the picker lists that row's own eligible sites and looking them up again elsewhere
is how the two would drift. No `GameState` change, so no `GAME_STATE_VERSION` bump.

## Tests

| Level | File                                                                                        | Covers                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Unit  | [playerActions.utils.test.ts](../../src/domain/rules/playerActions.utils.test.ts)           | the four options, the amounts, the single-reason passthrough and the summary, never offering a site the command would refuse |
| Unit  | [playerActions.selectors.test.ts](../../src/features/game/playerActions.selectors.test.ts)  | five rows, the asset holder during a liquidation, viewer gating, Trade's own rules                                           |
| Unit  | [PlayerActionRail.test.tsx](../../src/components/game/panels/PlayerActionRail.test.tsx)     | the row's shape, the accessible name, a dead button keeping its reason                                                       |
| Unit  | [ActionPickerSheet.test.tsx](../../src/components/game/overlays/ActionPickerSheet.test.tsx) | sites with amounts, opponents for Trade, what it reports back                                                                |
| Guard | [blockedReasons.guard.test.ts](../../src/domain/rules/blockedReasons.guard.test.ts)         | every aggregate refusal is a fragment in the house shape                                                                     |
| E2E   | [action-rail.spec.ts](../../tests/e2e/action-rail.spec.ts)                                  | the five buttons, the picker's contents, running the command, both Trade paths, the tap floor, no page scroll                |

## Known gaps

- **The rail does not scroll to what you picked.** After building, nothing points at the square
  that changed except the toast and the board itself.
- **Build offers a house or a hotel implicitly.** The command is chosen per site by
  `getSiteActions`, so a site at four houses offers a hotel with no separate button — right, but
  the sheet's row does not say which it will be.
- **No keyboard shortcut**, and the rail is not reachable by a single key from the board.
