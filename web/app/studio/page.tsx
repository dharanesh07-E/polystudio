"use client";

import React, { useState, useEffect } from "react";
import Tabs, { StudioViewMode } from "@/components/Tabs";
import Editor from "@/components/Editor";
import Output from "@/components/Output";
import ASTViewer from "@/components/ASTViewer";
import TokensTable from "@/components/TokensTable";
import DFAGraph from "@/components/DFAGraph";
import PianoRoll from "@/components/PianoRoll";
import { compileSource, PRESETS, CompileResult } from "@/lib/api";
import { Sparkles, Terminal, CheckCircle2, AlertCircle } from "lucide-react";

export default function StudioPage() {
  const [target, setTarget] = useState("tac");
  const [lang, setLang] = useState("auto");
  const [source, setSource] = useState(PRESETS.arithmetic_tac.code);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<StudioViewMode>("output");

  const handleCompile = async () => {
    setIsLoading(true);
    const res = await compileSource(source, target, lang);
    setResult(res);
    setIsLoading(false);
  };

  const handleSelectTarget = (t: string) => {
    setTarget(t);
    // Switch to a relevant default preset if current code doesn't match target
    if (t === "midi") {
      setSource(PRESETS.tamil_song_chinna.code);
      setLang("tamil");
      setActiveView("visualizer");
    } else if (t === "sql") {
      setSource(PRESETS.sql_query.code);
      setLang("poly");
      setActiveView("output");
    } else if (t === "dfa") {
      setSource(PRESETS.regex_dfa.code);
      setLang("poly");
      setActiveView("visualizer");
    } else if (t === "bf") {
      setSource(PRESETS.brainfuck.code);
      setLang("poly");
      setActiveView("output");
    } else {
      setSource(PRESETS.arithmetic_tac.code);
      setLang("poly");
      setActiveView("output");
    }
  };

  const handleSelectPreset = (key: string) => {
    const p = PRESETS[key];
    if (p) {
      setSource(p.code);
      setTarget(p.target);
      if (p.lang) {
        setLang(p.lang);
      }
      if (p.target === "midi" || p.target === "dfa") {
        setActiveView("visualizer");
      } else {
        setActiveView("output");
      }
    }
  };

  // Compile on initial mount or when target/lang changes
  useEffect(() => {
    handleCompile();
  }, [target, lang]);

  const hasVisualizer = target === "midi" || target === "dfa";

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-4">
      {/* Top Compilation Status Banner (matching user screenshot) */}
      {result?.success && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 shadow-lg text-sm font-medium animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Compiled Successfully!</span>
        </div>
      )}

      {/* Studio Header & Tab Switcher */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-lg">
        <Tabs
          selectedTarget={target}
          onSelectTarget={handleSelectTarget}
          activeView={activeView}
          onChangeView={setActiveView}
          hasVisualizer={hasVisualizer}
          tokenCount={result?.tokens?.length}
        />
      </div>

      {/* Main Dual-Pane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[580px]">
        {/* Left Column: Code Editor */}
        <div className="h-full min-h-[400px]">
          <Editor
            value={source}
            onChange={setSource}
            onCompile={handleCompile}
            isLoading={isLoading}
            selectedTarget={target}
            selectedLang={lang}
            onSelectLang={setLang}
            onSelectPreset={handleSelectPreset}
          />
        </div>

        {/* Right Column: View Switcher (Output / Tokens / AST / Visualizer) */}
        <div className="h-full min-h-[400px]">
          {activeView === "tokens" ? (
            <TokensTable tokens={result?.tokens} isLoading={isLoading} />
          ) : activeView === "ast" ? (
            <ASTViewer
              ast={result?.ast || null}
              ast_json={result?.ast_json}
              error={result?.error}
            />
          ) : activeView === "visualizer" && target === "midi" ? (
            <PianoRoll source={source} compilerOutput={result?.output} />
          ) : activeView === "visualizer" && target === "dfa" ? (
            <DFAGraph output={result?.output || null} source={source} />
          ) : (
            <Output
              result={result}
              target={target}
              source={source}
              lang={lang}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
