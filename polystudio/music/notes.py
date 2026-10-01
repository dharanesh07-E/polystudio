"""Note tables, durations, volumes."""

NOTE_OFFSET = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

DURATION_TICKS = {
    "WHOLE": 1920,
    "HALF": 960,
    "QUARTER": 480,
    "EIGHTH": 240,
    "SIXTEENTH": 120,
}

VOLUMES = {
    "piano": 40,
    "mezzo": 64,
    "forte": 90,
    "fortissimo": 115,
}


def note_to_midi(name: str) -> int:
    """'C4' → 60, 'D#5' → 75, 'Eb3' → 51."""
    if not name or name[0].upper() not in NOTE_OFFSET:
        raise ValueError(f"Bad note name: {name!r}")
    letter = name[0].upper()
    rest = name[1:]
    acc = 0
    if rest and rest[0] in "#b":
        acc = 1 if rest[0] == "#" else -1
        rest = rest[1:]
    if not rest:
        raise ValueError(f"Note missing octave: {name!r}")
    octave = int(rest)
    return (octave + 1) * 12 + NOTE_OFFSET[letter] + acc


def midi_to_note(pitch: int) -> str:
    names = ["C", "C#", "D", "D#", "E", "F",
             "F#", "G", "G#", "A", "A#", "B"]
    return f"{names[pitch % 12]}{pitch // 12 - 1}"


def duration_to_ticks(duration: str) -> int:
    return DURATION_TICKS.get(duration.upper(), 480)


def volume_to_velocity(volume: str) -> int:
    return VOLUMES.get(volume.lower(), 64)