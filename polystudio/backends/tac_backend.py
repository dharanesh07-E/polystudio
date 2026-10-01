"""Three-Address Code backend."""
from polystudio.backends.base import Backend
from polystudio.core.ast_nodes import Assign, BinOp, Num, Print, UnaryOp, Var


class TACBackend(Backend):
    name = "tac"
    description = "Three-Address Code"

    def __init__(self):
        self.temp = 0
        self.code = []
        self.symbols = {}

    def new_temp(self):
        self.temp += 1
        return f"t{self.temp}"

    def generate(self, ast):
        self.temp = 0
        self.code = []
        self.symbols = {}
        for stmt in ast:
            if isinstance(stmt, Assign):
                r = self._expr(stmt.expr)
                self.code.append(f"{stmt.name} = {r}")
                self.symbols[stmt.name] = True
            elif isinstance(stmt, Print):
                r = self._expr(stmt.expr)
                self.code.append(f"PRINT {r}")
        return "\n".join(self.code)

    def _expr(self, node):
        if isinstance(node, Num):
            v = node.value
            return str(int(v)) if float(v).is_integer() else str(v)
        if isinstance(node, Var):
            if node.name not in self.symbols:
                raise NameError(
                    f"Line {node.line}: Undeclared variable '{node.name}'"
                )
            return node.name
        if isinstance(node, UnaryOp):
            return f"-{self._expr(node.operand)}"
        if isinstance(node, BinOp):
            l = self._expr(node.left)
            r = self._expr(node.right)
            t = self.new_temp()
            self.code.append(f"{t} = {l} {node.op} {r}")
            return t
        raise TypeError(f"Unknown node: {node}")