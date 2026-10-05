"use client";

import React, { useState, useEffect } from "react";
import Editor from "@/components/Editor";
import PianoRoll from "@/components/PianoRoll";
import Output from "@/components/Output";
import { compileSource, PRESETS, CompileResult } from "@/lib/api";
import { Music, Sparkles, Download, Layers } from "lucide-react";

export default function MusicPage() {
  const [source, setSource] = useState(PRESETS.tamil_song_chinna.code);
  const [lang, setLang] = useState("tamil");
  const [result, setResult] = useState<CompileResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewTab, setViewTab] = useState<"pianoroll" | "raw">("pianoroll");

  const handleCompile = async (sourceCode = source, language = lang) => {
    setIsLoading(true);
    const res = await compileSource(sourceCode, "midi", language);
    setResult(res);
    setIsLoading(false);
  };

  useEffect(() => {
    handleCompile();
  }, [lang]);

  const musicPresets = [
    { key: "tamil_song_chinna", label: "சின்ன சின்ன ஆசை (Roja)", lang: "tamil" },
    { key: "tamil_song_munbe", label: "முன்பே வா (Munbe Vaa)", lang: "tamil" },
    { key: "tamil_music", label: "தமிழ் இசை (Scale)", lang: "tamil" },
    { key: "fur_elise", label: "Für Elise (PolyLang)", lang: "poly" },
    { key: "scale", label: "C Major Scale", lang: "poly" },
    { key: "chord", label: "Chords (I-IV-V-I)", lang: "poly" },
  ];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-violet-500/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Music Studio & Synthesizer
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Compose algorithmic music in PolyLang & Tamil keywords (வேகம், சுரம், நேரம்) and synthesize it in the browser.
            </p>
          </div>
        </div>

        {/* Preset Quick Selectors */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">Presets:</span>
          {musicPresets.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                const pData = PRESETS[p.key];
                if (pData) {
                  setSource(pData.code);
                  setLang(p.lang);
                  handleCompile(pData.code, p.lang);
                  setViewTab("pianoroll");
                }
              }}
              className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/10 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[580px]">
        {/* Code Editor */}
        <div className="h-full min-h-[400px]">
          <Editor
            value={source}
            onChange={setSource}
            onCompile={() => handleCompile()}
            isLoading={isLoading}
            selectedTarget="midi"
            selectedLang={lang}
            onSelectLang={setLang}
            onSelectPreset={(key) => {
              const p = PRESETS[key];
              if (p) {
                setSource(p.code);
                if (p.lang) setLang(p.lang);
                handleCompile(p.code, p.lang || "auto");
              }
            }}
          />
        </div>

        {/* Visualizer / Output */}
        <div className="flex flex-col h-full space-y-3">
          {/* Sub-tab switcher */}
          <div className="flex items-center justify-between p-1 bg-slate-900/60 rounded-lg border border-white/5 text-xs">
            <div className="flex gap-1">
              <button
                onClick={() => setViewTab("pianoroll")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewTab === "pianoroll"
                    ? "bg-violet-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Piano Roll & Audio
              </button>
              <button
                onClick={() => setViewTab("raw")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewTab === "raw"
                    ? "bg-violet-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Compiler Output
              </button>
            </div>

            <span className="text-[11px] text-violet-400 pr-2 font-mono">
              mido + Web Audio API
            </span>
          </div>

          <div className="flex-1 min-h-[380px]">
            {viewTab === "pianoroll" ? (
              <PianoRoll source={source} compilerOutput={result?.output} />
            ) : (
              <Output
                result={result}
                target="midi"
                source={source}
                lang={lang}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
