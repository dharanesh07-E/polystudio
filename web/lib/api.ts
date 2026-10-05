// API Client for PolyStudio

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TokenItem {
  "#": number;
  type: string;
  value: string;
  line: number;
}

export interface CompileResult {
  success: boolean;
  output?: string | null;
  ast?: string | null;
  ast_json?: any;
  tokens?: TokenItem[];
  printed_output?: string | null;
  error?: string | null;
  stage?: string | null;
}

export interface BackendInfo {
  id: string;
  name: string;
  description: string;
  languages?: string[];
}

export const PRESETS: Record<string, { name: string; target: string; lang?: string; code: string; description: string }> = {
  // --- Tamil Presets ---
  tamil_math: {
    name: "தமிழ்: எண் கணிதம் (Math)",
    target: "tac",
    lang: "tamil",
    description: "Tamil arithmetic with native keywords (எண், கூட்டு, அச்சிடு)",
    code: `எண் x = 5 கூட்டு 3;
அச்சிடு x;`,
  },
  tamil_music: {
    name: "தமிழ்: சுரம் இசை (Music)",
    target: "midi",
    lang: "tamil",
    description: "Tamil music syntax with tempo and notes",
    code: `வேகம் 120;
சுரம் C4 நேரம் கால்;
சுரம் D4 நேரம் கால்;
சுரம் E4 நேரம் கால்;
சுரம் G4 நேரம் அரை;`,
  },
  tamil_song_chinna: {
    name: "தமிழ்: சின்ன சின்ன ஆசை (Roja)",
    target: "midi",
    lang: "tamil",
    description: "AR Rahman's iconic melody in pure Tamil musical syntax",
    code: `// இசைப்புயல் ஏ.ஆர்.ரஹ்மான் - சின்ன சின்ன ஆசை (ரோஜா)
வேகம் 128;
சுரம் C4 நேரம் கால்;
சுரம் D4 நேரம் கால்;
சுரம் E4 நேரம் கால்;
சுரம் G4 நேரம் அரை;
சுரம் E4 நேரம் கால்;
சுரம் D4 நேரம் அரை;
இடைவெளி கால்;
சுரம் C4 நேரம் கால்;
சுரம் D4 நேரம் கால்;
சுரம் E4 நேரம் கால்;
சுரம் G4 நேரம் கால்;
சுரம் A4 நேரம் அரை;
சுரம் G4 நேரம் கால்;
சுரம் E4 நேரம் முழு;`,
  },
  tamil_song_munbe: {
    name: "தமிழ்: முன்பே வா (Munbe Vaa)",
    target: "midi",
    lang: "tamil",
    description: "Munbe Vaa melody from Sillunu Oru Kadhal in Tamil notation",
    code: `// ஏ.ஆர்.ரஹ்மான் - முன்பே வா (சில்லுனு ஒரு காதல்)
வேகம் 92;
சுரம் G4 நேரம் கால்;
சுரம் Eb4 நேரம் கால்;
சுரம் F4 நேரம் கால்;
சுரம் G4 நேரம் அரை;
சுரம் Bb4 நேரம் கால்;
சுரம் G4 நேரம் கால்;
சுரம் F4 நேரம் கால்;
சுரம் Eb4 நேரம் அரை;
இடைவெளி கால்;
சுரம் Eb4 நேரம் கால்;
சுரம் F4 நேரம் கால்;
சுரம் G4 நேரம் கால்;
சுரம் Eb4 நேரம் கால்;
சுரம் C4 நேரம் முழு;`,
  },

  tamil_recursion: {
    name: "தமிழ்: சுழல் செயல்பாடு (Tamil Recursion)",
    target: "tac",
    lang: "tamil",
    description: "Recursive factorial function in Tamil (செயல்பாடு, இருந்தால், திரும்பு)",
    code: `செயல்பாடு காரணி(எண் n) {
    இருந்தால் (n <= 1) {
        திரும்பு 1;
    }
    திரும்பு n பெருக்கு காரணி(n கழித்தல் 1);
}
எண் விடை = காரணி(5);
அச்சிடு விடை;`,
  },
  tamil_arrays: {
    name: "தமிழ்: வரிசை & கணிதம் (Tamil Arrays)",
    target: "tac",
    lang: "tamil",
    description: "Fixed-size array allocation, indexing, and arithmetic (வரிசை, arr[i])",
    code: `வரிசை arr[3];
arr[0] = 10;
arr[1] = 20;
எண் மொத்தம் = arr[0] கூட்டு arr[1];
அச்சிடு மொத்தம்;`,
  },
  tamil_pointers: {
    name: "தமிழ்: சுட்டிகள் (Tamil Pointers)",
    target: "tac",
    lang: "tamil",
    description: "Pointer declaration, address-of (&x), and dereferencing (*p) in Tamil",
    code: `எண் x = 42;
சுட்டி p = &x;
அச்சிடு *p;
*p = 100;
அச்சிடு x;`,
  },

  // --- C Subset Presets ---
  c_hello: {
    name: "C Subset: Hello World (printf)",
    target: "tac",
    lang: "c",
    description: "C-style variable declaration and printf call lowered to TAC",
    code: `int x = 5 + 3;
printf("%d", x);`,
  },
  c_recursion: {
    name: "C Subset: Recursion (Factorial)",
    target: "tac",
    lang: "c",
    description: "Recursive function definition with base case and stack frame simulation",
    code: `int fact(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * fact(n - 1);
}
int ans = fact(5);
printf("%d", ans);`,
  },
  c_arrays: {
    name: "C Subset: Array Indexing & Sum",
    target: "tac",
    lang: "c",
    description: "Linear array allocation and indexing lowered to TAC offsets",
    code: `int arr[3];
arr[0] = 10;
arr[1] = 20;
int total = arr[0] + arr[1];
printf("%d", total);`,
  },
  c_pointers: {
    name: "C Subset: Pointers & Dereference",
    target: "tac",
    lang: "c",
    description: "Address-of operator (&), pointer variable, and indirect mutation (*p = val)",
    code: `int x = 42;
int *p = &x;
printf("%d", *p);
*p = 100;
printf("%d", x);`,
  },
  c_loop: {
    name: "C Subset: For Loop Summation",
    target: "tac",
    lang: "c",
    description: "C-style for loop with conditional labels and branching",
    code: `int sum = 0;
for (int i = 1; i < 5; i = i + 1) {
    sum = sum + i;
}
printf("%d", sum);`,
  },
  c_factorial: {
    name: "C Subset: Factorial",
    target: "tac",
    lang: "c",
    description: "Iterative factorial computation in C syntax",
    code: `int n = 5;
int result = 1;
for (int i = 1; i < 6; i = i + 1) {
    result = result * i;
}
printf("%d", result);`,
  },

  // --- PolyLang DSL Presets ---
  scale: {
    name: "PolyLang: C Major Scale",
    target: "midi",
    lang: "poly",
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
    name: "PolyLang: Für Elise",
    target: "midi",
    lang: "poly",
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
    name: "PolyLang: Harmonic Chords",
    target: "midi",
    lang: "poly",
    description: "I-IV-V-I progression (C, F, G, C)",
    code: `TEMPO 100;
CHORD C4 E4 G4 DUR HALF;
CHORD F4 A4 C5 DUR HALF;
CHORD G4 B4 D5 DUR HALF;
CHORD C4 E4 G4 DUR WHOLE;`,
  },
  sql_query: {
    name: "PolyLang: SQL Filter Query",
    target: "sql",
    lang: "poly",
    description: "Text DSL to clean relational SQL with WHERE & ORDER BY",
    code: `FROM users WHERE age > 25 SELECT name, email ORDER BY age;`,
  },
  regex_dfa: {
    name: "PolyLang: Regex Automaton",
    target: "dfa",
    lang: "poly",
    description: "Pattern (a|b)*abb compiled to Thompson NFA & subset DFA",
    code: `REGEX r = "(a|b)*abb";`,
  },
  arithmetic_tac: {
    name: "PolyLang: Arithmetic (TAC)",
    target: "tac",
    lang: "poly",
    description: "Arithmetic expression lowering to Three-Address Code with temporaries",
    code: `x = 5 + 3 * 2;
y = (x - 1) / 2;
print y;`,
  },
  brainfuck: {
    name: "PolyLang: Brainfuck Codegen",
    target: "bf",
    lang: "poly",
    description: "Constant propagation and arithmetic lowered to esolang tape code",
    code: `x = 65;
print x;`,
  },
};

export async function compileSource(
  source: string,
  target: string = "tac",
  lang: string = "auto"
): Promise<CompileResult> {
  try {
    const res = await fetch(`${API_BASE}/compile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, target, lang }),
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

export async function getLanguages(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/languages`);
    if (res.ok) {
      return await res.json();
    }
  } catch {}
  return ["poly", "tamil", "c"];
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
    { id: "midi", name: "MIDI Music", description: "Compose music from text", languages: ["poly", "tamil"] },
    { id: "tac", name: "Three-Address Code", description: "Learn compiler internals", languages: ["poly", "tamil", "c"] },
    { id: "sql", name: "SQL Query", description: "Text → executable SQL", languages: ["poly", "tamil"] },
    { id: "dfa", name: "Regex → DFA", description: "Visualize regex automata", languages: ["poly", "tamil"] },
    { id: "bf", name: "Brainfuck", description: "Esoteric code generation", languages: ["poly", "tamil", "c"] },
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

