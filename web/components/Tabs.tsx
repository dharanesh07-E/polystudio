"use client";

import React from "react";
import { Music, Cpu, Database, Network, Binary, Sparkles } from "lucide-react";

export interface TargetOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  badge: string;
}

export const TARGETS: TargetOption[] = [
  { id: "tac", name: "TAC (IR)", icon: <Cpu className="w-4 h-4" />, color: "from-indigo-500 to-blue-600", badge: "Compiler Internals" },
  { id: "midi", name: "MIDI Music", icon: <Music className="w-4 h-4" />, color: "from-violet-500 to-purple-600", badge: "Audio Synthesis" },
  { id: "sql", name: "SQL Query", icon: <Database className="w-4 h-4" />, color: "from-emerald-500 to-teal-600", badge: "Relational Query" },
  { id: "dfa", name: "Regex DFA", icon: <Network className="w-4 h-4" />, color: "from-amber-500 to-orange-600", badge: "Automata Theory" },
  { id: "bf", name: "Brainfuck", icon: <Binary className="w-4 h-4" />, color: "from-rose-500 to-red-600", badge: "Esolang Tape" },
];

interface TabsProps {
  selectedTarget: string;
  onSelectTarget: (target: string) => void;
  activeView?: "output" | "visualizer" | "ast";
  onChangeView?: (view: "output" | "visualizer" | "ast") => void;
  hasVisualizer?: boolean;
}

export default function Tabs({
  selectedTarget,
  onSelectTarget,
  activeView = "output",
  onChangeView,
  hasVisualizer = true,
}: TabsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
      {/* Backend targets */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        {TARGETS.map((t) => {
          const isActive = selectedTarget === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTarget(t.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? "bg-indigo-600/30 text-white border border-indigo-500/50 shadow-lg shadow-indigo-500/20"
                  : "bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-white/5"
              }`}
            >
              <span className={isActive ? "text-indigo-400" : "text-slate-400"}>{t.icon}</span>
              <span>{t.name}</span>
            </button>
          );
        })}
      </div>

      {/* Output / Visualizer / AST mode switcher */}
      {onChangeView && (
        <div className="flex items-center self-end sm:self-auto bg-slate-900/80 p-0.5 rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => onChangeView("output")}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeView === "output"
                ? "bg-indigo-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Output
          </button>
          {hasVisualizer && (
            <button
              onClick={() => onChangeView("visualizer")}
              className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1 ${
                activeView === "visualizer"
                  ? "bg-indigo-600 text-white shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              Visualizer
            </button>
          )}
          <button
            onClick={() => onChangeView("ast")}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeView === "ast"
                ? "bg-indigo-600 text-white shadow-sm font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            AST Tree
          </button>
        </div>
      )}
    </div>
  );
}
