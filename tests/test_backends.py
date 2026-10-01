from polystudio.backends.registry import get_backend
from polystudio.core.lexer import Lexer
from polystudio.core.parser import Parser


def compile_to(src, target):
    tree = Parser(Lexer(src).tokens).parse()
    return get_backend(target)().generate(tree)


def test_tac():
    out = compile_to("x = 5 + 3 * 2;", "tac")
    assert "t1" in out
    assert "3 * 2" in out


def test_sql():
    out = compile_to("FROM users WHERE age > 25 SELECT name;", "sql")
    assert "SELECT name" in out
    assert "FROM users" in out


def test_sql_variations():
    # SELECT first syntax
    out1 = compile_to("SELECT * FROM users;", "sql")
    assert out1 == "SELECT * FROM users;"

    # Optional WHERE & LIMIT
    out2 = compile_to("FROM orders SELECT total ORDER BY total DESC LIMIT 3;", "sql")
    assert "SELECT total FROM orders ORDER BY total DESC LIMIT 3;" == out2

    # Logical operators & comparisons
    out3 = compile_to("FROM users WHERE age >= 20 AND age <= 30 SELECT name, email;", "sql")
    assert "WHERE age >= 20 AND age <= 30" in out3


def test_dfa():
    out = compile_to('REGEX r = "(a|b)*abb";', "dfa")
    assert "DFA" in out
    assert "match('aabb') = True" in out


def test_bf():
    out = compile_to("x = 3 + 5; print x;", "bf")
    assert len(out) > 0