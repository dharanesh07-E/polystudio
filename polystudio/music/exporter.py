"""Export to MusicXML (optional, requires music21)."""

try:
    from music21 import chord, note, stream  # type: ignore[import-not-found,import-untyped]
    from music21 import tempo as m21tempo  # type: ignore[import-not-found,import-untyped]
    HAS_MUSIC21 = True
except ImportError:
    HAS_MUSIC21 = False
    chord = note = stream = m21tempo = None  # type: ignore

from polystudio.core.ast_nodes import Chord, Note, Tempo
from polystudio.music.notes import DURATION_TICKS


def duration_to_quarters(dur: str) -> float:
    ticks = DURATION_TICKS.get(dur.upper(), 480)
    return ticks / 480.0


def export_musicxml(ast, path="output.musicxml"):
    if not HAS_MUSIC21 or stream is None or m21tempo is None or note is None or chord is None:
        raise ImportError("Install music21: pip install music21")
    assert stream is not None and m21tempo is not None and note is not None and chord is not None
    s = stream.Score()
    part = stream.Part()
    for stmt in ast:
        if isinstance(stmt, Tempo):
            part.append(m21tempo.MetronomeMark(number=stmt.bpm))
        elif isinstance(stmt, Note):
            n = note.Note(stmt.pitch)
            n.quarterLength = duration_to_quarters(stmt.duration)
            part.append(n)
        elif isinstance(stmt, Chord):
            c = chord.Chord(stmt.pitches)
            c.quarterLength = duration_to_quarters(stmt.duration)
            part.append(c)
    s.append(part)
    s.write("musicxml", fp=path)
    return path