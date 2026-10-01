"""Brainfuck backend — constant arithmetic to BF."""
from polystudio.backends.base import Backend
from polystudio.core.ast_nodes import Assign, BinOp, Num, Print, UnaryOp, Var


class BFBackend(Backend):
    name = "bf"
    description = "Brainfuck"

    def __init__(self):
        self.code = []
        self.constants = {}

    def generate(self, ast):
        self.code = []
        self.constants = {}
        for stmt in ast:
            if isinstance(stmt, Assign):
                val = self._const_eval(stmt.expr)
                self.constants[stmt.name] = val
                self.code.append(self._emit_set(val))
                self.code.append(".")
            elif isinstance(stmt, Print):
                val = self._const_eval(stmt.expr)
                self.code.append(self._emit_set(val))
                self.code.append(".")
        return "".join(self.code)

    def _const_eval(self, node):
        if isinstance(node, Num):
            return int(node.value)
        if isinstance(node, Var):
            if node.name not in self.constants:
                raise NameError(
                    f"Line {node.line}: BF needs constant '{node.name}'"
                )
            return self.constants[node.name]
        if isinstance(node, UnaryOp):
            if node.op == "-":
                return -self._const_eval(node.operand)
            return self._const_eval(node.operand)
        if isinstance(node, BinOp):
            l = self._const_eval(node.left)
            r = self._const_eval(node.right)
            return {
                "+": l + r, "-": l - r, "*": l * r,
                "/": l // r if r else 0,
                "%": l % r if r else 0,
            }.get(node.op, 0)
        raise TypeError(f"Bad BF expr: {node}")

    @staticmethod
    def _emit_set(n):
        """Set current cell to n. Simple '+' * n (works for small n)."""
        if n <= 0:
            return ""
        return "+" * n