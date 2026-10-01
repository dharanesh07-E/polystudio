"use client";

import React from "react";
import { GitBranch, Layers, FileCode } from "lucide-react";

interface ASTViewerProps {
  ast: string | null;
  error?: string | null;
}

export default function ASTViewer({ ast, error }: ASTViewerProps) {
  if (error && !ast) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] rounded-xl border border-white/10 glass-panel p-8 text-center text-rose-300">
        <GitBranch className="w-10 h-10 text-rose-400 mb-3 opacity-60" />
        <h4 className="font-medium">AST Generation Failed</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Fix the syntax errors in your source code to inspect the Abstract Syntax Tree.
        </p>
      </div>
    );
  }

  if (!ast) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] rounded-xl border border-white/10 glass-panel p-8 text-center">
        <GitBranch className="w-10 h-10 text-slate-600 mb-3" />
        <h4 className="text-slate-300 font-medium">No AST Available</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Run compilation to parse source tokens into an Abstract Syntax Tree (AST).
        </p>
      </div>
    );
  }

  // Format AST text with visual highlights
  const lines = ast.split("\n");

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 glass-panel overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2 text-indigo-400 font-medium">
          <GitBranch className="w-4 h-4" />
          <span>Abstract Syntax Tree (PolyLang AST)</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Layers className="w-3.5 h-3.5" />
          <span>{lines.length} nodes</span>
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 p-4 bg-slate-950/70 overflow-auto scrollbar-thin font-mono text-xs">
        <div className="space-y-1">
          {lines.map((line, idx) => {
            const indentMatch = line.match(/^(\s*)/);
            const indentLevel = indentMatch ? indentMatch[1].length / 2 : 0;
            const content = line.trim();

            let badgeColor = "text-slate-300";
            if (content.startsWith("Assign") || content.startsWith("Var")) badgeColor = "text-sky-400";
            else if (content.startsWith("BinOp") || content.startsWith("UnaryOp")) badgeColor = "text-purple-400";
            else if (content.startsWith("Note") || content.startsWith("Chord") || content.startsWith("Tempo")) badgeColor = "text-amber-400";
            else if (content.startsWith("Query")) badgeColor = "text-emerald-400";
            else if (content.startsWith("RegexDecl")) badgeColor = "text-pink-400";
            else if (content.startsWith("If") || content.startsWith("While")) badgeColor = "text-indigo-400";
            else if (content.startsWith("Num") || content.startsWith("Str") || content.startsWith("Bool")) badgeColor = "text-cyan-300";

            return (
              <div
                key={idx}
                className="flex items-center hover:bg-white/5 py-0.5 px-1.5 rounded transition-colors group"
                style={{ paddingLeft: `${Math.max(indentLevel * 18, 4)}px` }}
              >
                {indentLevel > 0 && (
                  <span className="text-slate-700 mr-2 select-none">└─</span>
                )}
                <span className={`${badgeColor} font-semibold`}>
                  {content}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-1.5 bg-slate-900/90 border-t border-white/5 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <FileCode className="w-3 h-3" /> Recursive Descent AST Representation
        </span>
        <span className="text-indigo-400">polystudio.core.ast_nodes</span>
      </div>
    </div>
  );
}
