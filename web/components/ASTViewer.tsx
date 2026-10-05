"use client";

import React, { useState } from "react";
import { GitBranch, Layers, ChevronRight, ChevronDown, Copy, Check, Braces } from "lucide-react";

interface ASTViewerProps {
  ast: string | null;
  ast_json?: any;
  error?: string | null;
}

// Collapsible JSON Tree Node
function JSONNode({ name, value, isLast = true }: { name?: string; value: any; isLast?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);

  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);

  if (!isObject) {
    let valColor = "text-amber-400";
    if (typeof value === "number") valColor = "text-purple-400";
    else if (typeof value === "boolean") valColor = "text-rose-400";
    else if (value === null) valColor = "text-slate-500";

    return (
      <div className="font-mono text-xs py-0.5 leading-relaxed hover:bg-white/5 px-1 rounded">
        {name !== undefined && (
          <span className="text-cyan-300">
            &quot;{name}&quot; <span className="text-slate-400">: </span>
          </span>
        )}
        <span className={valColor}>
          {typeof value === "string" ? `"${value}"` : String(value)}
        </span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  const entries = isArray
    ? value.map((v: any, idx: number) => [String(idx), v])
    : Object.entries(value);
  const openBracket = isArray ? "[" : "{";
  const closeBracket = isArray ? "]" : "}";

  return (
    <div className="font-mono text-xs py-0.5 leading-relaxed">
      <div
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-1 cursor-pointer hover:bg-white/5 px-1 rounded select-none group"
      >
        <button className="text-slate-400 group-hover:text-indigo-400 p-0.5">
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {name !== undefined && (
          <span className="text-cyan-300">
            {isArray ? `${name} : ` : `"${name}" : `}
          </span>
        )}

        <span className="text-slate-300 font-semibold">{openBracket}</span>

        {collapsed && (
          <span className="text-slate-500 text-[11px] px-1 bg-slate-800/80 rounded border border-white/5">
            {isArray ? `${value.length} items` : `${entries.length} keys`}
          </span>
        )}

        {collapsed && <span className="text-slate-300 font-semibold">{closeBracket}</span>}
      </div>

      {!collapsed && (
        <div className="pl-4 ml-1.5 border-l border-white/10 space-y-0.5 mt-0.5">
          {entries.map(([k, v]: [string, any], idx: number) => (
            <JSONNode
              key={k}
              name={isArray ? k : k}
              value={v}
              isLast={idx === entries.length - 1}
            />
          ))}
          <div className="text-slate-300 font-semibold -ml-4 pl-1">{closeBracket}</div>
        </div>
      )}
    </div>
  );
}

export default function ASTViewer({ ast, ast_json, error }: ASTViewerProps) {
  const [copied, setCopied] = useState(false);

  if (error && !ast) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] rounded-xl border border-white/10 glass-panel p-8 text-center text-rose-300">
        <GitBranch className="w-10 h-10 text-rose-400 mb-3 opacity-60" />
        <h4 className="font-medium">AST Generation Failed</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Fix syntax errors in your source code to inspect the Abstract Syntax Tree.
        </p>
      </div>
    );
  }

  if (!ast && !ast_json) {
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

  const handleCopyJSON = () => {
    const text = ast_json ? JSON.stringify(ast_json, null, 2) : ast || "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = (ast || "").split("\n").filter((l) => l.length > 0);

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 glass-panel overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2 text-indigo-400 font-medium">
          <GitBranch className="w-4 h-4" />
          <span>AST Inspection (Pretty Tree & JSON Reflection)</span>
        </div>

        <button
          onClick={handleCopyJSON}
          className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-white/10 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy JSON</span>
            </>
          )}
        </button>
      </div>

      {/* Two-Column Side-by-Side View matching Screenshot 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 flex-1 overflow-hidden bg-slate-950/70">
        {/* Left Column: Pretty Printed AST */}
        <div className="flex flex-col h-full overflow-hidden p-4">
          <div className="text-xs font-semibold text-slate-200 mb-2.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
            <span>Pretty Printed AST:</span>
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin p-3 rounded-lg bg-slate-900/80 border border-white/5 font-mono text-xs leading-relaxed">
            {lines.map((line, idx) => {
              const indentMatch = line.match(/^(\s*)/);
              const indentLevel = indentMatch ? indentMatch[1].length / 2 : 0;
              const content = line.trim();

              let badgeColor = "text-slate-300";
              if (content.startsWith("CDecl") || content.startsWith("Assign")) badgeColor = "text-sky-300 font-bold";
              else if (content.startsWith("BinOp") || content.startsWith("UnaryOp")) badgeColor = "text-purple-300 font-bold";
              else if (content.startsWith("Print") || content.startsWith("CFuncCall")) badgeColor = "text-rose-300 font-semibold";
              else if (content.startsWith("Num") || content.startsWith("Str")) badgeColor = "text-emerald-400";
              else if (content.startsWith("Var")) badgeColor = "text-indigo-300";
              else if (content.startsWith("CFor") || content.startsWith("If") || content.startsWith("While")) badgeColor = "text-amber-300 font-semibold";

              return (
                <div
                  key={idx}
                  style={{ paddingLeft: `${indentLevel * 16}px` }}
                  className="py-0.5 hover:bg-white/5 rounded px-1 group"
                >
                  <span className={badgeColor}>{content}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: AST Reflection (JSON) */}
        <div className="flex flex-col h-full overflow-hidden p-4">
          <div className="text-xs font-semibold text-slate-200 mb-2.5 flex items-center gap-1.5">
            <Braces className="w-3.5 h-3.5 text-cyan-400" />
            <span>AST Reflection (JSON):</span>
          </div>

          <div className="flex-1 overflow-auto scrollbar-thin p-3 rounded-lg bg-slate-900/80 border border-white/5">
            {ast_json ? (
              <JSONNode value={ast_json} />
            ) : (
              <pre className="font-mono text-xs text-slate-400 whitespace-pre-wrap">
                {ast}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
