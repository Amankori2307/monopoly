#!/usr/bin/env python3
"""Generates the event-cue sounds into src/assets/audio/.

Every event the engine logs carries a cue saying what happened, and each cue that
is worth hearing gets a clip here. Synthesised rather than sourced: no licence to
confirm, every clip tunable by numbers, and the whole set reproducible from one
seed.

Four of them are deliberately placeholders - bought, jail, card-good and card-bad
are where taste decides, and a synthesised fanfare will only ever be adequate.
See src/assets/audio/ATTRIBUTION.md.

Every clip is mono 44.1kHz and starts sounding immediately, because a cue that
begins with silence is a cue nobody hears - the token step shipped 1373ms long
with its first sound 177ms in and was inaudible at every pace the walk uses.

Run: python3 tools/generate-cue-sounds.py
"""

import math
import random
import struct
import wave
from pathlib import Path

SAMPLE_RATE = 44100
OUT_DIR = Path(__file__).resolve().parent.parent / "src/assets/audio"
PEAK = 0.8


def sine(freq: float, t: float) -> float:
    return math.sin(2 * math.pi * freq * t)


def decay(t: float, tau: float) -> float:
    return math.exp(-t / tau)


def note(freq: float, tau: float, amp: float = 1.0, start: float = 0.0):
    """A struck tone: a partial above the root, both dying away."""

    def voice(t: float) -> float:
        local = t - start
        if local < 0:
            return 0.0
        body = sine(freq, local) + 0.34 * sine(freq * 2.02, local)
        return amp * body * decay(local, tau)

    return voice


def noise_burst(tau: float, amp: float, start: float = 0.0):
    """The contact transient - a knock's edge rather than its ring."""
    grains = [random.uniform(-1.0, 1.0) for _ in range(int(SAMPLE_RATE * 0.05))]

    def voice(t: float) -> float:
        local = t - start
        index = int(local * SAMPLE_RATE)
        if local < 0 or index >= len(grains):
            return 0.0
        return amp * grains[index] * decay(local, tau)

    return voice


# Frequencies chosen as intervals rather than absolutes: rising thirds read as
# "good", falling ones as "bad", whatever the root.
CLIPS = {
    # A coin landing: two quick rising partials, bright and short.
    "credit": (0.34, [note(880, 0.09), note(1318, 0.13, 0.9, 0.055)]),
    # Money out: low, muted, no brightness to it.
    "debit": (0.26, [note(150, 0.10, 1.0), note(98, 0.14, 0.7), noise_burst(0.004, 0.25)]),
    # Rent: the debit, then a second knock - it went to a *person*.
    "rent": (
        0.38,
        [
            note(160, 0.08, 0.9),
            noise_burst(0.004, 0.22),
            note(220, 0.10, 0.8, 0.13),
            noise_burst(0.004, 0.18, 0.13),
        ],
    ),
    # A building going up: a wooden clunk, close kin to the token step.
    "built": (0.20, [note(300, 0.05, 0.9), note(520, 0.035, 0.5), noise_burst(0.003, 0.4)]),
    # -- placeholders below: swap for real recordings ------------------------
    # Bought: a rising major arpeggio, the small win.
    "bought": (
        0.62,
        [note(523, 0.16), note(659, 0.16, 1.0, 0.09), note(784, 0.30, 1.0, 0.18)],
    ),
    # Jail: a struck, damped metallic clang with inharmonic partials.
    "jail": (
        0.70,
        [
            note(196, 0.30, 1.0),
            note(311, 0.22, 0.7),
            note(466, 0.16, 0.45),
            noise_burst(0.006, 0.35),
        ],
    ),
    # A good card: two notes up.
    "card-good": (0.42, [note(659, 0.11), note(988, 0.20, 0.95, 0.08)]),
    # A bad card: two notes down, minor.
    "card-bad": (0.46, [note(415, 0.13), note(311, 0.24, 0.95, 0.09)]),
    # The game: a longer arpeggio over a held root.
    "won": (
        1.15,
        [
            note(392, 0.75, 0.55),
            note(523, 0.18),
            note(659, 0.18, 1.0, 0.11),
            note(784, 0.18, 1.0, 0.22),
            note(1046, 0.55, 1.0, 0.33),
        ],
    ),
}

ATTACK_S = 0.002
FADE_S = 0.02


def envelope(index: int, total: int) -> float:
    t = index / SAMPLE_RATE
    gain = 1.0
    if t < ATTACK_S:
        gain *= t / ATTACK_S
    remaining = (total - index) / SAMPLE_RATE
    if remaining < FADE_S:
        gain *= 0.5 - 0.5 * math.cos(math.pi * remaining / FADE_S)
    return gain


def write(name: str, seconds: float, voices) -> None:
    total = int(SAMPLE_RATE * seconds)
    raw = [
        sum(voice(index / SAMPLE_RATE) for voice in voices) * envelope(index, total)
        for index in range(total)
    ]
    loudest = max(abs(value) for value in raw) or 1.0
    scale = PEAK / loudest
    frames = b"".join(
        struct.pack("<h", int(max(-1.0, min(1.0, value * scale)) * 32767)) for value in raw
    )

    path = OUT_DIR / f"{name}.wav"
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(frames)
    print(f"{path.name}: {seconds * 1000:.0f}ms, {path.stat().st_size / 1024:.1f}KB")


def main() -> None:
    for name, (seconds, voices) in CLIPS.items():
        # Reseeded per clip, so adding one does not change the others.
        random.seed(f"monopoly-cue-{name}")
        write(name, seconds, voices)


if __name__ == "__main__":
    main()
