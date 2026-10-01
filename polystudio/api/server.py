"""FastAPI application entry point."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from polystudio.api.routes import auth, compile, health, projects, sql
from polystudio.db.database import init_db
from polystudio.version import __version__


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="PolyStudio API",
    version=__version__,
    description="Multi-backend compiler: SQL, DFA, TAC, MIDI, Brainfuck",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(health.router)
app.include_router(compile.router)
app.include_router(projects.router)
app.include_router(auth.router)
app.include_router(sql.router)


@app.get("/")
def root():
    return {
        "name": "PolyStudio",
        "version": __version__,
        "docs": "/docs",
        "backends": ["tac", "sql", "dfa", "midi", "bf"],
    }