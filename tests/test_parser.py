import pytest

from polystudio.core.ast_nodes import Assign, Note, Query, RegexDecl
from polystudio.core.lexer import Lexer
from polystudio.core.parser import Parser


def parse(src):
    return Parser(Lexer(src).tokens).parse()


def test_assign():
    tree = parse("x = 5;")
    assert isinstance(tree[0], Assign)
    assert tree[0].name == "x"


def test_query():
    tree = parse("FROM users WHERE age > 25 SELECT name;")
    assert isinstance(tree[0], Query)
    assert tree[0].table == "users"


def test_regex():
    tree = parse('REGEX r = "abc";')
    assert isinstance(tree[0], RegexDecl)


def test_note():
    tree = parse("NOTE C4 DUR QUARTER;")
    assert isinstance(tree[0], Note)


def test_syntax_error():
    with pytest.raises(SyntaxError):
        parse("x = ;")