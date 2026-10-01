"""Abstract backend."""
from abc import ABC, abstractmethod


class Backend(ABC):
    name = "base"
    description = ""

    @abstractmethod
    def generate(self, ast) -> str:
        pass

    def emit_file(self, ast, path: str) -> str:
        out = self.generate(ast)
        with open(path, "w") as f:
            f.write(out)
        return out