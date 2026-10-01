"""Backend registry."""
from polystudio.backends.bf_backend import BFBackend
from polystudio.backends.dfa_backend import DFABackend
from polystudio.backends.midi_backend import MIDIBackend
from polystudio.backends.sql_backend import SQLBackend
from polystudio.backends.tac_backend import TACBackend

_BACKENDS = {
    "tac": TACBackend,
    "sql": SQLBackend,
    "dfa": DFABackend,
    "midi": MIDIBackend,
    "bf": BFBackend,
}


def get_backend(name: str):
    if name not in _BACKENDS:
        raise ValueError(f"Unknown backend: {name}")
    return _BACKENDS[name]


def list_backends():
    return [
        {"id": "midi", "name": "MIDI Music",
         "description": "Compose music from text"},
        {"id": "tac", "name": "Three-Address Code",
         "description": "Learn compiler internals"},
        {"id": "sql", "name": "SQL Query",
         "description": "Text → executable SQL"},
        {"id": "dfa", "name": "Regex → DFA",
         "description": "Visualize regex automata"},
        {"id": "bf", "name": "Brainfuck",
         "description": "Esoteric code generation"},
    ]