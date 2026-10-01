import os

from polystudio.backends.midi_backend import MIDIBackend
from polystudio.core.lexer import Lexer
from polystudio.core.parser import Parser


def test_midi_creates_file(tmp_path):
    src = "TEMPO 120;\nNOTE C4 DUR QUARTER;"
    tree = Parser(Lexer(src).tokens).parse()
    out_path = str(tmp_path / "test.mid")
    result = MIDIBackend(out_path=out_path).generate(tree)
    assert os.path.exists(out_path)
    assert "Wrote" in result