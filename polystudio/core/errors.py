"""Compiler errors."""


class PolyError(Exception):
    def __init__(self, message, line=0, col=0):
        self.message = message
        self.line = line
        self.col = col
        super().__init__(f"Line {line}, Col {col}: {message}")


class LexError(PolyError, SyntaxError):
    pass


class ParseError(PolyError, SyntaxError):
    pass


class SemanticError(PolyError):
    pass


class CodegenError(PolyError):
    pass