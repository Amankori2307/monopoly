# Dice Roll Sound

`dice-roll.wav` is `dice-1.wav` from the **2 dice roll (29 throws)** pack by
RPG on OpenGameArt. The asset is licensed CC0 1.0.

Source: https://opengameart.org/content/2-dice-roll-29-throws

# Token Step Sound

`token-step.wav` is one pop trimmed out of `freesound_community-pop-or-bloop-7008.mp3`, supplied by
the project owner. Rebuild it with:

```bash
python3 tools/trim-token-step.py <path to the source mp3>
```

The source is a 6.7s pack of twelve pops. The one at 3588ms is the pick - loud, a 2ms attack, and
decayed to -40dB inside 42ms, the tightest tail of the twelve; the rest ring for 65-90ms, which
would overlap the next step at the walk's fastest pace. The trimmed clip is 48ms mono, peaking at
82% of full scale.

**Licence: unconfirmed.** The filename follows the pattern Pixabay uses for its "Freesound
Community" uploads, which ship under the Pixabay Content Licence, but that has not been verified
against the original listing - confirm it before shipping publicly. The source file itself is
deliberately not committed.

It replaced a 1373ms stereo recording whose first sound was 177ms in. The walk retriggers the step
every 70-180ms, so that clip was cut off before it made any sound at all - the tak-tak was inaudible
no matter how loudly it played. `tokenStepSound.test.ts` measures the two properties that matter:
short enough for the fastest step, and audible from the first millisecond.

# Event Cue Sounds

`credit`, `debit`, `rent`, `built`, `bought`, `jail`, `card-good`, `card-bad` and `won` are
generated. Rebuild them all with:

```bash
python3 tools/generate-cue-sounds.py
```

Synthesised rather than sourced: no licence to confirm, every clip tunable by numbers, and the whole
set reproducible from one seed per clip. Each is mono, 44.1kHz, peaks at 80% of full scale and starts
sounding within a few milliseconds — `soundCues.guard.test.ts` measures all of that, because a clip
that begins with silence is a clip nobody hears.

**Four are placeholders.** `bought`, `jail`, `card-good` and `card-bad` are where taste decides, and
a synthesised fanfare or clang will only ever be adequate. To replace one: put the file in this
folder, point its cue at it in
[soundCues.constants.ts](../../features/game/soundCues.constants.ts), and trim it the way
[tools/trim-token-step.py](../../../tools/trim-token-step.py) does — short, and audible from the
first millisecond.
