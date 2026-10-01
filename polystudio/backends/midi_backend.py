"""MIDI backend — compiles PolyLang music to .mid files."""
from polystudio.backends.base import Backend
from polystudio.core.ast_nodes import (
    Assign,
    BinOp,
    Chord,
    If,
    Note,
    Num,
    Print,
    Repeat,
    Rest,
    Tempo,
    Track,
    UnaryOp,
    Var,
    While,
)
from polystudio.music.notes import (
    duration_to_ticks,
    note_to_midi,
    volume_to_velocity,
)

try:
    from mido import (  # type: ignore[import-untyped]
        Message,
        MetaMessage,
        MidiFile,
        MidiTrack,
        bpm2tempo,
    )
    HAS_MIDO = True
except ImportError:
    HAS_MIDO = False
    Message = MetaMessage = MidiFile = MidiTrack = bpm2tempo = None  # type: ignore


class MIDIBackend(Backend):
    name = "midi"
    description = "MIDI Music"

    def __init__(self, out_path="output.mid"):
        self.out_path = out_path
        self.events = []
        self.current_time = 0
        self.constants = {}
        self.note_count = 0
        self.chord_count = 0
        self.tracks = {}

    def generate(self, ast):
        if (
            not HAS_MIDO
            or MidiFile is None
            or MidiTrack is None
            or MetaMessage is None
            or Message is None
            or bpm2tempo is None
        ):
            raise ImportError("Install mido: pip install mido")

        assert (
            MidiFile is not None
            and MidiTrack is not None
            and MetaMessage is not None
            and Message is not None
            and bpm2tempo is not None
        )

        self.events = []
        self.current_time = 0
        self.constants = {}
        self.note_count = 0
        self.chord_count = 0

        self._compile_block(ast)

        mid = MidiFile()
        track = MidiTrack()
        mid.tracks.append(track)
        track.append(MetaMessage("set_tempo", tempo=bpm2tempo(120), time=0))

        self.events.sort(key=lambda e: e[0])
        last = 0
        for t, typ, data in self.events:
            delta = t - last
            last = t
            if typ == "tempo":
                track.append(MetaMessage("set_tempo",
                                         tempo=bpm2tempo(data), time=delta))
            elif typ == "note_on":
                pitch, vel = data
                track.append(Message("note_on", note=pitch,
                                     velocity=vel, time=delta))
            elif typ == "note_off":
                pitch, _ = data
                track.append(Message("note_off", note=pitch,
                                     velocity=0, time=delta))

        mid.save(self.out_path)
        return (
            f"[MIDI] Wrote {self.out_path}\n"
            f"   Notes:   {self.note_count}\n"
            f"   Chords:  {self.chord_count}\n"
            f"   Ticks:   {self.current_time} (~{self.current_time/480:.1f} quarter)"
        )

    def _compile_block(self, stmts):
        for s in stmts:
            self._compile_stmt(s)

    def _compile_stmt(self, stmt):
        if isinstance(stmt, Tempo):
            self.events.append((self.current_time, "tempo", stmt.bpm))
        elif isinstance(stmt, Note):
            self._emit_note(stmt.pitch, stmt.duration, stmt.volume)
        elif isinstance(stmt, Chord):
            self._emit_chord(stmt.pitches, stmt.duration, stmt.volume)
        elif isinstance(stmt, Rest):
            self.current_time += duration_to_ticks(stmt.duration)
        elif isinstance(stmt, Repeat):
            for _ in range(stmt.times):
                self._compile_block(stmt.body)
        elif isinstance(stmt, Track):
            self._compile_block(stmt.body)
        elif isinstance(stmt, If):
            if self._eval(stmt.cond):
                self._compile_block(stmt.then_body)
            else:
                self._compile_block(stmt.else_body)
        elif isinstance(stmt, While):
            safety = 0
            while self._eval(stmt.cond) and safety < 1000:
                self._compile_block(stmt.body)
                safety += 1
        elif isinstance(stmt, Assign):
            self.constants[stmt.name] = self._eval(stmt.expr)
        elif isinstance(stmt, Print):
            self._eval(stmt.expr)

    def _emit_note(self, pitch_name, duration, volume):
        try:
            pitch = note_to_midi(pitch_name)
        except ValueError:
            return
        ticks = duration_to_ticks(duration)
        vel = volume_to_velocity(volume)
        self.events.append((self.current_time, "note_on", (pitch, vel)))
        self.events.append((self.current_time + ticks, "note_off", (pitch, 0)))
        self.current_time += ticks
        self.note_count += 1

    def _emit_chord(self, pitches, duration, volume):
        valid = []
        for p in pitches:
            try:
                valid.append(note_to_midi(p))
            except ValueError:
                pass
        if not valid:
            return
        ticks = duration_to_ticks(duration)
        vel = volume_to_velocity(volume)
        for p in valid:
            self.events.append((self.current_time, "note_on", (p, vel)))
        for p in valid:
            self.events.append((self.current_time + ticks, "note_off", (p, 0)))
        self.current_time += ticks
        self.chord_count += 1

    def _eval(self, node):
        if isinstance(node, Num):
            return node.value
        if isinstance(node, Var):
            return self.constants.get(node.name, 0)
        if isinstance(node, UnaryOp):
            return -self._eval(node.operand)
        if isinstance(node, BinOp):
            l = self._eval(node.left)
            r = self._eval(node.right)
            return {
                "+": l + r, "-": l - r, "*": l * r,
                "/": l / r if r else 0,
                "%": l % r if r else 0,
                "^": l ** r,
                ">": int(l > r), "<": int(l < r),
                "==": int(l == r), "!=": int(l != r),
            }.get(node.op, 0)
        return 0