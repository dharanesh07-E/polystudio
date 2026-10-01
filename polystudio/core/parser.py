"""Recursive-descent parser for PolyLang."""
from polystudio.core.ast_nodes import (
    Assign,
    BinOp,
    Bool,
    Chord,
    If,
    Note,
    Num,
    Print,
    Query,
    RegexDecl,
    Repeat,
    Rest,
    Str,
    Tempo,
    Track,
    UnaryOp,
    Var,
    While,
)


class Parser:
    def __init__(self, tokens):
        self.tokens = tokens
        self.pos = 0

    def peek(self):
        return self.tokens[self.pos]

    def advance(self):
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def expect(self, ttype):
        tok = self.peek()
        if tok.type != ttype:
            raise SyntaxError(
                f"Line {tok.line}, Col {tok.col}: "
                f"Expected {ttype}, got {tok.type} ('{tok.value}')"
            )
        return self.advance()

    def match(self, *ttypes):
        if self.peek().type in ttypes:
            return self.advance()
        return None

    def parse(self):
        stmts = []
        while self.peek().type != "EOF":
            stmts.append(self.statement())
        return stmts

    def block(self):
        self.expect("LBRACE")
        body = []
        while self.peek().type != "RBRACE":
            body.append(self.statement())
        self.expect("RBRACE")
        return body

    def statement(self):
        t = self.peek().type
        handlers = {
            "ID": self.assign,
            "FROM": self.query,
            "SELECT": self.query_select_first,
            "STRING": self.string_stmt,
            "REGEX": self.regex_decl,
            "TEMPO": self.tempo,
            "NOTE": self.note,
            "CHORD": self.chord,
            "REST": self.rest,
            "REPEAT": self.repeat,
            "TRACK": self.track,
            "IF": self.if_stmt,
            "WHILE": self.while_stmt,
            "PRINT": self.print_stmt,
        }
        if t in handlers:
            return handlers[t]()
        tok = self.peek()
        raise SyntaxError(
            f"Line {tok.line}, Col {tok.col}: Unexpected token '{tok.value}'"
        )

    def string_stmt(self):
        tok = self.expect("STRING")
        self.match("SEMI")
        return Str(tok.value[1:-1], line=tok.line)

    def assign(self):
        name = self.expect("ID")
        self.expect("ASSIGN")
        e = self.expr()
        self.expect("SEMI")
        return Assign(name.value, e, line=name.line)

    def print_stmt(self):
        kw = self.expect("PRINT")
        e = self.expr()
        self.expect("SEMI")
        return Print(e, line=kw.line)

    def if_stmt(self):
        kw = self.expect("IF")
        cond = self.expr()
        then_body = self.block()
        else_body = []
        if self.match("ELSE"):
            else_body = self.block()
        return If(cond, then_body, else_body, line=kw.line)

    def while_stmt(self):
        kw = self.expect("WHILE")
        cond = self.expr()
        body = self.block()
        return While(cond, body, line=kw.line)

    # ---- music ----
    def tempo(self):
        kw = self.expect("TEMPO")
        bpm = int(float(self.expect("NUMBER").value))
        self.expect("SEMI")
        return Tempo(bpm, line=kw.line)

    def note(self):
        kw = self.expect("NOTE")
        pitch = self.expect("ID").value
        self.expect("DUR")
        duration = self.expect("ID").value.upper()
        volume = "mezzo"
        if self.match("VOLUME"):
            volume = self.expect("ID").value.lower()
        self.expect("SEMI")
        return Note(pitch, duration, volume, line=kw.line)

    def chord(self):
        kw = self.expect("CHORD")
        pitches = [self.expect("ID").value]
        while self.peek().type == "ID" and self.peek().value.upper() != "DUR":
            pitches.append(self.expect("ID").value)
        self.expect("DUR")
        duration = self.expect("ID").value.upper()
        volume = "mezzo"
        if self.match("VOLUME"):
            volume = self.expect("ID").value.lower()
        self.expect("SEMI")
        return Chord(pitches, duration, volume, line=kw.line)

    def rest(self):
        kw = self.expect("REST")
        self.expect("DUR")
        duration = self.expect("ID").value.upper()
        self.expect("SEMI")
        return Rest(duration, line=kw.line)

    def repeat(self):
        kw = self.expect("REPEAT")
        times = int(float(self.expect("NUMBER").value))
        body = self.block()
        return Repeat(times, body, line=kw.line)

    def track(self):
        kw = self.expect("TRACK")
        name = self.expect("ID").value
        body = self.block()
        return Track(name, body, line=kw.line)

    def _parse_select_cols(self):
        cols = []
        if self.peek().type == "MUL":
            self.advance()
            cols.append("*")
        else:
            cols.append(self.expect("ID").value)
        while self.match("COMMA"):
            if self.peek().type == "MUL":
                self.advance()
                cols.append("*")
            else:
                cols.append(self.expect("ID").value)
        return cols

    def _parse_order_by(self):
        if self.match("ORDER"):
            self.expect("BY")
            col = self.expect("ID").value
            if self.match("DESC"):
                return f"{col} DESC"
            elif self.match("ASC"):
                return f"{col} ASC"
            return col
        return None

    def _parse_limit(self):
        if self.match("LIMIT"):
            num_tok = self.expect("NUMBER")
            return int(float(num_tok.value))
        return None

    # ---- SQL ----
    def query(self):
        kw = self.expect("FROM")
        table = self.expect("ID").value
        where = None
        if self.match("WHERE"):
            where = self.expr()
        self.expect("SELECT")
        cols = self._parse_select_cols()
        if where is None and self.match("WHERE"):
            where = self.expr()
        order_by = self._parse_order_by()
        limit = self._parse_limit()
        if order_by is None:
            order_by = self._parse_order_by()
        self.expect("SEMI")
        return Query(table, where, cols, order_by, limit, line=kw.line)

    def query_select_first(self):
        kw = self.expect("SELECT")
        cols = self._parse_select_cols()
        self.expect("FROM")
        table = self.expect("ID").value
        where = None
        if self.match("WHERE"):
            where = self.expr()
        order_by = self._parse_order_by()
        limit = self._parse_limit()
        if order_by is None:
            order_by = self._parse_order_by()
        self.expect("SEMI")
        return Query(table, where, cols, order_by, limit, line=kw.line)

    def regex_decl(self):
        kw = self.expect("REGEX")
        name = self.expect("ID").value
        self.expect("ASSIGN")
        pat = self.expect("STRING").value[1:-1]
        self.expect("SEMI")
        return RegexDecl(name, pat, line=kw.line)

    # ---- expressions ----
    def expr(self):
        return self.logical_or()

    def logical_or(self):
        node = self.logical_and()
        while self.peek().type == "OR":
            op = self.advance().value.upper()
            node = BinOp(op, node, self.logical_and())
        return node

    def logical_and(self):
        node = self.comparison()
        while self.peek().type == "AND":
            op = self.advance().value.upper()
            node = BinOp(op, node, self.comparison())
        return node

    def comparison(self):
        node = self.arithmetic()
        while self.peek().type in ("GT", "LT", "EQ", "NEQ", "GTE", "LTE", "LIKE"):
            op = self.advance().value
            node = BinOp(op, node, self.arithmetic())
        return node

    def arithmetic(self):
        node = self.term()
        while self.peek().type in ("PLUS", "MINUS"):
            op = self.advance().value
            node = BinOp(op, node, self.term())
        return node

    def term(self):
        node = self.power()
        while self.peek().type in ("MUL", "DIV", "MOD"):
            op = self.advance().value
            node = BinOp(op, node, self.power())
        return node

    def power(self):
        node = self.factor()
        if self.match("POW"):
            return BinOp("^", node, self.power())
        return node

    def factor(self):
        tok = self.peek()
        if tok.type in ("NUMBER", "FLOAT"):
            self.advance()
            return Num(float(tok.value), line=tok.line)
        if tok.type == "STRING":
            self.advance()
            return Str(tok.value[1:-1], line=tok.line)
        if tok.type == "TRUE":
            self.advance()
            return Bool(True, line=tok.line)
        if tok.type == "FALSE":
            self.advance()
            return Bool(False, line=tok.line)
        if tok.type == "MINUS":
            self.advance()
            return UnaryOp("-", self.factor(), line=tok.line)
        if tok.type == "ID":
            self.advance()
            return Var(tok.value, line=tok.line)
        if tok.type == "LPAREN":
            self.advance()
            node = self.expr()
            self.expect("RPAREN")
            return node
        raise SyntaxError(
            f"Line {tok.line}, Col {tok.col}: Unexpected token '{tok.value}'"
        )