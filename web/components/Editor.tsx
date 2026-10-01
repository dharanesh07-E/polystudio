"use client";

import React, { useRef } from "react";
import { Play, Copy, Check, RotateCcw, BookOpen, Sparkles } from "lucide-react";
import { PRESETS } from "@/lib/api";

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  onCompile: () => void;
  isLoading?: boolean;
  selectedTarget: string;
  onSelectPreset?: (presetKey: string) => void;
}

export default function Editor({
  value,
  onChange,
  onCompile,
  isLoading = false,
  selectedTarget,
  onSelectPreset,
}: EditorProps) {
  const [copied, setCopied] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = value.split("\n");
  const lineCount = Math.max(lines.length, 12);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to compile
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onCompile();
    }
    // Tab key inserts 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const newVal = value.substring(0, start) + "  " + value.substring(end);
      onChange(newVal);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 glass-panel overflow-hidden">
      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="font-mono text-slate-300 font-semibold tracking-wider flex items-center gap-1.5">
            source.poly
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              PolyLang
            </span>
          </span>
        </div>

        {/* Action buttons & Preset loader */}
        <div className="flex items-center gap-2">
          {onSelectPreset && (
            <div className="relative flex items-center">
              <BookOpen className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onSelectPreset(e.target.value);
                  }
                }}
                defaultValue=""
                className="pl-7 pr-3 py-1 bg-slate-800/90 hover:bg-slate-800 text-slate-300 rounded-md border border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="" disabled>Load Example...</option>
                {Object.entries(PRESETS).map(([k, p]) => (
                  <option key={k} value={k}>
                    {p.name} ({p.target.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleCopy}
            title="Copy Code"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => onChange("")}
            title="Clear Editor"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onCompile}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Compile</span>
            <kbd className="hidden md:inline-block ml-1 px-1 py-0.2 bg-indigo-800/60 rounded text-[9px] text-indigo-200">
              Ctrl+↵
            </kbd>
          </button>
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className="relative flex flex-1 min-h-[300px] overflow-hidden bg-slate-950/70">
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="w-10 select-none py-3 pr-2 text-right font-mono text-xs text-slate-600 bg-slate-900/40 border-r border-white/5 overflow-hidden"
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder="// Enter PolyStudio DSL code here...&#10;x = 5 + 3 * 2;&#10;print x;"
          spellCheck={false}
          className="flex-1 p-3 font-mono text-sm leading-6 bg-transparent text-slate-100 placeholder-slate-600 resize-none focus:outline-none overflow-auto scrollbar-thin"
        />
      </div>

      {/* Footer info bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 border-t border-white/5 text-[11px] text-slate-500">
        <div className="flex items-center gap-3">
          <span>{lines.length} lines</span>
          <span>{value.length} characters</span>
        </div>
        <div className="flex items-center gap-1.5 text-indigo-400">
          <Sparkles className="w-3 h-3" />
          <span>Target: {selectedTarget.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
