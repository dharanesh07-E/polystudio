import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Sparkles, Terminal, Music, Network, Database, Layers, Github } from "lucide-react";

export const metadata: Metadata = {
  title: "PolyStudio — Multi-Backend Compiler Platform",
  description: "One DSL compiling to SQL, DFA Automata, Three-Address Code (TAC), MIDI Music, and Brainfuck.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#080b14] text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                  PolyStudio
                </span>
                <span className="text-[10px] text-slate-400 -mt-1 font-mono tracking-wider">
                  ONE DSL → 5 TARGETS
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5 text-sm font-medium">
              <Link
                href="/studio"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Compiler IDE</span>
              </Link>
              <Link
                href="/music"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Music className="w-4 h-4 text-violet-400" />
                <span>Music Studio</span>
              </Link>
              <Link
                href="/regex"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Network className="w-4 h-4 text-amber-400" />
                <span>Regex & DFA</span>
              </Link>
              <Link
                href="/sql"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Database className="w-4 h-4 text-emerald-400" />
                <span>SQL Builder</span>
              </Link>
            </nav>

            {/* Right Status Pill & Docs */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>API: localhost:8000</span>
              </div>

              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all"
              >
                API Docs
              </a>
            </div>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>🎼 PolyStudio — One DSL → SQL · DFA · TAC · MIDI · Brainfuck</span>
            <span className="font-mono text-[11px] text-slate-600">v0.3.0 • Fast, Modular, Extensible</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
