# Sound

**Status:** Shipped
**Entry points:** [`soundCues.constants.ts`](../../src/features/game/soundCues.constants.ts) ·
[`soundCue.utils.ts`](../../src/features/game/soundCue.utils.ts) ·
[`useGameSounds.ts`](../../src/features/game/hooks/useGameSounds.ts) ·
[`tools/generate-cue-sounds.py`](../../tools/generate-cue-sounds.py)

## What it does

Money arriving, money leaving, rent to another player, buying a site, a building going up, being
sent to Jail, a card that saves or ruins you, a bankruptcy, and winning — each makes its own sound.
Before this the game had exactly two: the dice and the token's steps, and everything else happened in
silence with only a toast to show for it.

One switch in the game header turns all of it off, the dice and the footsteps included, and remembers
the choice.

## How it works

```
engine        every event carries a GameEventCue, set where the thing happened
  ↓
runGameCommand      cueForEvents(result.events) → the one cue worth hearing
  ↓                 dispatch(queueFeedback({ toasts, cue }))   ← queued, not played
  ↓            ...the token walks to its space...
useFeedbackGate     releaseFeedback() once isMoving clears → ui.soundCue
  ↓
useGameSounds       plays SOUND_FOR_CUE[cue], then clears it
```

`result.events` is what a single command appended, which the toast feed already uses — so a sound and
its toast are always the same event, the way a toast and the game record already are. They are also
**released together**: the cue waits out the walk in `ui.pendingFeedback` alongside its toasts, or
the rent sting would sound while the token was still three spaces away. See
[action-feedback.md](action-feedback.md).

## Key decisions

- **One classification, two readers.** The event carried a `GameEventTone` with three members, for
  the toast's colour. Sound needs ten distinctions, and a second engine-set classification of the
  same event would be two fallbacks for one value — so the tone _became_ `GameEventCue`, still set
  where the thing happened, and the toast now narrows ten cues down to its three colours in one map.

- **Set in the engine, never read back out of the message.** The tone was regex-matched from the
  wording once, and rephrasing a sentence silently changed its colour; any line containing "paid" was
  a debit whether money moved or not. The cue is an argument to `createEvent`, so a sound cannot
  drift from what happened.

- **A card's good-or-bad comes from its own effect.** `cueForCard` reads `card.effect.kind` —
  needing no new state, because the effect is already on the card, and unable to disagree with what
  the card then does. It does not double up with the money sound either: drawing and acknowledging
  are two separate commands, so the draw plays the sting and the acknowledgement plays the effect.

- **One sound per command.** A card can leave three debts behind and a bankruptcy can end a game in
  the same breath. `CUE_PRIORITY` picks the most significant cue in the batch; the toasts carry the
  rest.

- **Keyed on the event id, not the cue.** Paying rent twice in a row is two sounds. Keying on the cue
  value would swallow the second, and the cue is cleared after playing so a re-render cannot replay
  it.

- **Played from a hook, not the thunk.** `useDiceRoller` and `useAnimatedTokenPositions` already own
  their own audio; a thunk touching an `Audio` element would be the odd one out. Clips are created on
  first use — nine files eagerly fetched on mount is a lot for sounds most turns never reach.

- **The mute mutes everything.** A switch that leaves the dice and the footsteps playing is worse
  than no switch, so `soundEnabled` reaches `useDiceRoller` (both the dock and the Jail panel) and the
  token walk. It lives under its own `localStorage` key rather than in the save: a preference, not
  game state, so it outlives one game.

- **Read at store creation, not at module load.** The preference started as the slice's initial
  value, which is evaluated once when the module loads — so a store built afterwards never saw a
  change. The integration test caught it; `makeStore` reads it now.

## State and data

`GameEvent.cue` is persisted, which took the save format to version 8; `v7ToV8` maps the three old
tones onto their cues and drops the field. `ui.soundCue` and `ui.soundEnabled` are ephemeral slice
state, and the mute is mirrored to `monopoly.sound.v1`. A cue on its way to the screen sits in
`ui.pendingFeedback.cue` first; switching the sound off clears that slot too, so a cue waiting on a
walk cannot fire after the player has already muted.

A note on migrations that this change taught: `v4ToV5` writes a **`tone`**, as it always did, because
a migration reproduces the shape of the version it upgrades _to_ and nothing later. Pointing it at
the current enum made v8 overwrite its own input with nothing.

## Tests

| Level       | File                                                                                   | Covers                                                                            |
| ----------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Unit        | [cards.cue.test.ts](../../src/domain/rules/engine/cards.cue.test.ts)                   | Every effect kind, and every card in both real decks, classified.                 |
| Unit        | [gameEngine.test.ts](../../src/domain/rules/gameEngine.test.ts)                        | Each cue set where it should be: bought, credit, debit, rent, built, jailed, won. |
| Unit        | [soundCue.utils.test.ts](../../src/features/game/soundCue.utils.test.ts)               | The priority pick over a mixed batch, and silence for an empty one.               |
| Unit        | [useGameSounds.test.tsx](../../src/features/game/hooks/useGameSounds.test.tsx)         | One sound per cue id, two for the same cue twice, none when muted.                |
| Unit        | [soundCues.guard.test.ts](../../src/features/game/soundCues.guard.test.ts)             | Every cue has a clip, on disk, short and audible from its first few ms.           |
| Integration | [gameSlice.integration.test.ts](../../src/features/game/gameSlice.integration.test.ts) | The cue a command leaves behind, and the mute round-tripping.                     |
| E2E         | [feedback.spec.ts](../../tests/e2e/feedback.spec.ts)                                   | Exactly one sound for a buy; muting silences the dice too; it survives a reload.  |

## Known gaps

- **Four clips are placeholders.** `bought`, `jail`, `card-good` and `card-bad` are synthesised and
  are where taste decides — see [ATTRIBUTION.md](../../src/assets/audio/ATTRIBUTION.md). Swapping one
  is a line in `soundCues.constants.ts` plus a trim.
- **No music, and no per-cue volume.** One mute and one shared `CUE_VOLUME` is the first step.
