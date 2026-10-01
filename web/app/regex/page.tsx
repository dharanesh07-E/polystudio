"use client";

import React, { useState, useEffect } from "react";
import Editor from "@/components/Editor";
import DFAGraph from "@/components/DFAGraph";
import Output from "@/components/Output";
import { compileSource, PRESETS, CompileResult } from "@/lib/api";
import { Network, Sparkles, BookOpen } from "lucide-react";

export default function RegexPage() {
  const [source, setSource] = useState(PRESETS.regex_dfa.code);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewTab, setViewTab] = useState<"graph" | "raw">("graph");

  const handleCompile = async () => {
    setIsLoading(true);
    const res = await compileSource(source, "dfa");
    setResult(res);
    setIsLoading(false);
  };

  useEffect(() => {
    handleCompile();
  }, []);

  const regexSamples = [
    { label: "(a|b)*abb", code: 'REGEX r = "(a|b)*abb";' },
    { label: "a(b|c)*", code: 'REGEX r = "a(b|c)*";' },
    { label: "(0|1)*00", code: 'REGEX r = "(0|1)*00";' },
  ];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-amber-500/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-600/20 border border-amber-500/30 text-amber-400">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Regex & Automata Lab
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Compile regular expressions into NFA & DFA automata with interactive string acceptance testing.
            </p>
          </div>
        </div>

        {/* Quick regex presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-400 mr-1">Patterns:</span>
          {regexSamples.map((s) => (
            <button
              key={s.label}
              onClick={() => {
                setSource(s.code);
                setViewTab("graph");
              }}
              className="px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-white/10 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[580px]">
        {/* Editor */}
        <div className="h-full min-h-[400px]">
          <Editor
            value={source}
            onChange={setSource}
            onCompile={handleCompile}
            isLoading={isLoading}
            selectedTarget="dfa"
          />
        </div>

        {/* Visualizer / Output */}
        <div className="flex flex-col h-full space-y-3">
          <div className="flex items-center justify-between p-1 bg-slate-900/60 rounded-lg border border-white/5 text-xs">
            <div className="flex gap-1">
              <button
                onClick={() => setViewTab("graph")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewTab === "graph"
                    ? "bg-amber-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Automaton & Simulator
              </button>
              <button
                onClick={() => setViewTab("raw")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  viewTab === "raw"
                    ? "bg-amber-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Transition Table & Raw Output
              </button>
            </div>

            <span className="text-[11px] text-amber-400 pr-2 font-mono">
              Subset Construction
            </span>
          </div>

          <div className="flex-1 min-h-[380px]">
            {viewTab === "graph" ? (
              <DFAGraph output={result?.output || null} source={source} />
            ) : (
              <Output
                result={result}
                target="dfa"
                source={source}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
