# Playing a turn

**Status:** Shipped for movement, buying, auctions, and jail. Building and trading are scaffolded.
**Entry points:** [src/domain/rules/gameEngine.ts](../../src/domain/rules/gameEngine.ts), [src/features/game/GamePage.tsx](../../src/features/game/GamePage.tsx)

## What it does

The active player rolls two dice, moves, and resolves whatever they land on — buying an unowned
property or sending it to auction, paying rent or tax, drawing a card, or going to jail. Doubles
grant another roll; three in a row send the player to jail.

## How it works

Every action is a **command** through one entry point. The UI never edits game state.

```
button onClick
  └─ dispatch(runGameCommand({ type: 'rollTurnDice' }))     gameSlice
       └─ executeGameCommand(state, command, randomSource)  gameEngine (pure)
            └─ { nextState, uiHints }
       └─ saveGame(nextState) → setActiveGame(nextState) → re-render
```

Inside the engine, `rollTurnDice` moves the player then calls `resolveCurrentSpace`, which
branches on `space.kind` and may set a `pendingDecision`. While `pendingDecision.type !== 'none'`
the turn is gated in `await_decision` and extra rolls are blocked.

`gameView.selectors.selectDecisionViewModel` turns the pending decision into a view model, and
`DecisionPanel` renders the matching variant. **A new decision type needs both a case in the
selector and a branch in `DecisionPanel`, or the game silently stalls with no way to advance.**

Phase machine and helper inventory: [../architecture.md](../architecture.md) sections 3-4.

## Key decisions

- **Command pattern over direct mutation.** One choke point means saving, logging, and undo are
  possible without touching the UI, and rules stay unit-testable with no React in scope.
- **Dice are injected** via `RandomSource` so tests are deterministic; the UI's dice animation is
  purely decorative and the authoritative values come back in `turn.lastRoll`.
- **Auctions are mandatory** after a decline, matching the printed rules rather than the common
  house rule of letting the property stay unsold.
- **The engine throws on illegal commands** instead of returning an error value. Callers do not
  catch today, so a bad dispatch is an uncaught error — a deliberate fail-loud choice while the
  command surface is still growing.
- **`resolveCurrentSpace` is shared** by dice movement and card-driven movement, so "advance to
  Mumbai" resolves rent exactly like landing there normally.

## State and data

Reads and writes `GameState.turn`, `.players`, `.ownership`, `.pendingDecision`, `.auctionState`,
`.history`. Every command persists the whole state — see [persistence.md](persistence.md).

## Tests

| Level       | File                                                            | Covers                                                               |
| ----------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| Unit        | [gameEngine.test.ts](../../src/domain/rules/gameEngine.test.ts) | Game creation defaults; buy decision on landing; auction on decline. |
| Integration | —                                                               | _Gap: no thunk-level test of command → save → store._                |
| E2E         | [tests/e2e/app.spec.ts](../../tests/e2e/app.spec.ts)            | Board renders; space details open.                                   |

## Known gaps

- **Jail-fine bug**: `payJailFine` overwrites the `asset-liquidation` decision that
  `resolveBankPayment` raises, letting a broke player leave jail free. See CLAUDE.md section 8.
- Building, mortgaging, trading, and bankruptcy are scaffolded — they return a `uiHints` string
  and change nothing.
- No end condition: `winnerPlayerId` and `status: 'completed'` are never set.
- Only 2 of 9 implemented commands have unit tests.
