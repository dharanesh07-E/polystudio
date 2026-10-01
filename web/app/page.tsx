import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Terminal,
  Music,
  Database,
  Network,
  Binary,
  Cpu,
  Layers,
  CheckCircle2,
  Code2,
  Sliders,
} from "lucide-react";

export default function HomePage() {
  const backends = [
    {
      id: "midi",
      name: "MIDI Synthesizer",
      target: "midi",
      icon: <Music className="w-6 h-6 text-violet-400" />,
      color: "from-violet-500/20 to-purple-500/10 border-violet-500/30",
      description: "Compose melodic tracks, scales, chords, tempo, and notes right into playable .MID files and browser audio.",
      example: "TEMPO 140;\nNOTE E5 DUR SIXTEENTH;\nNOTE D#5 DUR SIXTEENTH;",
      link: "/music",
    },
    {
      id: "tac",
      name: "Three-Address Code (TAC)",
      target: "tac",
      icon: <Cpu className="w-6 h-6 text-indigo-400" />,
      color: "from-indigo-500/20 to-blue-500/10 border-indigo-500/30",
      description: "Deconstruct expressions into linear compiler intermediate representation with temporary variables and operator lowering.",
      example: "x = 5 + 3 * 2;\ny = (x - 1) / 2;\nprint y;",
      link: "/studio?target=tac",
    },
    {
      id: "sql",
      name: "SQL Relational Builder",
      target: "sql",
      icon: <Database className="w-6 h-6 text-emerald-400" />,
      color: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
      description: "Intuitive declarative query syntax that compiles directly into standard ANSI SQL with table filters and projections.",
      example: "FROM users WHERE age > 25\nSELECT name, email\nORDER BY age;",
      link: "/sql",
    },
    {
      id: "dfa",
      name: "Regex Automata (DFA)",
      target: "dfa",
      icon: <Network className="w-6 h-6 text-amber-400" />,
      color: "from-amber-500/20 to-orange-500/10 border-amber-500/30",
      description: "Convert regular expressions via Thompson's NFA construction and powerset subset construction into state machines.",
      example: 'REGEX r = "(a|b)*abb";',
      link: "/regex",
    },
    {
      id: "bf",
      name: "Brainfuck Codegen",
      target: "bf",
      icon: <Binary className="w-6 h-6 text-rose-400" />,
      color: "from-rose-500/20 to-red-500/10 border-rose-500/30",
      description: "Compile expressions with constant propagation into the esoteric 8-command Turing-complete memory tape language.",
      example: "x = 3 + 5;\nprint x;",
      link: "/studio?target=bf",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/15 to-pink-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs sm:text-sm font-medium mb-8 backdrop-blur-md shadow-lg shadow-indigo-500/10 animate-fade-in">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>One High-Level DSL • Five Compilation Backends</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
          Write One Syntax. <br />
          <span className="gradient-text">Compile to Everything.</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          PolyStudio is a next-generation compiler playground unifying{" "}
          <span className="text-violet-300 font-semibold">MIDI music</span>,{" "}
          <span className="text-emerald-300 font-semibold">SQL queries</span>,{" "}
          <span className="text-amber-300 font-semibold">DFA automata</span>,{" "}
          <span className="text-indigo-300 font-semibold">compiler TAC</span>, and{" "}
          <span className="text-rose-300 font-semibold">Brainfuck</span>.
        </p>

        {/* Primary Call to Action buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/studio"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Terminal className="w-5 h-5" />
            <span>Open Studio IDE</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>

          <Link
            href="/music"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 font-semibold text-sm sm:text-base shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Music className="w-5 h-5 text-violet-400" />
            <span>Music Synthesizer</span>
          </Link>

          <Link
            href="/regex"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-white/10 font-semibold text-sm sm:text-base shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <Network className="w-6 h-6 text-amber-400" />
            <span>Automata Lab</span>
          </Link>
        </div>
      </section>

      {/* 5 Backends Showcase Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Target Compilation Backends
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Explore dedicated visualizers and compiler outputs for each backend.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {backends.map((b) => (
            <Link
              key={b.id}
              href={b.link}
              className={`group flex flex-col justify-between p-6 rounded-2xl glass-panel border bg-gradient-to-br ${b.color} hover:border-white/20 transition-all hover:-translate-y-1 hover:shadow-2xl`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 group-hover:scale-110 transition-transform">
                    {b.icon}
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5 uppercase">
                    -t {b.target}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {b.name}
                </h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {b.description}
                </p>

                {/* Code Snippet Box */}
                <div className="mt-4 p-3 rounded-lg bg-slate-950/80 border border-white/5 font-mono text-[11px] text-slate-300 overflow-x-auto whitespace-pre">
                  {b.example}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-xs font-semibold text-indigo-400 pt-3 border-t border-white/5">
                <span>Launch {b.name}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Compiler Architecture Features */}
      <section className="max-w-6xl mx-auto px-4 py-16 w-full border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-4 p-5 rounded-xl glass-panel border border-white/5">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-base">Recursive Descent</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Hand-crafted, robust tokenizer and recursive descent parser generating clean, structured AST trees.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-xl glass-panel border border-white/5">
            <div className="p-2.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-base">Modular Architecture</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Extensible backend registry interface allowing new compilation targets to be added in minutes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-5 rounded-xl glass-panel border border-white/5">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-white text-base">FastAPI & Next.js</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                High-performance asynchronous backend API paired with a reactive Next.js 14 App Router workspace.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
