"""Lexer for PolyLang."""
from dataclasses import dataclass
from typing import Any

from polystudio.core.errors import LexError


@dataclass
class Token:
    type: str
    value: Any
    line: int = 1
    col: int = 1

    def __repr__(self):
        return f"Token({self.type}, {self.value!r}, L{self.line}:C{self.col})"


KEYWORDS = {
    "from": "FROM",
    "where": "WHERE",
    "select": "SELECT",
    "order": "ORDER",
    "by": "BY",
    "regex": "REGEX",
    "tempo": "TEMPO",
    "note": "NOTE",
    "chord": "CHORD",
    "rest": "REST",
    "repeat": "REPEAT",
    "track": "TRACK",
    "dur": "DUR",
    "volume": "VOLUME",
    "if": "IF",
    "else": "ELSE",
    "while": "WHILE",
    "print": "PRINT",
    "true": "TRUE",
    "false": "FALSE",
    "limit": "LIMIT",
    "asc": "ASC",
    "desc": "DESC",
    "and": "AND",
    "or": "OR",
    "not": "NOT",
    "like": "LIKE",
    "in": "IN",
}


class Lexer:
    def __init__(self, source: str):
        self.source = source
        self.pos = 0
        self.line = 1
        self.col = 1
        self.tokens: list[Token] = []
        self._tokenize()

    def _peek(self, offset: int = 0) -> str:
        idx = self.pos + offset
        if idx < len(self.source):
            return self.source[idx]
        return ""

    def _advance(self) -> str:
        if self.pos >= len(self.source):
            return ""
        ch = self.source[self.pos]
        self.pos += 1
        if ch == "\n":
            self.line += 1
            self.col = 1
        else:
            self.col += 1
        return ch

    def _tokenize(self):
        while self.pos < len(self.source):
            ch = self._peek()

            # Skip whitespace
            if ch in " \t\r\n":
                self._advance()
                continue

            # Comments
            if ch == "/" and self._peek(1) == "/":
                while self.pos < len(self.source) and self._peek() != "\n":
                    self._advance()
                continue

            start_line = self.line
            start_col = self.col

            # Two-character operators
            two = ch + self._peek(1)
            if two == "==":
                self._advance(); self._advance()
                self.tokens.append(Token("EQ", "==", start_line, start_col))
                continue
            if two == "!=":
                self._advance(); self._advance()
                self.tokens.append(Token("NEQ", "!=", start_line, start_col))
                continue
            if two == "<=":
                self._advance(); self._advance()
                self.tokens.append(Token("LTE", "<=", start_line, start_col))
                continue
            if two == ">=":
                self._advance(); self._advance()
                self.tokens.append(Token("GTE", ">=", start_line, start_col))
                continue
            if two == "&&":
                self._advance(); self._advance()
                self.tokens.append(Token("AND", "and", start_line, start_col))
                continue
            if two == "||":
                self._advance(); self._advance()
                self.tokens.append(Token("OR", "or", start_line, start_col))
                continue

            # Single-character tokens
            single_map = {
                "=": "ASSIGN",
                ";": "SEMI",
                ",": "COMMA",
                "+": "PLUS",
                "-": "MINUS",
                "*": "MUL",
                "/": "DIV",
                "%": "MOD",
                "^": "POW",
                ">": "GT",
                "<": "LT",
                "(": "LPAREN",
                ")": "RPAREN",
                "{": "LBRACE",
                "}": "RBRACE",
            }
            if ch in single_map:
                self._advance()
                self.tokens.append(Token(single_map[ch], ch, start_line, start_col))
                continue

            # Strings
            if ch in ('"', "'"):
                quote = self._advance()
                val = quote
                closed = False
                while self.pos < len(self.source):
                    c = self._advance()
                    val += c
                    if c == quote:
                        closed = True
                        break
                if not closed:
                    raise LexError("Unterminated string literal", start_line, start_col)
                self.tokens.append(Token("STRING", val, start_line, start_col))
                continue

            # Numbers
            if ch.isdigit():
                val = ""
                has_dot = False
                while self.pos < len(self.source):
                    c = self._peek()
                    if c.isdigit():
                        val += self._advance()
                    elif c == "." and not has_dot and self._peek(1).isdigit():
                        has_dot = True
                        val += self._advance()
                    else:
                        break
                ttype = "FLOAT" if has_dot else "NUMBER"
                self.tokens.append(Token(ttype, val, start_line, start_col))
                continue

            # Identifiers and keywords (supports notes like C4, D#5)
            if ch.isalpha() or ch == "_":
                val = ""
                while self.pos < len(self.source):
                    c = self._peek()
                    if c.isalnum() or c == "_" or c == "#":
                        val += self._advance()
                    else:
                        break
                kw = KEYWORDS.get(val.lower())
                if kw is not None:
                    self.tokens.append(Token(kw, val, start_line, start_col))
                else:
                    self.tokens.append(Token("ID", val, start_line, start_col))
                continue

            # Unknown/illegal character
            raise LexError(f"Unexpected character '{ch}'", start_line, start_col)

        self.tokens.append(Token("EOF", "", self.line, self.col))
