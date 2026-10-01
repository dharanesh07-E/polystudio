"""AST node definitions."""
from dataclasses import dataclass, field


# ------ Expressions ------
@dataclass
class Num:
    value: float
    line: int = 0

@dataclass
class Str:
    value: str
    line: int = 0

@dataclass
class Bool:
    value: bool
    line: int = 0

@dataclass
class Var:
    name: str
    line: int = 0

@dataclass
class BinOp:
    op: str
    left: object
    right: object
    line: int = 0

@dataclass
class UnaryOp:
    op: str
    operand: object
    line: int = 0

# ------ Statements ------
@dataclass
class Assign:
    name: str
    expr: object
    line: int = 0

@dataclass
class Print:
    expr: object
    line: int = 0

@dataclass
class If:
    cond: object
    then_body: list[object]
    else_body: list[object] = field(default_factory=list)
    line: int = 0

@dataclass
class While:
    cond: object
    body: list[object] = field(default_factory=list)
    line: int = 0

# ------ SQL ------
@dataclass
class Query:
    table: str
    where: object
    select: list[str]
    order_by: str | None = None
    limit: int | None = None
    line: int = 0

# ------ Regex ------
@dataclass
class RegexDecl:
    name: str
    pattern: str
    line: int = 0

# ------ Music ------
@dataclass
class Tempo:
    bpm: int
    line: int = 0

@dataclass
class Note:
    pitch: str
    duration: str
    volume: str = "mezzo"
    line: int = 0

@dataclass
class Chord:
    pitches: list[str]
    duration: str
    volume: str = "mezzo"
    line: int = 0

@dataclass
class Rest:
    duration: str
    line: int = 0

@dataclass
class Repeat:
    times: int
    body: list[object]
    line: int = 0

@dataclass
class Track:
    name: str
    body: list[object]
    line: int = 0


def pretty(node, indent: int = 0) -> str:
    pad = "  " * indent
    if isinstance(node, list):
        return "\n".join(pretty(n, indent) for n in node)
    if isinstance(node, (Num, Str, Bool)):
        return f"{pad}{type(node).__name__}({node.value!r})"
    if isinstance(node, Var):
        return f"{pad}Var({node.name})"
    if isinstance(node, BinOp):
        return (f"{pad}BinOp({node.op})\n"
                f"{pretty(node.left, indent+1)}\n"
                f"{pretty(node.right, indent+1)}")
    if isinstance(node, UnaryOp):
        return f"{pad}UnaryOp({node.op})\n{pretty(node.operand, indent+1)}"
    if isinstance(node, Assign):
        return f"{pad}Assign({node.name})\n{pretty(node.expr, indent+1)}"
    if isinstance(node, Print):
        return f"{pad}Print\n{pretty(node.expr, indent+1)}"
    if isinstance(node, Query):
        return f"{pad}Query({node.table}, {node.select})"
    if isinstance(node, RegexDecl):
        return f"{pad}RegexDecl({node.name}, {node.pattern!r})"
    if isinstance(node, Tempo):
        return f"{pad}Tempo({node.bpm})"
    if isinstance(node, Note):
        return f"{pad}Note({node.pitch}, {node.duration})"
    if isinstance(node, Chord):
        return f"{pad}Chord({node.pitches}, {node.duration})"
    if isinstance(node, Rest):
        return f"{pad}Rest({node.duration})"
    if isinstance(node, Repeat):
        return f"{pad}Repeat({node.times})\n" + "\n".join(
            pretty(s, indent+1) for s in node.body)
    if isinstance(node, Track):
        return f"{pad}Track({node.name})\n" + "\n".join(
            pretty(s, indent+1) for s in node.body)
    if isinstance(node, If):
        return f"{pad}If\n{pretty(node.cond, indent+1)}"
    if isinstance(node, While):
        return f"{pad}While\n{pretty(node.cond, indent+1)}"
    return f"{pad}{node!r}"