"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Square, Volume2, Download, Music2, Sparkles, RefreshCw } from "lucide-react";

interface NoteEvent {
  pitch: string;
  midi: number;
  duration: string;
  durationQuarter: number;
  timeQuarter: number;
}

interface PianoRollProps {
  source: string;
  compilerOutput?: string | null;
}

// Convert note pitch like "C4" or "D#5" to MIDI number
function noteToMidi(name: string): number {
  const NOTE_OFFSET: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const trimmed = name.trim().toUpperCase();
  if (!trimmed || !(trimmed[0] in NOTE_OFFSET)) return 60;
  const letter = trimmed[0];
  let rest = trimmed.slice(1);
  let acc = 0;
  if (rest.startsWith("#")) {
    acc = 1;
    rest = rest.slice(1);
  } else if (rest.startsWith("B")) {
    // Flat if followed by number
    if (rest.length > 1 && !isNaN(Number(rest.slice(1)))) {
      acc = -1;
      rest = rest.slice(1);
    }
  }
  const octave = parseInt(rest, 10);
  if (isNaN(octave)) return 60;
  return (octave + 1) * 12 + NOTE_OFFSET[letter] + acc;
}

// MIDI pitch number to frequency (Hz)
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const DURATION_VALUES: Record<string, number> = {
  WHOLE: 4.0,
  HALF: 2.0,
  QUARTER: 1.0,
  EIGHTH: 0.5,
  SIXTEENTH: 0.25,
  "1/1": 4.0,
  "1/2": 2.0,
  "1/4": 1.0,
  "1/8": 0.5,
  "1/16": 0.25,
  முழு: 4.0,
  அரை: 2.0,
  கால்: 1.0,
  அரைகால்: 0.5,
  அரைக்கால்: 0.5,
  வீசம்: 0.25,
};

function parseDurQuarter(raw: string): number {
  const s = raw.trim();
  if (DURATION_VALUES[s.toUpperCase()]) return DURATION_VALUES[s.toUpperCase()];
  if (DURATION_VALUES[s]) return DURATION_VALUES[s];
  if (s.includes("/")) {
    const parts = s.split("/");
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    if (!isNaN(num) && !isNaN(den) && den !== 0) {
      return (num / den) * 4.0;
    }
  }
  const f = parseFloat(s);
  return isNaN(f) ? 1.0 : f;
}

export default function PianoRoll({ source, compilerOutput }: PianoRollProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [bpm, setBpm] = useState(120);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<OscillatorNode[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Parse source into note events (PolyLang & Tamil keywords)
  const parseNotes = (): { notes: NoteEvent[]; tempo: number; totalQuarters: number } => {
    const lines = source.split("\n");
    let currentTempo = 120;
    let currentTime = 0;
    const events: NoteEvent[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) continue;

      // Tempo: TEMPO 120; or வேகம் 120;
      const tempoMatch = line.match(/(?:TEMPO|வேகம்|லயம்)\s+(\d+)/i);
      if (tempoMatch) {
        currentTempo = parseInt(tempoMatch[1], 10);
      }

      // Note: NOTE C4 [DUR] QUARTER; or சுரம் C4 [நேரம்] கால்; or NOTE C4 1/4;
      const noteMatch = line.match(
        /(?:NOTE|சுரம்|இசை)\s+([A-Ga-g][#b]?\d)(?:\s+(?:DUR|நேரம்|காலம்))?\s+([^\s;]+)/i
      );
      if (noteMatch) {
        const pitch = noteMatch[1].toUpperCase();
        const durStr = noteMatch[2];
        const durQuarter = parseDurQuarter(durStr);
        events.push({
          pitch,
          midi: noteToMidi(pitch),
          duration: durStr,
          durationQuarter: durQuarter,
          timeQuarter: currentTime,
        });
        currentTime += durQuarter;
        continue;
      }

      // Chord: CHORD C4 E4 G4 [DUR] HALF; or CHORD [C4, E4, G4] 1/2; or இசைக்கூட்டு ...
      const chordMatch = line.match(
        /(?:CHORD|இசைக்கூட்டு|இணை)\s+(?:\[(.*?)\]|([A-Ga-g0-9\s#b]+))(?:\s+(?:DUR|நேரம்|காலம்))?\s+([^\s;]+)/i
      );
      if (chordMatch) {
        const chordPitchesRaw = chordMatch[1] || chordMatch[2] || "";
        const durStr = chordMatch[3];
        const durQuarter = parseDurQuarter(durStr);
        const pitches = chordPitchesRaw
          .replace(/,/g, " ")
          .trim()
          .split(/\s+/)
          .filter((p) => /^[A-Ga-g][#b]?\d$/.test(p));

        pitches.forEach((p) => {
          events.push({
            pitch: p.toUpperCase(),
            midi: noteToMidi(p),
            duration: durStr,
            durationQuarter: durQuarter,
            timeQuarter: currentTime,
          });
        });
        if (pitches.length > 0) {
          currentTime += durQuarter;
        }
        continue;
      }

      // Rest: REST [DUR] EIGHTH; or இடைவெளி கால்; or ஓய்வு 1/4;
      const restMatch = line.match(/(?:REST|இடைவெளி|ஓய்வு)(?:\s+(?:DUR|நேரம்|காலம்))?\s+([^\s;]+)/i);
      if (restMatch) {
        const durStr = restMatch[1];
        const durQuarter = parseDurQuarter(durStr);
        currentTime += durQuarter;
      }
    }

    return { notes: events, tempo: currentTempo, totalQuarters: Math.max(currentTime, 4) };
  };

  const { notes, tempo: parsedTempo, totalQuarters } = parseNotes();
  const effectiveTempo = bpm || parsedTempo || 120;
  const totalSeconds = (totalQuarters * 60) / effectiveTempo;

  const stopAudio = () => {
    activeNodesRef.current.forEach((n) => {
      try {
        n.stop();
        n.disconnect();
      } catch {}
    });
    activeNodesRef.current = [];
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const playAudio = () => {
    stopAudio();
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    audioCtxRef.current = ctx;

    const secondsPerQuarter = 60 / effectiveTempo;
    const now = ctx.currentTime;
    startTimeRef.current = now;
    setIsPlaying(true);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.3, now);
    masterGain.connect(ctx.destination);

    notes.forEach((note) => {
      const noteStart = now + note.timeQuarter * secondsPerQuarter;
      const noteDuration = note.durationQuarter * secondsPerQuarter;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(midiToFreq(note.midi), noteStart);

      // Envelope ADSR
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.6, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.3, noteStart + 0.08);
      gain.gain.setValueAtTime(0.3, noteStart + noteDuration - 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDuration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(noteStart);
      osc.stop(noteStart + noteDuration);
      activeNodesRef.current.push(osc);
    });

    const updatePlayhead = () => {
      if (!audioCtxRef.current) return;
      const elapsed = audioCtxRef.current.currentTime - startTimeRef.current;
      setPlaybackTime(elapsed);
      if (elapsed < totalSeconds) {
        animFrameRef.current = requestAnimationFrame(updatePlayhead);
      } else {
        setIsPlaying(false);
        setPlaybackTime(0);
      }
    };
    animFrameRef.current = requestAnimationFrame(updatePlayhead);
  };

  const handleDownloadMidi = () => {
    fetch("http://localhost:8000/compile/midi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target: "midi" }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to compile MIDI");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "polystudio_track.mid";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => alert("Failed to download MIDI: " + err.message));
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Compute pitch range
  const minMidi = Math.min(...notes.map((n) => n.midi), 57); // A3
  const maxMidi = Math.max(...notes.map((n) => n.midi), 76); // E5
  const pitchRange = Math.max(maxMidi - minMidi + 2, 16);

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 glass-panel overflow-hidden">
      {/* Header & Playback Controls */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-violet-400" />
          <span className="font-semibold text-slate-200">Interactive Piano Roll & Synthesizer</span>
          <span className="px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 text-[10px]">
            {notes.length} Notes
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Tempo Control */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[11px] text-slate-400">BPM:</span>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value) || 120)}
              min={40}
              max={280}
              className="w-14 px-1.5 py-0.5 bg-slate-950 rounded border border-white/10 text-xs font-mono text-center"
            />
          </div>

          {/* Audio Play/Stop Button */}
          {isPlaying ? (
            <button
              onClick={stopAudio}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-md shadow-rose-600/30"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={playAudio}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium shadow-md shadow-violet-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play Synth</span>
            </button>
          )}

          {/* Download MIDI */}
          <button
            onClick={handleDownloadMidi}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-white/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download .MID</span>
          </button>
        </div>
      </div>

      {/* Piano Roll Canvas & Timeline */}
      <div className="flex-1 p-4 bg-slate-950/70 overflow-auto scrollbar-thin flex flex-col justify-center">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No musical notes detected in source.</p>
            <p className="text-xs mt-1">Try loading the &quot;C Major Scale&quot; or &quot;Für Elise&quot; preset!</p>
          </div>
        ) : (
          <div className="relative w-full min-w-[500px] h-[260px] bg-slate-900/50 rounded-xl border border-white/10 overflow-hidden">
            {/* Grid background lines */}
            <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

            {/* Note blocks */}
            {notes.map((note, idx) => {
              const leftPercent = (note.timeQuarter / totalQuarters) * 100;
              const widthPercent = (note.durationQuarter / totalQuarters) * 100;
              const topPercent = ((maxMidi - note.midi) / pitchRange) * 80 + 10;

              return (
                <div
                  key={idx}
                  title={`${note.pitch} (${note.duration})`}
                  className="absolute h-6 rounded-md bg-gradient-to-r from-violet-500 to-indigo-500 border border-violet-400/60 shadow-md shadow-indigo-500/20 flex items-center px-1.5 overflow-hidden text-[10px] font-mono text-white font-semibold transition-transform hover:scale-105"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${Math.max(widthPercent, 2.5)}%`,
                    top: `${topPercent}%`,
                  }}
                >
                  <span className="truncate">{note.pitch}</span>
                </div>
              );
            })}

            {/* Playhead bar */}
            {isPlaying && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-400 shadow-[0_0_10px_#f43f5e] z-10 transition-all pointer-events-none"
                style={{
                  left: `${(playbackTime / totalSeconds) * 100}%`,
                }}
              />
            )}
          </div>
        )}

        {/* Timeline ruler */}
        <div className="flex justify-between text-[11px] text-slate-500 mt-2 px-1 font-mono">
          <span>0.0s</span>
          <span>Duration: ~{totalSeconds.toFixed(1)}s ({totalQuarters} Quarters)</span>
        </div>
      </div>
    </div>
  );
}
