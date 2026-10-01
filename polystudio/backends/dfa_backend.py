"""Regex → NFA → DFA backend (Thompson's construction + subset)."""
from polystudio.backends.base import Backend
from polystudio.core.ast_nodes import RegexDecl


# ---------- Regex parser ----------
class RegexParser:
    """Parse regex into a small AST."""

    def __init__(self, pattern):
        self.p = pattern
        self.i = 0

    def peek(self):
        return self.p[self.i] if self.i < len(self.p) else None

    def eat(self):
        c = self.p[self.i]
        self.i += 1
        return c

    def parse(self):
        n = self.alt()
        if self.i != len(self.p):
            raise SyntaxError(f"Regex parse error at position {self.i}")
        return n

    def alt(self):
        n = self.concat()
        while self.peek() == "|":
            self.eat()
            n = ("alt", n, self.concat())
        return n

    def concat(self):
        nodes = []
        while (p := self.peek()) is not None and p not in (")", "|"):
            nodes.append(self.repeat())
        if not nodes:
            return ("empty",)
        n = nodes[0]
        for nxt in nodes[1:]:
            n = ("cat", n, nxt)
        return n

    def repeat(self):
        n = self.atom()
        while self.peek() in ("*", "+", "?"):
            op = self.eat()
            n = (op, n)
        return n

    def atom(self):
        c = self.peek()
        if c == "(":
            self.eat()
            n = self.alt()
            if self.peek() != ")":
                raise SyntaxError("Missing ')' in regex")
            self.eat()
            return n
        if c == ".":
            self.eat()
            return ("any",)
        if c is None or c in ")|*+?":
            return ("empty",)
        self.eat()
        return ("lit", c)


# ---------- NFA (Thompson) ----------
class NFA:
    def __init__(self):
        self.states = {}
        self.start = None
        self.accept = None
        self._n = 0

    def new_state(self):
        sid = self._n
        self._n += 1
        self.states[sid] = {"trans": {}, "eps": set()}
        return sid

    def add_trans(self, s, sym, t):
        self.states[s]["trans"].setdefault(sym, set()).add(t)

    def add_eps(self, s, t):
        self.states[s]["eps"].add(t)


def build_nfa(ast):
    nfa = NFA()

    def rec(node):
        kind = node[0]
        if kind == "empty":
            s, e = nfa.new_state(), nfa.new_state()
            nfa.add_eps(s, e)
            return s, e
        if kind == "lit":
            s, e = nfa.new_state(), nfa.new_state()
            nfa.add_trans(s, node[1], e)
            return s, e
        if kind == "any":
            s, e = nfa.new_state(), nfa.new_state()
            nfa.add_trans(s, ".", e)
            return s, e
        if kind == "cat":
            s1, e1 = rec(node[1])
            s2, e2 = rec(node[2])
            nfa.add_eps(e1, s2)
            return s1, e2
        if kind == "alt":
            s, e = nfa.new_state(), nfa.new_state()
            s1, e1 = rec(node[1])
            s2, e2 = rec(node[2])
            nfa.add_eps(s, s1); nfa.add_eps(s, s2)
            nfa.add_eps(e1, e); nfa.add_eps(e2, e)
            return s, e
        if kind == "*":
            s, e = nfa.new_state(), nfa.new_state()
            s1, e1 = rec(node[1])
            nfa.add_eps(s, s1); nfa.add_eps(s, e)
            nfa.add_eps(e1, s1); nfa.add_eps(e1, e)
            return s, e
        if kind == "+":
            s, e = nfa.new_state(), nfa.new_state()
            s1, e1 = rec(node[1])
            nfa.add_eps(s, s1)
            nfa.add_eps(e1, s1); nfa.add_eps(e1, e)
            return s, e
        if kind == "?":
            s, e = nfa.new_state(), nfa.new_state()
            s1, e1 = rec(node[1])
            nfa.add_eps(s, s1); nfa.add_eps(s, e)
            nfa.add_eps(e1, e)
            return s, e
        raise ValueError(f"Bad node: {node}")

    nfa.start, nfa.accept = rec(ast)
    return nfa


# ---------- DFA (subset construction) ----------
class DFA:
    def __init__(self):
        self.start = frozenset()
        self.accept = set()
        self.transitions = {}
        self.alphabet = set()

    def match(self, string):
        state = self.start
        for ch in string:
            state = self.transitions.get((state, ch))
            if state is None:
                return False
        return state in self.accept

    def to_table(self):
        states = {self.start}
        for (s, _), t in self.transitions.items():
            states.add(s); states.add(t)
        rows = []
        header = "  state".ljust(20) + "| " + "  ".join(sorted(self.alphabet))
        rows.append(header)
        rows.append("-" * len(header))
        for s in sorted(states, key=lambda x: (len(x), sorted(x))):
            label = "{" + ",".join(map(str, sorted(s))) + "}"
            mark = " *" if s in self.accept else "  "
            line = f"  {label:<18}{mark}| "
            for sym in sorted(self.alphabet):
                t = self.transitions.get((s, sym))
                cell = ("{" + ",".join(map(str, sorted(t))) + "}"
                        if t else "-")
                line += cell.ljust(6)
            rows.append(line)
        rows.append("(* = accepting state)")
        return "\n".join(rows)


def eps_closure(nfa, states):
    stack = list(states)
    seen = set(states)
    while stack:
        s = stack.pop()
        for t in nfa.states[s]["eps"]:
            if t not in seen:
                seen.add(t)
                stack.append(t)
    return frozenset(seen)


def nfa_to_dfa(nfa):
    dfa = DFA()
    dfa.start = eps_closure(nfa, {nfa.start})
    worklist = [dfa.start]
    seen = {dfa.start}

    alphabet = set()
    for s, data in nfa.states.items():
        for sym in data["trans"]:
            alphabet.add(sym)
    dfa.alphabet = alphabet

    while worklist:
        cur = worklist.pop()
        if nfa.accept in cur:
            dfa.accept.add(cur)
        for sym in alphabet:
            nxt = set()
            for s in cur:
                for t in nfa.states[s]["trans"].get(sym, set()):
                    nxt.add(t)
            if not nxt:
                continue
            fs = eps_closure(nfa, nxt)
            dfa.transitions[(cur, sym)] = fs
            if fs not in seen:
                seen.add(fs)
                worklist.append(fs)
    return dfa


import json
from typing import ClassVar


class DFABackend(Backend):
    name = "dfa"
    description = "Regex → DFA"

    DEFAULT_TEST_STRINGS: ClassVar[list[str]] = [
        "aabb", "ab", "b", "abb", "aab", "abcabb", ""
    ]

    def _generate_test_strings(self, dfa, alphabet: set) -> list[str]:
        """Dynamically generate candidate test strings tailored to the expression alphabet."""
        samples: set[str] = {""}

        alpha_list = sorted(alphabet)
        # 1. Single character strings
        for ch in alpha_list:
            samples.add(ch)

        # 2. Length-2 combinations
        for a in alpha_list:
            for b in alpha_list:
                if len(samples) < 16:
                    samples.add(a + b)

        # 3. BFS traversal to discover shortest accepting strings
        queue = [(dfa.start, "")]
        visited = {dfa.start}
        accepted_found = 0
        while queue and accepted_found < 6:
            curr, path = queue.pop(0)
            if curr in dfa.accept and path:
                samples.add(path)
                accepted_found += 1
            if len(path) < 5:
                for sym in alpha_list:
                    nxt = dfa.transitions.get((curr, sym))
                    if nxt is not None and (nxt, path + sym) not in visited:
                        visited.add((nxt, path + sym))
                        queue.append((nxt, path + sym))

        # Backward compatibility for 'a' and 'b' alphabets
        if "a" in alphabet and "b" in alphabet:
            samples.update(["aabb", "abb", "ab", "b"])

        return sorted(samples, key=lambda s: (len(s), s))

    def generate(self, ast):
        decls = [s for s in ast if isinstance(s, RegexDecl)]
        if not decls:
            raise ValueError("DFA backend requires a REGEX declaration")

        out = []
        for d in decls:
            out.append(f"=== REGEX {d.name} = {d.pattern!r} ===")
            ast_re = RegexParser(d.pattern).parse()
            nfa = build_nfa(ast_re)
            dfa = nfa_to_dfa(nfa)
            out.append(f"NFA states: {len(nfa.states)}")
            out.append(f"DFA states: {len({dfa.start} | set(dfa.transitions.values()))}")
            out.append(dfa.to_table())

            # Assign sequential state names starting with start state
            states_list = [dfa.start]
            for (s, _), t in sorted(dfa.transitions.items(), key=lambda x: (len(x[0][0]), sorted(x[0][0]))):
                if s not in states_list:
                    states_list.append(s)
                if t not in states_list:
                    states_list.append(t)

            state_names = {s: f"q{i}" for i, s in enumerate(states_list)}
            transitions_data = [
                {"from": state_names[s], "symbol": sym, "to": state_names[t]}
                for (s, sym), t in sorted(
                    dfa.transitions.items(),
                    key=lambda x: (int(state_names[x[0][0]][1:]), x[0][1])
                )
            ]
            graph_data = {
                "pattern": d.pattern,
                "name": d.name,
                "alphabet": sorted(dfa.alphabet),
                "states": [state_names[s] for s in states_list],
                "start": state_names[dfa.start],
                "accept": [state_names[s] for s in states_list if s in dfa.accept],
                "transitions": transitions_data,
            }

            out.append("")
            out.append("DFA Graph Model:")
            out.append(f"  Start state: {graph_data['start']}")
            accept_str = ", ".join(graph_data["accept"]) if graph_data["accept"] else "none"
            out.append(f"  Accepting states: {accept_str}")
            out.append("  Transitions:")
            for tr in transitions_data:
                out.append(f"    {tr['from']} --({tr['symbol']})--> {tr['to']}")

            out.append("")
            out.append("Sample matches:")
            dynamic_samples = self._generate_test_strings(dfa, dfa.alphabet)
            for s in dynamic_samples:
                out.append(f"  match({s!r}) = {dfa.match(s)}")

            out.append(f"// GRAPH_JSON: {json.dumps(graph_data)}")
            out.append("")
        return "\n".join(out)