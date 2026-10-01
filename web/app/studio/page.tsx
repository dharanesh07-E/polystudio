"use client";

import React, { useState, useEffect } from "react";
import Tabs from "@/components/Tabs";
import Editor from "@/components/Editor";
import Output from "@/components/Output";
import ASTViewer from "@/components/ASTViewer";
import DFAGraph from "@/components/DFAGraph";
import PianoRoll from "@/components/PianoRoll";
import { compileSource, PRESETS, CompileResult } from "@/lib/api";
import { Sparkles, Terminal } from "lucide-react";

export default function StudioPage() {
  const [target, setTarget] = useState("tac");
  const [source, setSource] = useState(PRESETS.arithmetic_tac.code);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeView, setActiveView] = useState<"output" | "visualizer" | "ast">("output");

  const handleCompile = async () => {
    setIsLoading(true);
    const res = await compileSource(source, target);
    setResult(res);
    setIsLoading(false);
  };

  const handleSelectTarget = (t: string) => {
    setTarget(t);
    // Switch to a relevant default preset if current code doesn't match target
    if (t === "midi") {
      setSource(PRESETS.fur_elise.code);
      setActiveView("visualizer");
    } else if (t === "sql") {
      setSource(PRESETS.sql_query.code);
      setActiveView("output");
    } else if (t === "dfa") {
      setSource(PRESETS.regex_dfa.code);
      setActiveView("visualizer");
    } else if (t === "bf") {
      setSource(PRESETS.brainfuck.code);
      setActiveView("output");
    } else {
      setSource(PRESETS.arithmetic_tac.code);
      setActiveView("output");
    }
  };

  const handleSelectPreset = (key: string) => {
    const p = PRESETS[key];
    if (p) {
      setSource(p.code);
      setTarget(p.target);
      if (p.target === "midi" || p.target === "dfa") {
        setActiveView("visualizer");
      } else {
        setActiveView("output");
      }
    }
  };

  // Compile on initial mount
  useEffect(() => {
    handleCompile();
  }, [target]);

  const hasVisualizer = target === "midi" || target === "dfa";

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-4">
      {/* Studio Header & Tab Switcher */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-lg">
        <Tabs
          selectedTarget={target}
          onSelectTarget={handleSelectTarget}
          activeView={activeView}
          onChangeView={setActiveView}
          hasVisualizer={hasVisualizer}
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
            onSelectPreset={handleSelectPreset}
          />
        </div>

        {/* Right Column: View Switcher (Output / Visualizer / AST) */}
        <div className="h-full min-h-[400px]">
          {activeView === "ast" ? (
            <ASTViewer ast={result?.ast || null} error={result?.error} />
          ) : activeView === "visualizer" && target === "midi" ? (
            <PianoRoll source={source} compilerOutput={result?.output} />
          ) : activeView === "visualizer" && target === "dfa" ? (
            <DFAGraph output={result?.output || null} source={source} />
          ) : (
            <Output
              result={result}
              target={target}
              source={source}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
