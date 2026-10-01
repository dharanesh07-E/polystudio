"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Editor from "@/components/Editor";
import {
  compileSource,
  executeSQL,
  translateNaturalSQL,
  CompileResult,
  SQLExecuteResult,
} from "@/lib/api";
import {
  Database,
  Table,
  Sparkles,
  Server,
  ArrowRight,
  Filter,
  ArrowUpDown,
  ListOrdered,
  Layers,
  Copy,
  Check,
  Download,
  Terminal,
  Play,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  Code2,
} from "lucide-react";

interface SampleTable {
  name: string;
  columns: { name: string; type: string }[];
  sample: Record<string, any>[];
}

const SAMPLE_TABLES: SampleTable[] = [
  {
    name: "users",
    columns: [
      { name: "id", type: "INTEGER" },
      { name: "name", type: "TEXT" },
      { name: "email", type: "TEXT" },
      { name: "age", type: "INTEGER" },
    ],
    sample: [
      { id: 1, name: "Alice", email: "alice@x.com", age: 30 },
      { id: 2, name: "Bob", email: "bob@x.com", age: 22 },
      { id: 3, name: "Charlie", email: "charlie@x.com", age: 28 },
      { id: 4, name: "Diana", email: "diana@x.com", age: 35 },
      { id: 5, name: "Eve", email: "eve@x.com", age: 19 },
    ],
  },
  {
    name: "orders",
    columns: [
      { name: "id", type: "INTEGER" },
      { name: "user_id", type: "INTEGER" },
      { name: "total", type: "REAL" },
    ],
    sample: [
      { id: 1, user_id: 1, total: 150.0 },
      { id: 2, user_id: 2, total: 80.5 },
      { id: 3, user_id: 1, total: 220.0 },
      { id: 4, user_id: 4, total: 45.0 },
      { id: 5, user_id: 5, total: 300.0 },
    ],
  },
];

const NATURAL_EXAMPLES = [
  { label: "Adult Users (>25)", query: "Find users older than 25 ordered by age" },
  { label: "Young Users (<25)", query: "Show young users under 25" },
  { label: "High Value Orders", query: "Orders with total greater than 100" },
  { label: "Top 3 Orders", query: "Top 3 highest value orders" },
  { label: "Orders for User 1", query: "Orders for user 1" },
  { label: "Users 20 to 30", query: "Users where age is between 20 and 30" },
  { label: "Alice", query: "Find user named Alice" },
  { label: "All Users", query: "Show all users" },
];

export default function SQLPage() {
  // PolyLang code & compiler output
  const [source, setSource] = useState("FROM users WHERE age > 25 SELECT name, email ORDER BY age;");
  const [compileRes, setCompileRes] = useState<CompileResult | null>(null);
  const [execRes, setExecRes] = useState<SQLExecuteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Natural Language input
  const [nlPrompt, setNlPrompt] = useState("");
  const [nlExplanation, setNlExplanation] = useState<string | null>(
    "Filtering users where age > 25, selecting name and email, sorted by age."
  );
  const [isTranslating, setIsTranslating] = useState(false);

  // Visual Query Changer Knobs (two-way synchronized)
  const [table, setTable] = useState<"users" | "orders">("users");
  const [selectedCols, setSelectedCols] = useState<string[]>(["name", "email"]);
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [filterCol, setFilterCol] = useState("age");
  const [filterOp, setFilterOp] = useState(">");
  const [filterVal, setFilterVal] = useState("25");
  const [sortCol, setSortCol] = useState<string>("age");
  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");
  const [limitVal, setLimitVal] = useState<number | null>(null);

  // Active right-side tab
  const [activeTab, setActiveTab] = useState<"results" | "sql" | "ast" | "schema">("results");
  const [copiedSQL, setCopiedSQL] = useState(false);

  // Helper to construct PolyLang query from visual knobs
  const buildPolyQuery = (
    tbl: "users" | "orders",
    cols: string[],
    fEnabled: boolean,
    fCol: string,
    fOp: string,
    fVal: string,
    sCol: string,
    sDir: "ASC" | "DESC",
    lim: number | null
  ) => {
    let q = `FROM ${tbl}`;
    if (fEnabled && fVal.trim() !== "") {
      const isNum = !isNaN(Number(fVal)) && fVal.trim() !== "";
      const valStr = isNum ? fVal.trim() : `'${fVal.replace(/'/g, "")}'`;
      q += ` WHERE ${fCol} ${fOp} ${valStr}`;
    }
    const colsStr = cols.length === 0 || cols.includes("*") ? "*" : cols.join(", ");
    q += ` SELECT ${colsStr}`;
    if (sCol && sCol !== "none") {
      q += ` ORDER BY ${sCol}${sDir === "DESC" ? " DESC" : ""}`;
    }
    if (lim && lim > 0) {
      q += ` LIMIT ${lim}`;
    }
    return q + ";";
  };

  // Compile and execute query
  const executeQuery = useCallback(async (polySource: string) => {
    setIsLoading(true);
    setIsExecuting(true);
    try {
      const [comp, exec] = await Promise.all([
        compileSource(polySource, "sql"),
        executeSQL(polySource),
      ]);
      setCompileRes(comp);
      setExecRes(exec);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsExecuting(false);
    }
  }, []);

  // Run on mount
  useEffect(() => {
    executeQuery(source);
  }, []);

  // Update query when visual controls change
  const handleVisualChange = (
    newTbl = table,
    newCols = selectedCols,
    newFEnabled = filterEnabled,
    newFCol = filterCol,
    newFOp = filterOp,
    newFVal = filterVal,
    newSCol = sortCol,
    newSDir = sortDir,
    newLim = limitVal
  ) => {
    setTable(newTbl);
    setSelectedCols(newCols);
    setFilterEnabled(newFEnabled);
    setFilterCol(newFCol);
    setFilterOp(newFOp);
    setFilterVal(newFVal);
    setSortCol(newSCol);
    setSortDir(newSDir);
    setLimitVal(newLim);

    const newQuery = buildPolyQuery(
      newTbl,
      newCols,
      newFEnabled,
      newFCol,
      newFOp,
      newFVal,
      newSCol,
      newSDir,
      newLim
    );
    setSource(newQuery);

    // Update natural language explanation
    let expl = `Querying table '${newTbl}'`;
    if (newFEnabled && newFVal.trim() !== "") {
      expl += ` where ${newFCol} ${newFOp} ${newFVal}`;
    }
    const colsStr = newCols.length === 0 || newCols.includes("*") ? "all columns" : newCols.join(", ");
    expl += `, selecting ${colsStr}`;
    if (newSCol && newSCol !== "none") {
      expl += `, sorted by ${newSCol} (${newSDir})`;
    }
    if (newLim) {
      expl += `, limit ${newLim} records`;
    }
    setNlExplanation(expl + ".");

    executeQuery(newQuery);
  };

  // Switch table cleanly
  const handleTableSwitch = (newTbl: "users" | "orders") => {
    const defaultCols = newTbl === "users" ? ["*"] : ["*"];
    const defaultFilterCol = newTbl === "users" ? "age" : "total";
    const defaultFilterVal = newTbl === "users" ? "25" : "100";
    handleVisualChange(
      newTbl,
      defaultCols,
      filterEnabled,
      defaultFilterCol,
      filterOp,
      defaultFilterVal,
      defaultFilterCol,
      sortDir,
      limitVal
    );
  };

  // Column toggle
  const handleToggleCol = (colName: string) => {
    let nextCols: string[];
    if (colName === "*") {
      nextCols = ["*"];
    } else {
      const withoutAll = selectedCols.filter((c) => c !== "*");
      if (withoutAll.includes(colName)) {
        nextCols = withoutAll.filter((c) => c !== colName);
        if (nextCols.length === 0) nextCols = ["*"];
      } else {
        nextCols = [...withoutAll, colName];
      }
    }
    handleVisualChange(
      table,
      nextCols,
      filterEnabled,
      filterCol,
      filterOp,
      filterVal,
      sortCol,
      sortDir,
      limitVal
    );
  };

  // Natural Language submit
  const handleNaturalSubmit = async (promptText = nlPrompt) => {
    if (!promptText.trim()) return;
    setIsTranslating(true);
    setNlPrompt(promptText);

    try {
      const res = await translateNaturalSQL(promptText);
      if (res.success && res.poly) {
        setSource(res.poly);
        setNlExplanation(res.explanation || `Translated: ${promptText}`);

        // Update visual changer knobs if spec is returned
        if (res.spec) {
          const spec = res.spec;
          const specTbl = spec.table === "orders" ? "orders" : "users";
          setTable(specTbl);
          setSelectedCols(spec.columns && spec.columns.length > 0 ? spec.columns : ["*"]);

          if (spec.filter) {
            setFilterEnabled(true);
            const m = spec.filter.match(/([a-z_]+)\s*(>=|<=|==|!=|>|<)\s*['"]?([^'"]+)['"]?/i);
            if (m) {
              setFilterCol(m[1]);
              setFilterOp(m[2]);
              setFilterVal(m[3]);
            } else {
              setFilterVal(spec.filter);
            }
          } else {
            setFilterEnabled(false);
          }

          if (spec.orderBy) {
            const parts = spec.orderBy.split(" ");
            setSortCol(parts[0]);
            setSortDir(parts[1]?.toUpperCase() === "DESC" ? "DESC" : "ASC");
          } else {
            setSortCol("none");
          }

          setLimitVal(spec.limit || null);
        }

        await executeQuery(res.poly);
      } else {
        // Fallback: compile whatever is generated or show error
        setNlExplanation(`Could not interpret clearly: ${res.error || "Please adjust phrasing"}`);
      }
    } catch (err: any) {
      setNlExplanation(`Translation error: ${err.message}`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Copy SQL
  const handleCopySQL = () => {
    const textToCopy = execRes?.sql || compileRes?.output || "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedSQL(true);
      setTimeout(() => setCopiedSQL(false), 2000);
    }
  };

  // Download SQL file
  const handleDownloadSQL = () => {
    const text = execRes?.sql || compileRes?.output || "";
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_${table}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Current schema definition for active table
  const currentTableSchema = SAMPLE_TABLES.find((t) => t.name === table) || SAMPLE_TABLES[0];

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 flex flex-col space-y-4">
      {/* Top Header Card */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl glass-panel border border-emerald-500/20 shadow-xl bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-emerald-950/20">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-inner">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Natural Language SQL Studio
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  SQLite Live
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Ask in plain English or manipulate visual query controls. PolyStudio converts your intent into clean
                PolyLang DSL & standard ANSI SQL, and runs it on live database tables instantly.
              </p>
            </div>
          </div>

          {/* Quick status badge */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-white/10 text-slate-300">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>demo.db</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            </div>
          </div>
        </div>

        {/* Natural Language Search Input */}
        <div className="mt-5 space-y-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNaturalSubmit();
            }}
            className="relative flex items-center shadow-lg"
          >
            <div className="absolute left-4 text-emerald-400 pointer-events-none flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400/80 hidden sm:inline">
                NL Query:
              </span>
            </div>

            <input
              type="text"
              value={nlPrompt}
              onChange={(e) => setNlPrompt(e.target.value)}
              placeholder="Ask anything in English... (e.g., 'Find users older than 25 ordered by age' or 'Orders with total > 100')"
              className="w-full pl-10 sm:pl-28 pr-32 py-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 transition-all shadow-inner"
            />

            <button
              type="submit"
              disabled={isTranslating || !nlPrompt.trim()}
              className="absolute right-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer"
            >
              {isTranslating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Ask AI</span>
                </>
              )}
            </button>
          </form>

          {/* Prompt Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-1">
              <SlidersHorizontal className="w-3 h-3 text-slate-500" />
              Quick Prompts:
            </span>
            {NATURAL_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => handleNaturalSubmit(ex.query)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/70 hover:bg-emerald-950/40 hover:text-emerald-300 text-slate-300 text-xs font-normal border border-white/10 hover:border-emerald-500/40 transition-all flex items-center gap-1 group cursor-pointer"
              >
                <span>{ex.label}</span>
                <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400" />
              </button>
            ))}
          </div>

          {/* Active Interpretation Banner */}
          {nlExplanation && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-semibold text-emerald-200">Active Query Intent:</span>
              <span className="text-slate-300 font-normal">{nlExplanation}</span>
            </div>
          )}
        </div>
      </div>

      {/* Visual Query Changer & Builder Bar (Makes Query Changing Ultra-Friendly) */}
      <div className="p-4 rounded-2xl glass-panel border border-white/10 shadow-md space-y-3 bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5 text-xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-100 tracking-wide">Visual Query Changer & Builder</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              — adjust controls below to mutate your query instantly
            </span>
          </div>
          {/* Quick presets */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => handleVisualChange(table, ["*"], false, "age", ">", "", "none", "ASC", null)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] border border-white/10 transition-colors"
            >
              Reset to All
            </button>
            <button
              onClick={() => handleToggleCol("*")}
              className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                selectedCols.includes("*")
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-800 text-slate-300 border-white/10 hover:bg-slate-700"
              }`}
            >
              Select * (All)
            </button>
          </div>
        </div>

        {/* Knobs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* 1. Table Selector */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Table className="w-3 h-3 text-emerald-400" />
              1. Target Table
            </div>
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-900 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => handleTableSwitch("users")}
                className={`py-1 rounded text-xs font-medium transition-all ${
                  table === "users"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                users (5 rows)
              </button>
              <button
                type="button"
                onClick={() => handleTableSwitch("orders")}
                className={`py-1 rounded text-xs font-medium transition-all ${
                  table === "orders"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                orders (5 rows)
              </button>
            </div>
          </div>

          {/* 2. Columns Selector */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-400" />
              2. Columns (SELECT)
            </div>
            <div className="flex flex-wrap gap-1">
              {currentTableSchema.columns.map((col) => {
                const isSelected = selectedCols.includes(col.name) || selectedCols.includes("*");
                return (
                  <button
                    key={col.name}
                    type="button"
                    onClick={() => handleToggleCol(col.name)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                      isSelected
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                        : "bg-slate-900/80 text-slate-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {col.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Filter (WHERE) */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-white/5 lg:col-span-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-400" />
                3. Filter (WHERE)
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={filterEnabled}
                  onChange={(e) =>
                    handleVisualChange(
                      table,
                      selectedCols,
                      e.target.checked,
                      filterCol,
                      filterOp,
                      filterVal,
                      sortCol,
                      sortDir,
                      limitVal
                    )
                  }
                  className="rounded bg-slate-800 border-white/20 text-emerald-500 focus:ring-emerald-500/30"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                disabled={!filterEnabled}
                value={filterCol}
                onChange={(e) =>
                  handleVisualChange(
                    table,
                    selectedCols,
                    filterEnabled,
                    e.target.value,
                    filterOp,
                    filterVal,
                    sortCol,
                    sortDir,
                    limitVal
                  )
                }
                className="bg-slate-900 border border-white/10 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-40"
              >
                {currentTableSchema.columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                disabled={!filterEnabled}
                value={filterOp}
                onChange={(e) =>
                  handleVisualChange(
                    table,
                    selectedCols,
                    filterEnabled,
                    filterCol,
                    e.target.value,
                    filterVal,
                    sortCol,
                    sortDir,
                    limitVal
                  )
                }
                className="bg-slate-900 border border-white/10 text-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-40"
              >
                <option value=">">&gt;</option>
                <option value="<">&lt;</option>
                <option value=">=">&gt;=</option>
                <option value="<=">&lt;=</option>
                <option value="==">==</option>
                <option value="!=">!=</option>
              </select>

              <input
                disabled={!filterEnabled}
                type="text"
                value={filterVal}
                placeholder="value (e.g. 25)"
                onChange={(e) =>
                  handleVisualChange(
                    table,
                    selectedCols,
                    filterEnabled,
                    filterCol,
                    filterOp,
                    e.target.value,
                    sortCol,
                    sortDir,
                    limitVal
                  )
                }
                className="flex-1 bg-slate-900 border border-white/10 text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 disabled:opacity-40"
              />

              {/* Quick condition chips */}
              <div className="hidden sm:flex items-center gap-1">
                {table === "users" ? (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleVisualChange(table, selectedCols, true, "age", ">", "25", sortCol, sortDir, limitVal)
                      }
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      &gt; 25
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleVisualChange(table, selectedCols, true, "age", "<", "25", sortCol, sortDir, limitVal)
                      }
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      &lt; 25
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        handleVisualChange(table, selectedCols, true, "total", ">", "100", sortCol, sortDir, limitVal)
                      }
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      &gt; 100
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleVisualChange(table, selectedCols, true, "user_id", "==", "1", sortCol, sortDir, limitVal)
                      }
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300"
                    >
                      user=1
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 4. Sort & Limit */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-white/5">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                4. Sort & Limit
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={sortCol}
                onChange={(e) =>
                  handleVisualChange(
                    table,
                    selectedCols,
                    filterEnabled,
                    filterCol,
                    filterOp,
                    filterVal,
                    e.target.value,
                    sortDir,
                    limitVal
                  )
                }
                className="bg-slate-900 border border-white/10 text-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="none">No Sort</option>
                {currentTableSchema.columns.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              {sortCol !== "none" && (
                <button
                  type="button"
                  onClick={() =>
                    handleVisualChange(
                      table,
                      selectedCols,
                      filterEnabled,
                      filterCol,
                      filterOp,
                      filterVal,
                      sortCol,
                      sortDir === "ASC" ? "DESC" : "ASC",
                      limitVal
                    )
                  }
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-white/10"
                >
                  {sortDir}
                </button>
              )}

              <select
                value={limitVal ?? "none"}
                onChange={(e) =>
                  handleVisualChange(
                    table,
                    selectedCols,
                    filterEnabled,
                    filterCol,
                    filterOp,
                    filterVal,
                    sortCol,
                    sortDir,
                    e.target.value === "none" ? null : Number(e.target.value)
                  )
                }
                className="bg-slate-900 border border-white/10 text-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="none">All</option>
                <option value="1">Limit 1</option>
                <option value="3">Limit 3</option>
                <option value="5">Limit 5</option>
                <option value="10">Limit 10</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace (Editor on Left, Live Database Results on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[580px]">
        {/* Left Column: PolyLang DSL Code Editor */}
        <div className="flex flex-col space-y-3 h-full">
          <div className="flex-1 min-h-[380px]">
            <Editor
              value={source}
              onChange={(val) => {
                setSource(val);
              }}
              onCompile={() => executeQuery(source)}
              isLoading={isLoading || isExecuting}
              selectedTarget="sql"
            />
          </div>

          {/* Quick Click-to-Query Schema Helper */}
          <div className="p-3.5 rounded-xl glass-panel border border-white/10 space-y-2 bg-slate-900/60">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-emerald-400" />
                Interactive Table Schema ({table})
              </span>
              <span className="text-[11px] text-slate-400">Click a cell to filter or add column</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {currentTableSchema.columns.map((c) => (
                <button
                  key={c.name}
                  onClick={() => handleToggleCol(c.name)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950/70 hover:bg-emerald-950/50 border border-white/10 text-slate-300 hover:text-emerald-300 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="text-emerald-400 font-bold">{c.name}</span>
                  <span className="text-[10px] text-slate-500">{c.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Execution Output, SQL, AST, Schema */}
        <div className="flex flex-col h-full rounded-xl border border-white/10 glass-panel overflow-hidden bg-slate-900/70">
          {/* Output Header Tabs */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/95 border-b border-white/10 text-xs">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("results")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "results"
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Live Data ({execRes?.rowCount ?? 0})</span>
              </button>

              <button
                onClick={() => setActiveTab("sql")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "sql"
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>ANSI SQL</span>
              </button>

              <button
                onClick={() => setActiveTab("ast")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "ast"
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>AST</span>
              </button>

              <button
                onClick={() => setActiveTab("schema")}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                  activeTab === "schema"
                    ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Database</span>
              </button>
            </div>

            {/* Actions: Copy & Download */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopySQL}
                title="Copy generated SQL"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                {copiedSQL ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleDownloadSQL}
                title="Download SQL script"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tab 1: Live SQLite Results Table */}
          {activeTab === "results" && (
            <div className="flex-1 flex flex-col p-4 overflow-auto min-h-[380px]">
              {isExecuting ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3" />
                  <p className="text-sm font-medium text-slate-200">Executing against SQLite demo.db...</p>
                </div>
              ) : execRes?.error ? (
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-200 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    Query Execution Failed
                  </div>
                  <pre className="text-xs font-mono whitespace-pre-wrap bg-slate-950/80 p-3 rounded-lg border border-red-500/20 text-red-300">
                    {execRes.error}
                  </pre>
                  <p className="text-xs text-slate-400">
                    💡 Check that table name and column names match the schema (e.g. &lsquo;users&rsquo; has &lsquo;age&rsquo;,
                    &lsquo;name&rsquo;, &lsquo;email&rsquo;; &lsquo;orders&rsquo; has &lsquo;total&rsquo;, &lsquo;user_id&rsquo;).
                  </p>
                </div>
              ) : execRes && execRes.columns && execRes.columns.length > 0 ? (
                <div className="flex-1 flex flex-col space-y-3">
                  {/* Results info bar */}
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {execRes.rowCount} {execRes.rowCount === 1 ? "row" : "rows"} returned
                      </span>
                      <span>•</span>
                      <span>{execRes.executionTimeMs} ms</span>
                    </div>
                    <code className="text-[11px] font-mono text-emerald-300/80 bg-slate-950 px-2 py-0.5 rounded border border-white/5 truncate max-w-[280px]">
                      {execRes.sql}
                    </code>
                  </div>

                  {/* Interactive Table */}
                  <div className="flex-1 overflow-x-auto rounded-xl border border-white/10 shadow-inner bg-slate-950/50">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900/90 border-b border-white/10">
                          {execRes.columns.map((col, idx) => (
                            <th
                              key={idx}
                              className="px-3.5 py-2.5 font-mono font-bold text-emerald-300 tracking-wider uppercase text-[11px]"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {execRes.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="hover:bg-emerald-500/5 transition-colors group cursor-pointer"
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                onClick={() => {
                                  // Click cell to filter by that value!
                                  const colName = execRes.columns[cIdx];
                                  handleVisualChange(
                                    table,
                                    selectedCols,
                                    true,
                                    colName,
                                    "==",
                                    String(cell),
                                    sortCol,
                                    sortDir,
                                    limitVal
                                  );
                                }}
                                title="Click to filter query by this value"
                                className="px-3.5 py-2 text-slate-300 group-hover:text-white transition-colors"
                              >
                                {cell === null ? (
                                  <span className="text-slate-600 italic">NULL</span>
                                ) : typeof cell === "number" ? (
                                  <span className="text-amber-300">{cell}</span>
                                ) : (
                                  <span>{String(cell)}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <Table className="w-10 h-10 text-slate-600 mb-2" />
                  <p className="text-sm font-medium text-slate-300">0 rows matched your query</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Try adjusting or clearing the filter condition in the toolbar above to return matching records.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Formatted ANSI SQL */}
          {activeTab === "sql" && (
            <div className="flex-1 flex flex-col p-4 space-y-3 min-h-[380px]">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Standard ANSI SQL output</span>
                <span className="text-emerald-400 font-mono">Dialect: SQLite / ANSI</span>
              </div>
              <pre className="flex-1 p-4 rounded-xl bg-slate-950 font-mono text-sm text-emerald-300 border border-white/10 overflow-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {execRes?.sql || compileRes?.output || "-- No SQL compiled"}
              </pre>
            </div>
          )}

          {/* Tab 3: PolyLang AST */}
          {activeTab === "ast" && (
            <div className="flex-1 flex flex-col p-4 space-y-3 min-h-[380px]">
              <div className="text-xs text-slate-400">Abstract Syntax Tree representation</div>
              <pre className="flex-1 p-4 rounded-xl bg-slate-950 font-mono text-xs text-indigo-300 border border-white/10 overflow-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                {compileRes?.ast || "No AST generated"}
              </pre>
            </div>
          )}

          {/* Tab 4: Database Tables & Schema Overview */}
          {activeTab === "schema" && (
            <div className="flex-1 flex flex-col p-4 space-y-4 overflow-auto min-h-[380px]">
              <div className="text-xs text-slate-400">
                The demo SQLite database is pre-seeded with these two relational tables:
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {SAMPLE_TABLES.map((tbl) => (
                  <div key={tbl.name} className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-emerald-300 text-sm">
                        <Table className="w-4 h-4 text-emerald-400" />
                        <span>{tbl.name}</span>
                      </div>
                      <button
                        onClick={() => handleTableSwitch(tbl.name as "users" | "orders")}
                        className="px-2 py-0.5 rounded text-[10px] bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/50"
                      >
                        Query This
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono space-y-1">
                      {tbl.columns.map((c) => (
                        <div key={c.name} className="flex items-center justify-between py-0.5 border-b border-white/5">
                          <span className="text-slate-200">{c.name}</span>
                          <span className="text-slate-500 text-[10px]">{c.type}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-slate-500 pt-1">
                      {tbl.sample.length} pre-seeded rows in SQLite demo.db
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
