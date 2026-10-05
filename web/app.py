"""PolyStudio Web Application (Streamlit)
Multi-Frontend Polyglot Compiler: PolyLang, தமிழ் (Tamil), and C Subset.
Backends: TAC, SQL, DFA, MIDI, Brainfuck.
"""

from __future__ import annotations

import io
import math
import os
import struct
import tempfile
import uuid
import wave
from typing import Any

import streamlit as st

# Import core compiler and models
try:
    from polylang.frontend.lexer import Lexer
    from polylang.frontend.parser import Parser, ParserMode
    from polylang.frontend.ast_nodes import pretty, to_dict
    from polylang.backends.registry import BACKENDS, get_backend, list_backends
except ImportError:
    from polystudio.core.lexer import Lexer
    from polystudio.core.parser import Parser
    from polystudio.core.ast_nodes import pretty, to_dict
    from polystudio.backends.registry import _BACKENDS as BACKENDS, get_backend, list_backends
    ParserMode = None

from polystudio.services.compiler_service import simulate_tac

# -----------------------------------------------------------------------------
# Page Configuration & Rich Custom Styling
# -----------------------------------------------------------------------------
st.set_page_config(
    page_title="PolyStudio — Polyglot Compiler Studio",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    /* Sleek gradient headers & layout styling */
    .main-title {
        font-size: 2.3rem;
        font-weight: 800;
        background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    .sub-title {
        color: #94a3b8;
        font-size: 1.05rem;
        margin-bottom: 1.2rem;
    }
    .badge {
        display: inline-block;
        padding: 0.25rem 0.6rem;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 9999px;
        background: rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.3);
        margin-right: 0.4rem;
    }
    .badge-tamil {
        background: rgba(249, 115, 22, 0.15);
        color: #fb923c;
        border-color: rgba(249, 115, 22, 0.3);
    }
    .badge-c {
        background: rgba(168, 85, 247, 0.15);
        color: #c084fc;
        border-color: rgba(168, 85, 247, 0.3);
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 8px 16px;
        border-radius: 6px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

# -----------------------------------------------------------------------------
# Audio Synthesis for In-Browser MIDI / Tamil Music Playback
# -----------------------------------------------------------------------------
def note_name_to_freq(pitch_str: str) -> float:
    """Converts pitch string (e.g., C4, F#4, Eb5) to frequency in Hz."""
    note_semitones = {
        "C": 0, "C#": 1, "DB": 1, "D": 2, "D#": 3, "EB": 3, "E": 4,
        "F": 5, "F#": 6, "GB": 6, "G": 7, "G#": 8, "AB": 8, "A": 9,
        "A#": 10, "BB": 10, "B": 11,
    }
    s = pitch_str.strip().upper()
    if len(s) < 2:
        return 440.0
    if len(s) >= 3 and s[1] in ("#", "B"):
        name = s[:2]
        octave_str = s[2:]
    else:
        name = s[:1]
        octave_str = s[1:]
    semitone = note_semitones.get(name, 9)
    try:
        octave = int(octave_str)
    except ValueError:
        octave = 4
    midi_num = (octave + 1) * 12 + semitone
    return 440.0 * (2.0 ** ((midi_num - 69) / 12.0))


def parse_duration_beats(duration: Any) -> float:
    """Parses musical duration (English, fraction, or Tamil) into beat count."""
    if isinstance(duration, (int, float)):
        return float(duration)
    s = str(duration).strip().lower()
    tamil_durations = {
        "முழு": 4.0,       # Whole note (4 beats)
        "அரை": 2.0,       # Half note (2 beats)
        "கால்": 1.0,       # Quarter note (1 beat)
        "அரைகால்": 0.5,    # Eighth note (0.5 beat)
    }
    if s in tamil_durations:
        return tamil_durations[s]
    if "/" in s:
        parts = s.split("/")
        try:
            num = float(parts[0])
            den = float(parts[1])
            return (num / den) * 4.0
        except (ValueError, ZeroDivisionError):
            return 1.0
    try:
        return float(s)
    except ValueError:
        return 1.0


def parse_volume(vol: Any) -> float:
    """Safely converts volume (numeric, dynamic mark, or Tamil) to 0.1-1.0 float."""
    if isinstance(vol, (int, float)):
        return min(max(float(vol) / 100.0 if vol > 1.0 else float(vol), 0.1), 1.0)
    if isinstance(vol, str):
        vmap = {
            "piano": 0.4, "p": 0.4, "forte": 0.9, "f": 0.9,
            "mezzo": 0.7, "mp": 0.6, "mf": 0.75, "fortissimo": 1.0, "ff": 1.0,
            "அமைதி": 0.4, "உரக்க": 0.9, "நடுத்தர": 0.7, "மிதமான": 0.7,
        }
        return vmap.get(vol.strip().lower(), 0.75)
    return 0.75


def synthesize_ast_to_wav(ast_nodes: list[Any], sample_rate: int = 22050) -> bytes:
    """Synthesizes AST music events into 16-bit PCM WAV audio."""
    bpm = 120.0
    sec_per_beat = 60.0 / bpm
    timeline: list[tuple[float, float, list[float], float]] = []
    curr_time = 0.0

    def walk(nodes: list[Any]):
        nonlocal bpm, sec_per_beat, curr_time
        for node in nodes:
            name = type(node).__name__
            if name == "Tempo" or hasattr(node, "bpm"):
                bpm = float(getattr(node, "bpm", 120))
                sec_per_beat = 60.0 / bpm
            elif name == "Note" or (hasattr(node, "pitch") and hasattr(node, "duration")):
                dur_beats = parse_duration_beats(getattr(node, "duration", "1/4"))
                dur_sec = max(0.05, dur_beats * sec_per_beat)
                freq = note_name_to_freq(str(getattr(node, "pitch", "C4")))
                vol_f = parse_volume(getattr(node, "volume", 0.75))
                timeline.append((curr_time, dur_sec, [freq], vol_f))
                curr_time += dur_sec
            elif name == "Chord" or (hasattr(node, "pitches") and hasattr(node, "duration")):
                dur_beats = parse_duration_beats(getattr(node, "duration", "1/4"))
                dur_sec = max(0.05, dur_beats * sec_per_beat)
                pitches = getattr(node, "pitches", ["C4", "E4", "G4"])
                freqs = [note_name_to_freq(str(p)) for p in pitches]
                vol_f = parse_volume(getattr(node, "volume", 0.7))
                timeline.append((curr_time, dur_sec, freqs, vol_f))
                curr_time += dur_sec
            elif name == "Rest" or (hasattr(node, "duration") and not hasattr(node, "pitch")):
                dur_beats = parse_duration_beats(getattr(node, "duration", "1/4"))
                curr_time += dur_beats * sec_per_beat
            elif name == "Repeat":
                times = getattr(node, "times", 1)
                body = getattr(node, "body", [])
                for _ in range(min(times, 16)):
                    walk(body)
            elif hasattr(node, "body") and isinstance(node.body, list):
                walk(node.body)

    walk(ast_nodes)
    total_sec = max(curr_time, 0.4)
    total_samples = int(total_sec * sample_rate)
    samples = [0.0] * (total_samples + sample_rate)

    for start_sec, dur_sec, freqs, vol in timeline:
        start_idx = int(start_sec * sample_rate)
        num_samples = int(dur_sec * sample_rate)
        for i in range(num_samples):
            t = i / sample_rate
            attack = min(1.0, i / (0.015 * sample_rate))
            decay = max(0.0, 1.0 - (i / num_samples) * 0.7)
            env = attack * decay
            sig = 0.0
            for f in freqs:
                # Add fundamental plus rich pleasant harmonic
                sig += math.sin(2.0 * math.pi * f * t) * 0.75 + math.sin(4.0 * math.pi * f * t) * 0.25
            sig = (sig / max(len(freqs), 1)) * vol * env * 0.8
            idx = start_idx + i
            if idx < len(samples):
                samples[idx] += sig

    wav_io = io.BytesIO()
    with wave.open(wav_io, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        max_amp = max((abs(s) for s in samples), default=1.0)
        scale = 28000.0 / max_amp if max_amp > 1.0 else 24000.0
        raw_data = bytearray()
        for s in samples[:total_samples]:
            val = int(max(-32767, min(32767, s * scale)))
            raw_data.extend(struct.pack("<h", val))
        wf.writeframes(raw_data)
    return wav_io.getvalue()


# -----------------------------------------------------------------------------
# Curated Sample Programs Matrix
# -----------------------------------------------------------------------------
SAMPLE_PROGRAMS = {
    "தமிழ்: எண் கணிதம் (Tamil Math)": {
        "lang": "தமிழ் (Tamil)",
        "target": "tac",
        "code": "எண் x = 5 கூட்டு 3;\nஅச்சிடு x;",
        "desc": "Tamil arithmetic using native keywords (எண், கூட்டு, அச்சிடு).",
    },
    "தமிழ்: சுரம் இசை (Tamil Music)": {
        "lang": "தமிழ் (Tamil)",
        "target": "midi",
        "code": "வேகம் 120;\nசுரம் C4 நேரம் கால்;\nசுரம் E4 நேரம் கால்;\nசுரம் G4 நேரம் அரை;",
        "desc": "Tamil musical notes with tempo (வேகம்), note (சுரம்), and duration (கால், அரை).",
    },
    "தமிழ்: பாடல் (AR Rahman - சின்ன சின்ன ஆசை / Roja Melody)": {
        "lang": "தமிழ் (Tamil)",
        "target": "midi",
        "code": """// இசைப்புயல் ஏ.ஆர்.ரஹ்மான் - சின்ன சின்ன ஆசை (Roja Melody)
வேகம் 128;
சுரம் C4 நேரம் கால்;
சுரம் D4 நேரம் கால்;
சுரம் E4 நேரம் கால்;
சுரம் G4 நேரம் அரை;
சுரம் E4 நேரம் கால்;
சுரம் D4 நேரம் அரை;
இடைவெளி கால்;
சுரம் C4 நேரம் கால்;
சுரம் D4 நேரம் கால்;
சுரம் E4 நேரம் கால்;
சுரம் G4 நேரம் கால்;
சுரம் A4 நேரம் அரை;
சுரம் G4 நேரம் கால்;
சுரம் E4 நேரம் முழு;""",
        "desc": "Iconic Roja melody composed in native Tamil musical keywords.",
    },
    "தமிழ்: பாடல் (இளையராஜா மெலடி / Ilayaraja Theme)": {
        "lang": "தமிழ் (Tamil)",
        "target": "midi",
        "code": """// இசைஞானி இளையராஜா மெலடி (Ilayaraja Evergreen Theme)
வேகம் 120;
சுரம் E4 நேரம் கால்;
சுரம் G4 நேரம் கால்;
சுரம் B4 நேரம் அரை;
சுரம் A4 நேரம் கால்;
சுரம் G4 நேரம் கால்;
சுரம் E4 நேரம் அரை;
இடைவெளி கால்;
சுரம் D4 நேரம் கால்;
சுரம் E4 நேரம் கால்;
சுரம் G4 நேரம் அரை;
சுரம் E4 நேரம் முழு;""",
        "desc": "Ilayaraja inspired evergreen theme composed in Tamil syntax.",
    },
    "தமிழ்: சுழல் செயல்பாடு (Tamil Recursion)": {
        "lang": "தமிழ் (Tamil)",
        "target": "tac",
        "code": """செயல்பாடு காரணி(எண் n) {
    இருந்தால் (n <= 1) {
        திரும்பு 1;
    }
    திரும்பு n பெருக்கு காரணி(n கழித்தல் 1);
}
எண் விடை = காரணி(5);
அச்சிடு விடை;""",
        "desc": "Recursive factorial function in Tamil (செயல்பாடு, இருந்தால், திரும்பு).",
    },
    "தமிழ்: வரிசை & கணிதம் (Tamil Arrays)": {
        "lang": "தமிழ் (Tamil)",
        "target": "tac",
        "code": """வரிசை arr[3];
arr[0] = 10;
arr[1] = 20;
எண் மொத்தம் = arr[0] கூட்டு arr[1];
அச்சிடு மொத்தம்;""",
        "desc": "Fixed-size array allocation, indexing, and arithmetic (வரிசை, arr[i]).",
    },
    "தமிழ்: சுட்டிகள் (Tamil Pointers)": {
        "lang": "தமிழ் (Tamil)",
        "target": "tac",
        "code": """எண் x = 42;
சுட்டி p = &x;
அச்சிடு *p;
*p = 100;
அச்சிடு x;""",
        "desc": "Pointer declaration, address-of (&x), and dereferencing (*p) in Tamil.",
    },
    "C Subset: Hello World (printf)": {
        "lang": "C Subset",
        "target": "tac",
        "code": """int x = 5;
printf("%d", x);""",
        "desc": "C subset integer declaration and printf call compiled to TAC.",
    },
    "C Subset: Recursion (Factorial)": {
        "lang": "C Subset",
        "target": "tac",
        "code": """int fact(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * fact(n - 1);
}
int ans = fact(5);
printf("%d", ans);""",
        "desc": "Recursive function definition with base condition and call stack frames.",
    },
    "C Subset: Arrays & Sum": {
        "lang": "C Subset",
        "target": "tac",
        "code": """int arr[3];
arr[0] = 10;
arr[1] = 20;
int total = arr[0] + arr[1];
printf("%d", total);""",
        "desc": "Linear array allocation, indexed access, and summation.",
    },
    "C Subset: Pointers & Dereference": {
        "lang": "C Subset",
        "target": "tac",
        "code": """int x = 42;
int *p = &x;
printf("%d", *p);
*p = 100;
printf("%d", x);""",
        "desc": "Address-of operator (&), pointer variable, and indirect mutation (*p = val).",
    },
    "C Subset: For Loop": {
        "lang": "C Subset",
        "target": "tac",
        "code": """for (int i = 0; i < 3; i = i + 1) {
    printf("%d", i);
}""",
        "desc": "C-style for loop with label-based conditional branching.",
    },
    "PolyLang: Basic Arithmetic": {
        "lang": "English (PolyLang)",
        "target": "tac",
        "code": """x = 5 + 3;
y = x * 2;
print y;""",
        "desc": "Standard PolyLang variable assignments and arithmetic.",
    },
    "PolyLang: Musical Chords": {
        "lang": "English (PolyLang)",
        "target": "midi",
        "code": """tempo 110;
chord [C4, E4, G4] 1/2;
chord [F4, A4, C5] 1/2;
chord [G4, B4, D5] 1/2;
chord [C4, E4, G4] 1/1;""",
        "desc": "Harmonic triad chord progressions compiled to MIDI.",
    },
    "PolyLang: SQL Query": {
        "lang": "English (PolyLang)",
        "target": "sql",
        "code": "FROM employees WHERE salary > 50000 SELECT name, title;",
        "desc": "PolyLang relational query compiled to ANSI SQL.",
    },
    "PolyLang: Regex Automaton": {
        "lang": "English (PolyLang)",
        "target": "dfa",
        "code": 'REGEX r = "(a|b)*abb";',
        "desc": "Regular expression pattern compiled to DFA state transitions.",
    },
    "PolyLang: Brainfuck Codegen": {
        "lang": "English (PolyLang)",
        "target": "bf",
        "code": """x = 65;
print x;""",
        "desc": "Arithmetic assignment compiled to Brainfuck pointer tape operations.",
    },
}

# -----------------------------------------------------------------------------
# Main Header
# -----------------------------------------------------------------------------
st.markdown('<div class="main-title">⚡ PolyStudio — Multi-Frontend Compiler</div>', unsafe_allow_html=True)
st.markdown(
    '<div class="sub-title">'
    '<span class="badge">PolyLang DSL</span>'
    '<span class="badge badge-tamil">தமிழ் (Tamil)</span>'
    '<span class="badge badge-c">C Subset</span>'
    'One DSL & Multi-Syntax Frontend &rarr; TAC, SQL, DFA, MIDI, and Brainfuck.'
    '</div>',
    unsafe_allow_html=True,
)

# -----------------------------------------------------------------------------
# Top Controls: 1) Language Selector & 2) Target Backend
# -----------------------------------------------------------------------------
top_col1, top_col2, top_col3 = st.columns([2.5, 2.5, 3])

LANGUAGE_OPTIONS = ["Auto", "English (PolyLang)", "தமிழ் (Tamil)", "C Subset"]
LANG_CODE_MAP = {
    "Auto": "auto",
    "English (PolyLang)": "poly",
    "தமிழ் (Tamil)": "tamil",
    "C Subset": "c",
}

with top_col1:
    selected_lang_label = st.selectbox(
        "🌐 Language",
        options=LANGUAGE_OPTIONS,
        index=0,
        help="Select language mode or use Auto to automatically detect language syntax.",
    )
    current_lang_code = LANG_CODE_MAP[selected_lang_label]

with top_col2:
    available_backends = ["tac", "midi", "sql", "dfa", "bf"]
    selected_target = st.selectbox(
        "🎯 Target Backend",
        options=available_backends,
        index=0,
        format_func=lambda b: {
            "tac": "TAC (Three-Address Code)",
            "midi": "MIDI (Audio & Music)",
            "sql": "SQL (Database Query)",
            "dfa": "DFA (Finite Automaton)",
            "bf": "Brainfuck (Esoteric IR)",
        }.get(b, b.upper()),
        help="Select target compiler backend.",
    )

with top_col3:
    sample_key = st.selectbox(
        "💡 Sample Programs",
        options=list(SAMPLE_PROGRAMS.keys()),
        index=0,
        help="Choose a pre-built example to load into the editor.",
    )

# Session state initialization for source code
if "source_code" not in st.session_state:
    st.session_state["source_code"] = SAMPLE_PROGRAMS[sample_key]["code"]

# Update code if a new sample is picked
if st.session_state.get("last_sample") != sample_key:
    st.session_state["source_code"] = SAMPLE_PROGRAMS[sample_key]["code"]
    st.session_state["last_sample"] = sample_key
    st.rerun()

# -----------------------------------------------------------------------------
# Code Editor & Action Buttons
# -----------------------------------------------------------------------------
st.markdown("### 📝 Source Code Editor")
source_input = st.text_area(
    label="Code Input",
    value=st.session_state["source_code"],
    height=200,
    label_visibility="collapsed",
    help="Write PolyLang, Tamil, or C subset code here.",
)
st.session_state["source_code"] = source_input

btn_col1, btn_col2, btn_col3, btn_col4 = st.columns([1.5, 2.2, 1.8, 4])
with btn_col1:
    compile_clicked = st.button("🚀 Compile", type="primary", use_container_width=True)

with btn_col2:
    play_tamil_clicked = st.button("🎵 Play Tamil Music", use_container_width=True)

with btn_col3:
    clear_clicked = st.button("🧹 Clear", use_container_width=True)
    if clear_clicked:
        st.session_state["source_code"] = ""
        st.rerun()

# -----------------------------------------------------------------------------
# Compilation Execution
# -----------------------------------------------------------------------------
tokens_result = []
ast_result = None
codegen_output = None
error_message = None
error_stage = None
generated_wav_bytes = None
generated_midi_bytes = None

# If user clicked "Play Tamil Music", set target to midi automatically
target_for_run = "midi" if play_tamil_clicked else selected_target

# Map language label to parser mode
mode_obj = ParserMode.AUTO if ParserMode else "auto"
if ParserMode:
    if current_lang_code == "poly":
        mode_obj = ParserMode.POLYLANG
    elif current_lang_code == "tamil":
        mode_obj = ParserMode.POLYLANG
    elif current_lang_code == "c":
        mode_obj = ParserMode.C
    else:
        mode_obj = ParserMode.AUTO

# Execute compilation if requested or automatically for active sample
if compile_clicked or play_tamil_clicked or "compiled_cache" not in st.session_state:
    try:
        # 1. Lexing
        lexer = Lexer(source_input)
        tokens_result = lexer.tokens

        # 2. Parsing
        if ParserMode:
            parser = Parser(tokens_result, mode=mode_obj)
        else:
            parser = Parser(tokens_result)
        ast_result = parser.parse()

        # 3. Codegen
        backend_cls = get_backend(target_for_run)
        if target_for_run == "midi":
            tmp_mid = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4().hex}.mid")
            backend = backend_cls(out_path=tmp_mid)
            codegen_output = backend.generate(ast_result)
            if os.path.exists(tmp_mid):
                with open(tmp_mid, "rb") as f:
                    generated_midi_bytes = f.read()
            # Synthesize inline audio for instant playback
            generated_wav_bytes = synthesize_ast_to_wav(ast_result)
        else:
            backend = backend_cls()
            codegen_output = backend.generate(ast_result)

        st.session_state["compiled_cache"] = {
            "tokens": tokens_result,
            "ast": ast_result,
            "output": codegen_output,
            "error": None,
            "stage": None,
            "wav": generated_wav_bytes,
            "midi": generated_midi_bytes,
        }
    except Exception as e:
        error_message = str(e)
        st.session_state["compiled_cache"] = {
            "tokens": tokens_result,
            "ast": None,
            "output": None,
            "error": error_message,
            "stage": "compiler",
            "wav": None,
            "midi": None,
        }

cache = st.session_state.get("compiled_cache", {})
tokens_result = cache.get("tokens", [])
ast_result = cache.get("ast", None)
codegen_output = cache.get("output", None)
error_message = cache.get("error", None)
generated_wav_bytes = cache.get("wav", None)
generated_midi_bytes = cache.get("midi", None)

# Inline Music Player (Rendered when MIDI / Tamil Music is generated)
if play_tamil_clicked or (target_for_run == "midi" and generated_wav_bytes):
    st.markdown("#### 🎶 Inline Tamil / PolyLang Music Player")
    player_col1, player_col2 = st.columns([3, 1])
    with player_col1:
        if generated_wav_bytes:
            st.audio(generated_wav_bytes, format="audio/wav")
        else:
            st.info("No audio events were generated from the source code.")
    with player_col2:
        if generated_midi_bytes:
            st.download_button(
                label="📥 Download .MID File",
                data=generated_midi_bytes,
                file_name="polystudio_music.mid",
                mime="audio/midi",
                use_container_width=True,
            )

# Status notification
if error_message:
    st.error(f"❌ Compilation Error: {error_message}")
elif codegen_output is not None:
    st.success("✅ Compiled Successfully!")

# -----------------------------------------------------------------------------
# Tabs: Output, Tokens, AST, Extras, 🌐 Languages
# -----------------------------------------------------------------------------
tab_output, tab_tokens, tab_ast, tab_extras, tab_languages = st.tabs([
    "💻 Output",
    "🔤 Tokens",
    "🌳 AST",
    "⚙️ Extras",
    "🌐 Languages",
])

# -----------------------------------------------------------------------------
# Tab 1: Output
# -----------------------------------------------------------------------------
with tab_output:
    if error_message:
        st.error(f"Compilation halted: {error_message}")
    elif codegen_output:
        st.markdown(f"**Target:** `{target_for_run.upper()}`")
        syntax_map = {
            "tac": "text",
            "sql": "sql",
            "dfa": "text",
            "midi": "text",
            "bf": "brainfuck",
        }
        st.code(codegen_output, language=syntax_map.get(target_for_run, "text"))

        # Simulated Runtime Execution Output (e.g., printf, print, அச்சிடு)
        sim_out = None
        try:
            if target_for_run == "tac":
                sim_out = simulate_tac(codegen_output)
            elif ast_result:
                tac_code = get_backend("tac")().generate(ast_result)
                sim_out = simulate_tac(tac_code)
        except Exception:
            sim_out = None

        if sim_out:
            st.markdown("#### 🖨️ Runtime Printed Output:")
            st.markdown(
                f"""<div style="background-color: #0b1528; border: 1px solid #1e3a5f; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 14px; color: #4ade80;">
{sim_out}
</div>""",
                unsafe_allow_html=True,
            )

        st.download_button(
            label="📥 Download Output",
            data=codegen_output,
            file_name=f"output.{target_for_run}",
            mime="text/plain",
        )
    else:
        st.info("Click 'Compile' to see the target output.")

# -----------------------------------------------------------------------------
# Tab 2: Tokens
# -----------------------------------------------------------------------------
with tab_tokens:
    if tokens_result:
        st.markdown(f"**Total Tokens:** `{len(tokens_result)}`")
        token_data = []
        for i, tok in enumerate(tokens_result):
            token_data.append({
                "#": i + 1,
                "Type": getattr(tok, "type", ""),
                "Value": str(getattr(tok, "value", "")),
                "Line": getattr(tok, "line", 1),
            })
        st.dataframe(token_data, use_container_width=True, height=350)
    else:
        st.info("No tokens to display. Enter code and compile.")

# -----------------------------------------------------------------------------
# Tab 3: AST
# -----------------------------------------------------------------------------
with tab_ast:
    if ast_result:
        ast_col1, ast_col2 = st.columns([1, 1])
        with ast_col1:
            st.markdown("**Pretty Printed AST:**")
            try:
                ast_str = pretty(ast_result)
                st.code(ast_str, language="python")
            except Exception as e:
                st.write(ast_result)
        with ast_col2:
            st.markdown("**AST Reflection (JSON):**")
            try:
                dict_repr = to_dict(ast_result)
                st.json(dict_repr)
            except Exception as e:
                st.write(str(ast_result))
    else:
        st.info("Compile source code to inspect the Abstract Syntax Tree.")

# -----------------------------------------------------------------------------
# Tab 4: Extras
# -----------------------------------------------------------------------------
with tab_extras:
    st.markdown("#### ⚙️ Backend-Specific Statistics & Inspection")
    if target_for_run == "tac":
        if codegen_output:
            lines = [l for l in codegen_output.split("\n") if l.strip()]
            instructions = len(lines)
            temps = set()
            for l in lines:
                for token in l.split():
                    if token.startswith("t") and token[1:].isdigit():
                        temps.add(token)
            m1, m2, m3 = st.columns(3)
            m1.metric("TAC Instructions", instructions)
            m2.metric("Temporaries Allocated", len(temps))
            m3.metric("Estimated Cycles", instructions * 2)
            st.markdown("**Instruction Stream:**")
            st.table([{"#": idx + 1, "Quad / Instruction": line} for idx, line in enumerate(lines)])
    elif target_for_run == "midi":
        m1, m2 = st.columns(2)
        m1.metric("Format", "Standard MIDI Type 0/1")
        m2.metric("Channels", "1 (Melody & Harmony)")
        st.markdown("**Generated Events Summary:**")
        if codegen_output:
            st.text(codegen_output)
    elif target_for_run == "bf":
        if codegen_output:
            tape_ops = {ch: codegen_output.count(ch) for ch in "+-<>[].,"}
            st.markdown("**Brainfuck Operator Breakdown:**")
            st.json(tape_ops)
            m1, m2 = st.columns(2)
            m1.metric("Total Instructions", len(codegen_output))
            m2.metric("Data Tape Pointer Shifts", tape_ops.get(">", 0) + tape_ops.get("<", 0))
    elif target_for_run == "sql":
        st.markdown("**SQL Generation Spec:**")
        st.text("Dialect: ANSI SQL / SQLite compatible syntax")
        if codegen_output:
            st.code(codegen_output, language="sql")
    elif target_for_run == "dfa":
        st.markdown("**Deterministic Finite Automaton Specs:**")
        if codegen_output:
            st.text(codegen_output)

# -----------------------------------------------------------------------------
# Tab 5: 🌐 Languages (New Feature)
# -----------------------------------------------------------------------------
with tab_languages:
    st.markdown("### 🌐 Supported Frontend Languages & Grammar")
    st.markdown(
        "PolyStudio supports multi-frontend compilation, allowing programs written in "
        "**PolyLang DSL**, native **தமிழ் (Tamil)**, or a **C Subset** to compile into the same target representations."
    )

    lang_tab1, lang_tab2, lang_tab3, lang_tab4 = st.tabs([
        "தமிழ் (Tamil Language)",
        "C Subset",
        "PolyLang DSL",
        "Comparison Matrix",
    ])

    with lang_tab1:
        st.markdown("#### 🌺 தமிழ் நிரலாக்க மொழி (Tamil Programming Frontend)")
        st.markdown(
            """
            தமிழ் சொற்களைக் கொண்டு நேரடியாக நிரல்களை எழுதலாம். 
            Tamil keywords are tokenized directly into the core compiler tokens and seamlessly map to all backends.
            """
        )
        t_col1, t_col2 = st.columns(2)
        with t_col1:
            st.markdown("**கணிதம் & மாறிகள் (Arithmetic & Variables):**")
            st.markdown(
                """
                - `எண்` &rarr; Variable declaration
                - `கூட்டு` &rarr; Addition (`+`)
                - `கழி` &rarr; Subtraction (`-`)
                - `பெருக்கல்` &rarr; Multiplication (`*`)
                - `வகுத்தல்` &rarr; Division (`/`)
                - `அச்சிடு` &rarr; Print statement
                - `என்றால்` / `இல்லையென்றால்` &rarr; If / Else
                - `வரை` &rarr; While loop
                """
            )
            st.code("எண் x = 10 கூட்டு 20;\nஅச்சிடு x;", language="text")

        with t_col2:
            st.markdown("**இசை சொற்கள் (Music Keywords):**")
            st.markdown(
                """
                - `வேகம்` &rarr; Tempo (`tempo BPM;`)
                - `சுரம்` &rarr; Musical Note (`note PITCH DURATION;`)
                - `இசைக்கூட்டு` &rarr; Chord (`chord [...] DURATION;`)
                - `இடைவெளி` &rarr; Rest (`rest DURATION;`)
                - `முழு` &rarr; Whole Note (`1/1`)
                - `அரை` &rarr; Half Note (`1/2`)
                - `கால்` &rarr; Quarter Note (`1/4`)
                - `அரைகால்` &rarr; Eighth Note (`1/8`)
                """
            )
            st.code("வேகம் 120;\nசுரம் C4 நேரம் கால்;\nசுரம் E4 நேரம் கால்;", language="text")

    with lang_tab2:
        st.markdown("#### ⚡ C Subset Frontend")
        st.markdown(
            """
            Write classic C-style syntax parsed into extended AST nodes (`CDecl`, `CFuncCall`, `CReturn`, `CFor`, `CBlock`).
            """
        )
        c_col1, c_col2 = st.columns(2)
        with c_col1:
            st.markdown("**Supported Constructs:**")
            st.markdown(
                """
                - **Types:** `int`, `float`, `double`, `char`, `void`
                - **Declarations:** `int x = 42;`, `float pi = 3.14;`
                - **Arrays:** `int buffer[64];`
                - **I/O Functions:** `printf("%d", x);`
                - **Loops:** `for (int i = 0; i < N; i = i + 1) { ... }`
                - **Return Statements:** `return expr;`
                - **Block Scoping:** `{ ... }`
                """
            )
        with c_col2:
            st.markdown("**Example C Program:**")
            st.code(
                """int count = 5;
for (int i = 0; i < count; i = i + 1) {
    printf("%d", i);
}
return 0;""",
                language="c",
            )

    with lang_tab3:
        st.markdown("#### 📐 PolyLang Original DSL")
        st.markdown(
            """
            The foundational domain-specific language for multi-paradigm computing:
            - **Music Composition:** `tempo 120; note C4 1/4; chord [C4, E4, G4] 1/2;`
            - **Relational Queries:** `query "users" where age > 21 select name, email;`
            - **Regular Expressions:** `regex email = /^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$/;`
            - **Structured Control Flow:** `repeat 4 { note C4 1/8; }`, `if (x > 10) { print x; }`
            """
        )

    with lang_tab4:
        st.markdown("#### 📊 Syntax Comparison Matrix")
        st.markdown(
            """
            | Concept | PolyLang DSL | தமிழ் (Tamil) | C Subset |
            | :--- | :--- | :--- | :--- |
            | **Assignment** | `x = 5;` | `எண் x = 5;` | `int x = 5;` |
            | **Addition** | `x + y` | `x கூட்டு y` | `x + y` |
            | **Print** | `print x;` | `அச்சிடு x;` | `printf("%d", x);` |
            | **Tempo** | `tempo 120;` | `வேகம் 120;` | N/A |
            | **Note** | `note C4 1/4;` | `சுரம் C4 நேரம் கால்;` | N/A |
            | **Loop** | `while (x > 0) { ... }` | `(x > 0) வரை { ... }` | `for (int i=0; i<3; i=i+1) { ... }` |
            | **Return** | `return x;` | `திருப்பு x;` | `return x;` |
            """
        )

# -----------------------------------------------------------------------------
# Footer
# -----------------------------------------------------------------------------
st.markdown("---")
st.markdown(
    "<div style='text-align: center; color: #64748b; font-size: 0.85rem;'>"
    "PolyStudio v0.3.0 &bull; PolyLang, தமிழ் & C Frontends &bull; Multi-Target Compiler"
    "</div>",
    unsafe_allow_html=True,
)
