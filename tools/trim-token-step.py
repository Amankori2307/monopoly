#!/usr/bin/env python3
"""Trims one pop out of the source pack into src/assets/audio/token-step.wav.

The walk retriggers the step sound every 70-180ms, so the clip has to be short
and it has to start immediately. The source is a 6.7s pack of twelve pops at
24kHz stereo; the one at 3588ms is the pick - loud, a 2ms attack, and decayed to
-40dB inside 42ms, the tightest tail of the twelve. Everything else in the pack
rings for 65-90ms, which would overlap the next step at the fastest pace.

The source is not in the repo (see ATTRIBUTION.md), so this takes its path:

    python3 tools/trim-token-step.py ~/Downloads/freesound_community-pop-or-bloop-7008.mp3

Needs `afconvert`, which ships with macOS. The offsets below are what make it
reproducible; re-run the measurement in the docstring above if the source ever
changes.
"""

import array
import math
import struct
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / "src/assets/audio/token-step.wav"
SAMPLE_RATE = 44100

# The chosen pop, measured in the decoded 44.1kHz mono source.
POP_AT_MS = 3588
# A couple of ms before the onset, so the attack is not clipped into a click.
LEAD_MS = 2.0
LENGTH_MS = 48.0
FADE_IN_MS = 0.5
FADE_OUT_MS = 6.0
PEAK = 0.82


def decode(source: Path, into: Path) -> None:
    subprocess.run(
        ["afconvert", "-f", "WAVE", "-d", f"LEI16@{SAMPLE_RATE}", "-c", "1",
         str(source), str(into)],
        check=True,
    )


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(f"usage: {sys.argv[0]} <source audio file>")
    source = Path(sys.argv[1]).expanduser()
    if not source.is_file():
        sys.exit(f"no such file: {source}")

    with tempfile.TemporaryDirectory() as work:
        decoded = Path(work) / "decoded.wav"
        decode(source, decoded)
        with wave.open(str(decoded)) as clip:
            if clip.getframerate() != SAMPLE_RATE or clip.getnchannels() != 1:
                sys.exit("expected the decode to be mono at the target rate")
            samples = array.array("h", clip.readframes(clip.getnframes()))

    start = int(SAMPLE_RATE * (POP_AT_MS - LEAD_MS) / 1000)
    total = int(SAMPLE_RATE * LENGTH_MS / 1000)
    window = [samples[start + i] / 32768.0 for i in range(total)]

    fade_in = max(1, int(SAMPLE_RATE * FADE_IN_MS / 1000))
    fade_out = max(1, int(SAMPLE_RATE * FADE_OUT_MS / 1000))
    for index in range(total):
        if index < fade_in:
            window[index] *= index / fade_in
        remaining = total - index
        if remaining < fade_out:
            # Cosine, so the tail reaches silence without a step in it.
            window[index] *= 0.5 - 0.5 * math.cos(math.pi * remaining / fade_out)

    loudest = max(abs(value) for value in window) or 1.0
    scale = PEAK / loudest
    frames = b"".join(
        struct.pack("<h", int(max(-1.0, min(1.0, value * scale)) * 32767))
        for value in window
    )

    with wave.open(str(OUTPUT), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(frames)

    print(f"{OUTPUT.name}: {total} frames, {total / SAMPLE_RATE * 1000:.0f}ms, mono")


if __name__ == "__main__":
    main()
