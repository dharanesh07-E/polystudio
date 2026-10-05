"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Copy, Check, Download, Terminal, Layers } from "lucide-react";
import { CompileResult, downloadMidiUrl } from "@/lib/api";

interface OutputProps {
  result: CompileResult | null;
  target: string;
  source: string;
  lang?: string;
  isLoading?: boolean;
}

export default function Output({ result, target, source, lang = "auto", isLoading = false }: OutputProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (result?.output) {
      navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result?.output) return;
    const extensions: Record<string, string> = {
      sql: "sql",
      tac: "tac",
      bf: "bf",
      dfa: "txt",
      midi: "txt",
    };
    const ext = extensions[target] || "txt";
    const blob = new Blob([result.output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compiled_${target}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMidi = () => {
    fetch(downloadMidiUrl(source), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target: "midi", lang }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to generate MIDI");
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "polystudio_music.mid";
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => alert(err.message));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] rounded-xl border border-white/10 glass-panel p-8 text-center">
        <div className="relative mb-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <Terminal className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto" />
        </div>
        <h4 className="text-slate-200 font-medium">Compiling with PolyStudio...</h4>
        <p className="text-xs text-slate-500 mt-1">Lowering PolyLang AST to {target.toUpperCase()} target</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] rounded-xl border border-white/10 glass-panel p-8 text-center">
        <Terminal className="w-10 h-10 text-slate-600 mb-3" />
        <h4 className="text-slate-300 font-medium">Ready to compile</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Write PolyLang source code in the editor or select a preset, then click Compile or press Ctrl+Enter.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 glass-panel overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          {result.success ? (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Success
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              Compilation Failed
            </span>
          )}

          {result.stage && (
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-500" />
              Stage: <span className="text-slate-200 font-mono">{result.stage}</span>
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {result.success && target === "midi" && (
            <button
              onClick={handleDownloadMidi}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-colors shadow-sm"
            >
              <Download className="w-3 h-3" />
              <span>Download .MID</span>
            </button>
          )}

          {result.success && result.output && (
            <>
              <button
                onClick={handleCopy}
                title="Copy Output"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleDownload}
                title="Download Output"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Output Content */}
      <div className="flex-1 p-4 bg-slate-950/70 overflow-auto scrollbar-thin space-y-4">
        {result.success ? (
          <>
            <div>
              <div className="text-[11px] font-mono text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
                <span>Compiled {target.toUpperCase()} Output:</span>
              </div>
              <pre className="font-mono text-xs sm:text-sm text-indigo-300 bg-slate-900/80 p-3 rounded-lg border border-white/5 leading-relaxed whitespace-pre-wrap selection:bg-indigo-900/40">
                {result.output || "(Compilation produced empty output)"}
              </pre>
            </div>

            {/* Runtime Printed Output (e.g. from printf, print, அச்சிடு) */}
            {result.printed_output !== undefined && result.printed_output !== null && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span>🖨️ Runtime Printed Output:</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                    STDOUT
                  </span>
                </div>
                <pre className="font-mono text-sm text-emerald-300 bg-slate-950/80 p-3 rounded-lg border border-white/5 whitespace-pre-wrap selection:bg-emerald-900/50">
                  {result.printed_output}
                </pre>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-200">
            <div className="flex items-center gap-2 font-semibold text-rose-400 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span>Compiler Error during [{result.stage || "pipeline"}] stage</span>
            </div>
            <pre className="font-mono text-xs text-rose-300 whitespace-pre-wrap leading-relaxed">
              {result.error || "An unknown compilation error occurred."}
            </pre>
            <div className="mt-3 text-[11px] text-slate-400">
              💡 Tip: Check your syntax, pitch names (e.g. C4, D#5), and statements ending with semicolons.
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-1.5 bg-slate-900/90 border-t border-white/5 text-[11px] text-slate-500 flex justify-between">
        <span>Target: {target.toUpperCase()}</span>
        <span>{result.output ? `${result.output.split("\n").length} lines generated` : "0 lines"}</span>
      </div>
    </div>
  );
}
