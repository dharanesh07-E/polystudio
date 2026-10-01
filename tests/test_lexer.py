import pytest

from polystudio.core.lexer import Lexer


def test_basic_assignment():
    toks = Lexer("x = 5;").tokens
    assert [t.type for t in toks] == ["ID", "ASSIGN", "NUMBER", "SEMI", "EOF"]


def test_music_note():
    toks = Lexer("NOTE C4 DUR QUARTER;").tokens
    assert toks[0].type == "NOTE"
    assert toks[1].value == "C4"
    assert toks[2].type == "DUR"


@pytest.mark.parametrize("bad", ["x = @;", "x = §;"])
def test_bad_char(bad):
    with pytest.raises(SyntaxError):
        _ = Lexer(bad).tokens