"""SQL backend."""
from typing import ClassVar

from polystudio.backends.base import Backend
from polystudio.core.ast_nodes import BinOp, Bool, Num, Query, Str, UnaryOp, Var


class SQLBackend(Backend):
    name = "sql"
    description = "Text → SQL"

    OP_MAP: ClassVar[dict[str, str]] = {
        "==": "=", "!=": "!=", ">": ">", "<": "<",
        ">=": ">=", "<=": "<=",
        "&&": "AND", "||": "OR",
        "and": "AND", "or": "OR", "AND": "AND", "OR": "OR",
        "like": "LIKE", "LIKE": "LIKE",
        "+": "+", "-": "-", "*": "*", "/": "/",
    }

    def generate(self, ast):
        out = []
        for stmt in ast:
            if isinstance(stmt, Query):
                out.append(self._query(stmt))
        return "\n".join(out)

    def _query(self, q):
        cols = ", ".join(q.select)
        where_clause = ""
        if q.where is not None:
            where_clause = f" WHERE {self._expr(q.where)}"
        sql = f"SELECT {cols} FROM {q.table}{where_clause}"
        if q.order_by:
            sql += f" ORDER BY {q.order_by}"
        if getattr(q, "limit", None) is not None:
            sql += f" LIMIT {q.limit}"
        return sql + ";"

    def _expr(self, node):
        if isinstance(node, Num):
            v = node.value
            return str(int(v)) if float(v).is_integer() else str(v)
        if isinstance(node, Str):
            return "'" + node.value.replace("'", "''") + "'"
        if isinstance(node, Bool):
            return "TRUE" if node.value else "FALSE"
        if isinstance(node, Var):
            return node.name
        if isinstance(node, UnaryOp):
            return f"{node.op}{self._expr(node.operand)}"
        if isinstance(node, BinOp):
            op = self.OP_MAP.get(node.op, node.op)
            return f"{self._expr(node.left)} {op} {self._expr(node.right)}"
        raise TypeError(f"Bad SQL expr: {node}")