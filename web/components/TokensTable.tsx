"use client";

import React, { useState } from "react";
import { ListFilter, Copy, Check, Hash, Sparkles } from "lucide-react";
import { TokenItem } from "@/lib/api";

interface TokensTableProps {
  tokens?: TokenItem[] | null;
  isLoading?: boolean;
}

export default function TokensTable({ tokens, isLoading }: TokensTableProps) {
  const [filter, setFilter] = useState("");
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] rounded-xl border border-white/10 glass-panel p-8 text-center">
        <div className="w-10 h-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-3" />
        <h4 className="text-slate-300 font-medium">Lexing Source Tokens...</h4>
        <p className="text-xs text-slate-500 mt-1">Tokenizing keywords, identifiers, and literals</p>
      </div>
    );
  }

  if (!tokens || tokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[350px] rounded-xl border border-white/10 glass-panel p-8 text-center">
        <Hash className="w-10 h-10 text-slate-600 mb-3" />
        <h4 className="text-slate-300 font-medium">No Tokens to Display</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          Enter code in the editor and click Compile to view lexical tokens.
        </p>
      </div>
    );
  }

  const filteredTokens = tokens.filter(
    (t) =>
      t.type.toLowerCase().includes(filter.toLowerCase()) ||
      t.value.toLowerCase().includes(filter.toLowerCase())
  );

  const handleCopyTokens = () => {
    const text = tokens
      .map((t) => `#${t["#"]}\t${t.type}\t${t.value}\tL${t.line}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeBadgeColor = (type: string) => {
    if (type.startsWith("TYPE_") || type.startsWith("C_")) {
      return "bg-purple-500/20 text-purple-300 border-purple-500/30";
    }
    if (type === "ID") {
      return "bg-sky-500/20 text-sky-300 border-sky-500/30";
    }
    if (type === "NUMBER" || type === "FLOAT") {
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
    if (type === "PLUS" || type === "MINUS" || type === "STAR" || type === "SLASH" || type === "ASSIGN") {
      return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    }
    if (type === "PRINT" || type === "PRINTF" || type === "TEMPO" || type === "NOTE") {
      return "bg-rose-500/20 text-rose-300 border-rose-500/30";
    }
    return "bg-slate-800 text-slate-300 border-white/10";
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 glass-panel overflow-hidden">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 text-xs gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <span className="text-emerald-400">Total Tokens:</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-xs border border-emerald-500/30">
              {tokens.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick filter input */}
          <div className="relative flex items-center">
            <ListFilter className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter tokens..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-7 pr-2 py-1 bg-slate-950/80 text-slate-200 text-xs rounded border border-white/10 focus:outline-none focus:border-indigo-500 w-32 sm:w-40"
            />
          </div>

          <button
            onClick={handleCopyTokens}
            title="Copy tokens to clipboard"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-white/10 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto scrollbar-thin bg-slate-950/70">
        <table className="w-full text-left text-xs font-mono">
          <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-white/10 uppercase tracking-wider text-[11px] z-10">
            <tr>
              <th className="py-2.5 px-4 w-16">#</th>
              <th className="py-2.5 px-4">Type</th>
              <th className="py-2.5 px-4">Value</th>
              <th className="py-2.5 px-4 w-20 text-right">Line</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-300">
            {filteredTokens.map((t) => (
              <tr
                key={t["#"]}
                className="hover:bg-indigo-600/10 transition-colors group"
              >
                <td className="py-2 px-4 text-slate-500 font-semibold">{t["#"]}</td>
                <td className="py-2 px-4">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${getTypeBadgeColor(
                      t.type
                    )}`}
                  >
                    {t.type}
                  </span>
                </td>
                <td className="py-2 px-4 text-slate-100 font-medium select-all">
                  {t.value}
                </td>
                <td className="py-2 px-4 text-right text-slate-400">{t.line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
