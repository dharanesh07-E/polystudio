// API Client for PolyStudio

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface CompileResult {
  success: boolean;
  output?: string | null;
  ast?: string | null;
  error?: string | null;
  stage?: string | null;
}

export interface BackendInfo {
  id: string;
  name: string;
  description: string;
}

export const PRESETS: Record<string, { name: string; target: string; code: string; description: string }> = {
  scale: {
    name: "C Major Scale",
    target: "midi",
    description: "Ascending C4 to C5 musical scale",
    code: `TEMPO 120;
NOTE C4 DUR QUARTER;
NOTE D4 DUR QUARTER;
NOTE E4 DUR QUARTER;
NOTE F4 DUR QUARTER;
NOTE G4 DUR QUARTER;
NOTE A4 DUR QUARTER;
NOTE B4 DUR QUARTER;
NOTE C5 DUR QUARTER;`,
  },
  fur_elise: {
    name: "Für Elise (Opening)",
    target: "midi",
    description: "Beethoven's famous melodic phrase",
    code: `TEMPO 140;
NOTE E5 DUR SIXTEENTH;
NOTE D#5 DUR SIXTEENTH;
NOTE E5 DUR SIXTEENTH;
NOTE D#5 DUR SIXTEENTH;
NOTE E5 DUR SIXTEENTH;
NOTE B4 DUR SIXTEENTH;
NOTE D5 DUR SIXTEENTH;
NOTE C5 DUR SIXTEENTH;
NOTE A4 DUR QUARTER;
REST DUR EIGHTH;
NOTE C4 DUR EIGHTH;
NOTE E4 DUR EIGHTH;
NOTE A4 DUR EIGHTH;`,
  },
  chord: {
    name: "Harmonic Chords",
    target: "midi",
    description: "I-IV-V-I progression (C, F, G, C)",
    code: `TEMPO 100;
CHORD C4 E4 G4 DUR HALF;
CHORD F4 A4 C5 DUR HALF;
CHORD G4 B4 D5 DUR HALF;
CHORD C4 E4 G4 DUR WHOLE;`,
  },
  sql_query: {
    name: "User Filter Query",
    target: "sql",
    description: "Text DSL to clean relational SQL with WHERE & ORDER BY",
    code: `FROM users WHERE age > 25 SELECT name, email ORDER BY age;`,
  },
  regex_dfa: {
    name: "Regex DFA Automaton",
    target: "dfa",
    description: "Pattern (a|b)*abb compiled to Thompson NFA & subset DFA",
    code: `REGEX r = "(a|b)*abb";`,
  },
  arithmetic_tac: {
    name: "Compiler IR (TAC)",
    target: "tac",
    description: "Arithmetic expression lowering to Three-Address Code with temporaries",
    code: `x = 5 + 3 * 2;
y = (x - 1) / 2;
print y;`,
  },
  brainfuck: {
    name: "Brainfuck Codegen",
    target: "bf",
    description: "Constant propagation and arithmetic lowered to esolang tape code",
    code: `x = 3 + 5;
print x;`,
  },
};

export async function compileSource(source: string, target: string = "tac"): Promise<CompileResult> {
  try {
    const res = await fetch(`${API_BASE}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return {
        success: false,
        error: err.detail || `Server error: ${res.status}`,
        stage: "network",
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: `Could not connect to PolyStudio backend at ${API_BASE}. Make sure the FastAPI server is running. (${err.message})`,
      stage: "connection",
    };
  }
}

export async function checkHealth(): Promise<{ status: string; version?: string } | null> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (res.ok) return await res.json();
    return null;
  } catch {
    return null;
  }
}

export async function getBackends(): Promise<BackendInfo[]> {
  try {
    const res = await fetch(`${API_BASE}/backends`);
    if (res.ok) {
      const data = await res.json();
      return data.backends;
    }
  } catch {}
  return [
    { id: "midi", name: "MIDI Music", description: "Compose music from text" },
    { id: "tac", name: "Three-Address Code", description: "Learn compiler internals" },
    { id: "sql", name: "SQL Query", description: "Text → executable SQL" },
    { id: "dfa", name: "Regex → DFA", description: "Visualize regex automata" },
    { id: "bf", name: "Brainfuck", description: "Esoteric code generation" },
  ];
}

export function downloadMidiUrl(source: string): string {
  return `${API_BASE}/compile/midi`;
}

export interface SQLExecuteResult {
  success: boolean;
  sql?: string | null;
  columns: string[];
  rows: (string | number | boolean | null)[][];
  rowCount: number;
  executionTimeMs: number;
  error?: string | null;
}

export interface SQLNaturalResult {
  success: boolean;
  prompt: string;
  poly?: string | null;
  sql?: string | null;
  explanation?: string | null;
  spec?: {
    table: string;
    columns: string[];
    filter: string | null;
    orderBy: string | null;
    limit: number | null;
  } | null;
  error?: string | null;
}

export async function executeSQL(source: string): Promise<SQLExecuteResult> {
  try {
    const res = await fetch(`${API_BASE}/sql/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: err.detail || `Server error: ${res.status}`,
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      error: `Could not connect to database backend: ${err.message}`,
    };
  }
}

export async function translateNaturalSQL(prompt: string): Promise<SQLNaturalResult> {
  try {
    const res = await fetch(`${API_BASE}/sql/natural`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return {
        success: false,
        prompt,
        error: err.detail || `Server error: ${res.status}`,
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      prompt,
      error: `Could not reach natural language translator: ${err.message}`,
    };
  }
}

