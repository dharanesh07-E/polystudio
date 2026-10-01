"use client";

import React, { useState, useMemo } from "react";
import {
  Network,
  CheckCircle2,
  XCircle,
  Play,
  Sparkles,
  Table2,
  Route,
  Info,
} from "lucide-react";

interface Transition {
  from: string;
  symbol: string;
  to: string;
}

interface DFAModel {
  pattern: string;
  name: string;
  alphabet: string[];
  states: string[];
  start: string;
  accept: string[];
  transitions: Transition[];
}

interface DFAGraphProps {
  output: string | null;
  source?: string;
  regexPattern?: string;
}

export default function DFAGraph({ output, source, regexPattern }: DFAGraphProps) {
  // 1. Extract dynamic regex pattern from source or output
  const extractedPattern = useMemo(() => {
    if (regexPattern) return regexPattern.replace(/['"]/g, "");
    if (source) {
      const match = source.match(/REGEX\s+\w+\s*=\s*["']([^"']+)["']/i);
      if (match) return match[1];
    }
    if (output) {
      const match = output.match(/===\s*REGEX\s+\w+\s*=\s*['"]([^'"]+)['"]/);
      if (match) return match[1];
    }
    return "(a|b)*abb";
  }, [regexPattern, source, output]);

  // 2. Extract dynamic DFA model from compiler output (GRAPH_JSON)
  const dfaModel = useMemo<DFAModel | null>(() => {
    if (!output) return null;
    const jsonMatch = output.match(/\/\/\s*GRAPH_JSON:\s*(.+)/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {}
    }

    // Fallback: parse table from text output if JSON marker not present
    const lines = output.split("\n");
    const tableHeaderIdx = lines.findIndex((l) => l.includes("state") && l.includes("|"));
    if (tableHeaderIdx === -1) return null;

    const alphabetHeader = lines[tableHeaderIdx].split("|")[1] || "";
    const alphabet = alphabetHeader.trim().split(/\s+/).filter(Boolean);
    const states: string[] = [];
    const accept: string[] = [];
    const transitions: Transition[] = [];

    for (let i = tableHeaderIdx + 2; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes("|") || line.includes("(* = accepting")) break;
      const [statePart, transPart] = line.split("|");
      const isAcc = statePart.includes("*");
      const stateName = `q${states.length}`;
      states.push(stateName);
      if (isAcc) accept.push(stateName);

      const targetCells = transPart.trim().split(/\s+/).filter(Boolean);
      targetCells.forEach((cell, symIdx) => {
        if (cell !== "-" && symIdx < alphabet.length) {
          // simple link
          transitions.push({
            from: stateName,
            symbol: alphabet[symIdx],
            to: stateName,
          });
        }
      });
    }

    if (states.length > 0) {
      return {
        pattern: extractedPattern,
        name: "regex",
        alphabet,
        states,
        start: states[0],
        accept,
        transitions,
      };
    }
    return null;
  }, [output, extractedPattern]);

  // 3. Extract dynamic sample test matches from compiler output
  const sampleMatches = useMemo<{ str: string; accepted: boolean }[]>(() => {
    if (!output) return [];
    const matches: { str: string; accepted: boolean }[] = [];
    const matchRegex = /match\(['"](.*?)['"]\)\s*=\s*(True|False)/g;
    let m;
    while ((m = matchRegex.exec(output)) !== null) {
      matches.push({ str: m[1], accepted: m[2] === "True" });
    }
    return matches;
  }, [output]);

  // Default initial test input
  const defaultTestInput = useMemo(() => {
    if (sampleMatches.length > 0) {
      const firstAcc = sampleMatches.find((m) => m.accepted);
      return firstAcc ? firstAcc.str : sampleMatches[0].str;
    }
    if (dfaModel?.alphabet && dfaModel.alphabet.length > 0) {
      return dfaModel.alphabet[0] || "";
    }
    return "aabb";
  }, [sampleMatches, dfaModel]);

  const [testInput, setTestInput] = useState<string>(defaultTestInput);

  // Update test input when model pattern changes
  React.useEffect(() => {
    setTestInput(defaultTestInput);
  }, [defaultTestInput]);

  // 4. Client-side DFA transition stepper simulation
  const simulation = useMemo(() => {
    if (!dfaModel) {
      // client-side regex fallback
      try {
        const re = new RegExp(`^${extractedPattern}$`);
        const acc = re.test(testInput);
        return {
          accepted: acc,
          visitedStates: ["q0"],
          currentState: "q0",
          statusText: acc ? "Accepted by expression" : "Rejected by expression",
        };
      } catch {
        return {
          accepted: false,
          visitedStates: ["q0"],
          currentState: "q0",
          statusText: "Invalid regex syntax",
        };
      }
    }

    // Step through the actual DFA transitions
    let current = dfaModel.start;
    const path: string[] = [current];
    let trapped = false;
    let trapSymbol = "";

    for (let i = 0; i < testInput.length; i++) {
      const ch = testInput[i];
      const trans = dfaModel.transitions.find((t) => t.from === current && t.symbol === ch);
      if (!trans) {
        trapped = true;
        trapSymbol = ch;
        break;
      }
      current = trans.to;
      path.push(current);
    }

    const isAccepted = !trapped && dfaModel.accept.includes(current);

    let statusText = "";
    if (trapped) {
      statusText = `Trapped: No transition from ${path[path.length - 1]} on '${trapSymbol}'`;
    } else if (isAccepted) {
      statusText = `Accepted! Reached accepting state ${current}`;
    } else {
      statusText = `Rejected: Stopped at non-accepting state ${current}`;
    }

    return {
      accepted: isAccepted,
      visitedStates: path,
      currentState: current,
      statusText,
    };
  }, [dfaModel, testInput, extractedPattern]);

  // 5. Dynamic SVG Layout Coordinates for N states
  const svgLayout = useMemo(() => {
    const states = dfaModel?.states || ["q0", "q1", "q2", "q3", "q4"];
    const N = states.length;
    const svgWidth = Math.max(620, N * 110 + 100);
    const svgHeight = N > 5 ? 240 : 180;
    const centerY = N > 5 ? 120 : 90;

    const nodeCoords: Record<string, { x: number; y: number }> = {};

    if (N <= 5) {
      const padding = 80;
      const step = (svgWidth - padding * 2) / Math.max(N - 1, 1);
      states.forEach((s, idx) => {
        nodeCoords[s] = {
          x: padding + idx * step,
          y: centerY,
        };
      });
    } else {
      // 2-row zigzag layout for large state counts
      const half = Math.ceil(N / 2);
      const padding = 80;
      const step = (svgWidth - padding * 2) / Math.max(half - 1, 1);
      states.forEach((s, idx) => {
        const isTop = idx < half;
        const col = isTop ? idx : half - 1 - (idx - half);
        nodeCoords[s] = {
          x: padding + col * step,
          y: isTop ? 65 : 175,
        };
      });
    }

    // Group transitions by from -> to
    const groupedTransitions: Record<string, { from: string; to: string; symbols: string[] }> = {};
    if (dfaModel) {
      dfaModel.transitions.forEach((t) => {
        const key = `${t.from}->${t.to}`;
        if (!groupedTransitions[key]) {
          groupedTransitions[key] = { from: t.from, to: t.to, symbols: [t.symbol] };
        } else if (!groupedTransitions[key].symbols.includes(t.symbol)) {
          groupedTransitions[key].symbols.push(t.symbol);
        }
      });
    }

    return { svgWidth, svgHeight, nodeCoords, groupedTransitions: Object.values(groupedTransitions) };
  }, [dfaModel]);

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 glass-panel overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 text-xs gap-2">
        <div className="flex items-center gap-2 text-amber-400 font-medium">
          <Network className="w-4 h-4" />
          <span>Dynamic Automaton Visualizer</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-mono">
          <Sparkles className="w-3 h-3" />
          <span>Expression: {extractedPattern}</span>
        </div>
      </div>

      <div className="flex-1 p-5 bg-slate-950/70 overflow-auto scrollbar-thin space-y-6">
        {/* Dynamic String Simulator */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-indigo-400" />
              Live Automaton Simulator
            </span>
            <div className="text-[11px] text-slate-400 font-mono">
              Alphabet:{" "}
              <span className="text-amber-300 font-semibold">
                {dfaModel?.alphabet.map((a) => `'${a}'`).join(", ") || "all symbols"}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type any test string to simulate execution..."
              className="flex-1 px-3 py-1.5 bg-slate-950 rounded-lg border border-white/10 text-slate-200 font-mono text-sm focus:outline-none focus:border-indigo-500 shadow-inner"
            />
            <div
              className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg border text-sm font-semibold transition-all ${
                simulation.accepted
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10"
              }`}
            >
              {simulation.accepted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>ACCEPTED</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>REJECTED</span>
                </>
              )}
            </div>
          </div>

          {/* Stepper Execution Path */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono pt-1 text-slate-400">
            <Route className="w-3.5 h-3.5 text-indigo-400 mr-1" />
            <span>Path:</span>
            {simulation.visitedStates.map((st, idx) => (
              <span key={idx} className="flex items-center">
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                    idx === simulation.visitedStates.length - 1
                      ? simulation.accepted
                        ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400/50"
                        : "bg-rose-500/30 text-rose-300 border border-rose-400/50"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {st}
                </span>
                {idx < simulation.visitedStates.length - 1 && (
                  <span className="text-slate-600 mx-1">
                    --({testInput[idx]})➔
                  </span>
                )}
              </span>
            ))}
            <span className="text-[11px] text-slate-500 ml-2 italic">
              ({simulation.statusText})
            </span>
          </div>

          {/* Dynamic Generated Test Cases from Compiler */}
          {sampleMatches.length > 0 && (
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <span className="text-[11px] text-slate-400 font-semibold block">
                Generated Test Cases for This Expression:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sampleMatches.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTestInput(m.str)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all ${
                      m.accepted
                        ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/60"
                        : "bg-slate-900/60 text-slate-400 border-white/10 hover:bg-slate-800"
                    }`}
                  >
                    <span>{m.str === "" ? '"" (empty)' : `"${m.str}"`}</span>
                    {m.accepted ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3 h-3 text-slate-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic SVG State Machine Graph */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-amber-400" />
              Dynamic State Diagram ({dfaModel ? `${dfaModel.states.length} states, ${dfaModel.transitions.length} transitions` : "Automaton"})
            </span>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-normal">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 inline-block" />
                Double ring = Accepting
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                Active Node = Current Step
              </span>
            </div>
          </div>

          <div className="w-full overflow-x-auto bg-slate-950/80 p-4 rounded-xl border border-white/5 flex justify-center">
            <svg
              viewBox={`0 0 ${svgLayout.svgWidth} ${svgLayout.svgHeight}`}
              className="w-full max-w-full"
              style={{ minWidth: `${svgLayout.svgWidth}px`, height: `${svgLayout.svgHeight}px` }}
            >
              <defs>
                <marker id="arrow-indigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" />
                </marker>
                <marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                </marker>
              </defs>

              {/* Start pointer arrow into start state */}
              {dfaModel && svgLayout.nodeCoords[dfaModel.start] && (
                <g>
                  <line
                    x1={svgLayout.nodeCoords[dfaModel.start].x - 45}
                    y1={svgLayout.nodeCoords[dfaModel.start].y}
                    x2={svgLayout.nodeCoords[dfaModel.start].x - 26}
                    y2={svgLayout.nodeCoords[dfaModel.start].y}
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow-indigo)"
                  />
                  <text
                    x={svgLayout.nodeCoords[dfaModel.start].x - 40}
                    y={svgLayout.nodeCoords[dfaModel.start].y - 8}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    start
                  </text>
                </g>
              )}

              {/* Render Transition Arrows */}
              {svgLayout.groupedTransitions.map((tr, idx) => {
                const fromCoord = svgLayout.nodeCoords[tr.from];
                const toCoord = svgLayout.nodeCoords[tr.to];
                if (!fromCoord || !toCoord) return null;

                const label = tr.symbols.join(", ");

                // Self loop
                if (tr.from === tr.to) {
                  const d = `M ${fromCoord.x - 10} ${fromCoord.y - 24} C ${fromCoord.x - 25} ${fromCoord.y - 60}, ${fromCoord.x + 25} ${fromCoord.y - 60}, ${fromCoord.x + 10} ${fromCoord.y - 24}`;
                  return (
                    <g key={`loop-${idx}`}>
                      <path d={d} fill="transparent" stroke="#818cf8" strokeWidth="1.8" markerEnd="url(#arrow-indigo)" />
                      <text x={fromCoord.x} y={fromCoord.y - 50} fill="#c7d2fe" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                        {label}
                      </text>
                    </g>
                  );
                }

                // Directed Transition between distinct states
                const dx = toCoord.x - fromCoord.x;
                const dy = toCoord.y - fromCoord.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const isForward = dx > 0;

                // Curved arc if backward or distant
                if (!isForward || Math.abs(dx) > 160) {
                  const curveDirection = isForward ? -40 : 40;
                  const midX = (fromCoord.x + toCoord.x) / 2;
                  const midY = (fromCoord.y + toCoord.y) / 2 + curveDirection;
                  const d = `M ${fromCoord.x} ${fromCoord.y} Q ${midX} ${midY} ${toCoord.x} ${toCoord.y}`;
                  return (
                    <g key={`curve-${idx}`}>
                      <path d={d} fill="transparent" stroke="#818cf8" strokeWidth="1.8" strokeDasharray="none" markerEnd="url(#arrow-indigo)" />
                      <text x={midX} y={midY + (isForward ? -6 : 14)} fill="#c7d2fe" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                        {label}
                      </text>
                    </g>
                  );
                }

                // Straight or subtle arched arrow
                const angle = Math.atan2(dy, dx);
                const startX = fromCoord.x + 24 * Math.cos(angle);
                const startY = fromCoord.y + 24 * Math.sin(angle);
                const endX = toCoord.x - 26 * Math.cos(angle);
                const endY = toCoord.y - 26 * Math.sin(angle);

                return (
                  <g key={`straight-${idx}`}>
                    <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#818cf8" strokeWidth="1.8" markerEnd="url(#arrow-indigo)" />
                    <text x={(startX + endX) / 2} y={(startY + endY) / 2 - 7} fill="#c7d2fe" fontSize="11" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* Render State Nodes */}
              {(dfaModel?.states || ["q0", "q1", "q2", "q3"]).map((st) => {
                const coord = svgLayout.nodeCoords[st];
                if (!coord) return null;

                const isAccept = dfaModel?.accept.includes(st);
                const isCurrent = simulation.currentState === st;

                return (
                  <g key={st} className="cursor-pointer transition-transform hover:scale-110">
                    {/* Outer Circle */}
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isAccept ? 25 : 24}
                      fill={isCurrent ? "#1e293b" : isAccept ? "#064e3b" : "#1e1b4b"}
                      stroke={isCurrent ? "#38bdf8" : isAccept ? "#10b981" : "#6366f1"}
                      strokeWidth={isCurrent ? 3.5 : 2.5}
                      className={isCurrent ? "filter drop-shadow-[0_0_10px_#38bdf8]" : ""}
                    />

                    {/* Double ring for accepting state */}
                    {isAccept && (
                      <circle
                        cx={coord.x}
                        cy={coord.y}
                        r={19}
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="1.6"
                      />
                    )}

                    {/* State text label */}
                    <text
                      x={coord.x}
                      y={coord.y + 4}
                      fill={isCurrent ? "#38bdf8" : isAccept ? "#d1fae5" : "#e0e7ff"}
                      fontSize="12"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {st}
                      {isAccept ? "*" : ""}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Transition Matrix / State Table */}
        {output && (
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
              <Table2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Full Compiler Output for &quot;{extractedPattern}&quot;</span>
            </div>
            <pre className="font-mono text-xs text-amber-300 bg-slate-950 p-3 rounded-lg border border-white/5 overflow-x-auto leading-relaxed max-h-[300px]">
              {output}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
