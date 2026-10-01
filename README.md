# 🎼 PolyStudio

One DSL → **SQL · DFA · TAC · MIDI · Brainfuck**

A multi-backend compiler platform for music composition, query building,
regex visualization, and compiler education.

## 🚀 Quick Start

```bash
git clone <repo>
cd polystudio
python -m venv venv
venv\Scripts\activate     # Windows
pip install -e ".[api,music,dev]"
```

## 💻 Usage

### CLI
```bash
polystudio backends
polystudio compile examples/scale.poly -t midi -o scale.mid
polystudio compile examples/query.poly -t sql
polystudio repl -t tac
```

### API
```bash
uvicorn polystudio.api.server:app --reload
# → http://localhost:8000/docs
```

### Web Frontend
```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

### Tests
```bash
pytest -v
```

## 🎯 5 Backends

| Backend | Use case | Command |
|---------|---------|---------|
| 🎵 MIDI | Compose music | `-t midi` |
| 📊 TAC | Learn compilers | `-t tac` |
| 🗄️ SQL | Text → SQL | `-t sql` |
| 🔤 DFA | Regex → automaton | `-t dfa` |
| 🧠 BF | Esolang codegen | `-t bf` |

## 📖 Grammar

```
x = 5 + 3 * 2;
print x;
FROM users WHERE age > 25 SELECT name;
REGEX r = "(a|b)*abb";
TEMPO 120;
NOTE C4 DUR QUARTER;
CHORD C4 E4 G4 DUR HALF;
REST DUR QUARTER;
REPEAT 2 { NOTE E4 DUR EIGHTH; }
```

## 📦 Structure

```
polystudio/
├── polystudio/    # Python package
├── web/           # Next.js frontend
├── examples/      # Sample .poly files
└── tests/         # Test suite
```

## 📄 License

MIT