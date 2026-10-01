"""Chord definitions."""

CHORD_INTERVALS = {
    "major": [0, 4, 7],
    "minor": [0, 3, 7],
    "dim":   [0, 3, 6],
    "aug":   [0, 4, 8],
    "maj7":  [0, 4, 7, 11],
    "min7":  [0, 3, 7, 10],
    "dom7":  [0, 4, 7, 10],
}


from polystudio.music.notes import note_to_midi


def build_chord(root_midi, chord_type="major"):
    if isinstance(root_midi, str):
        root_midi = note_to_midi(root_midi)
    intervals = CHORD_INTERVALS.get(chord_type, [0, 4, 7])
    return [root_midi + i for i in intervals]