"""Simple symbol table with scope support."""


class SymbolTable:
    def __init__(self, parent=None):
        self.symbols = {}
        self.parent = parent

    def declare(self, name, value=None, type_=None):
        self.symbols[name] = {"value": value, "type": type_}

    def lookup(self, name):
        if name in self.symbols:
            return self.symbols[name]
        if self.parent:
            return self.parent.lookup(name)
        return None

    def contains(self, name):
        return self.lookup(name) is not None

    def child(self):
        return SymbolTable(self)