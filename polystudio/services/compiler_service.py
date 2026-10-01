"""Compiler service — wraps frontend + backends."""
from typing import Any

from polystudio.backends.registry import get_backend
from polystudio.core.ast_nodes import pretty
from polystudio.core.lexer import Lexer
from polystudio.core.parser import Parser


class CompileResult:
    def __init__(self):
        self.success: bool = False
        self.output: str | None = None
        self.ast: str | None = None
        self.tokens: list[Any] | None = None
        self.error: str | None = None
        self.stage: str | None = None


def compile_source(source: str, target: str = "tac") -> CompileResult:
    r = CompileResult()
    try:
        r.tokens = Lexer(source).tokens
    except SyntaxError as e:
        r.error = str(e)
        r.stage = "lexer"
        return r

    try:
        tree = Parser(r.tokens).parse()
        r.ast = pretty(tree)
    except SyntaxError as e:
        r.error = str(e)
        r.stage = "parser"
        return r

    try:
        r.output = get_backend(target)().generate(tree)
        r.success = True
    except Exception as e:  # noqa: BLE001
        r.error = str(e)
        r.stage = "codegen"
    return r