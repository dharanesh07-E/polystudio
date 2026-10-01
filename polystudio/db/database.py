"""Simple SQLite setup for demo + project storage."""
import os
import sqlite3
from contextlib import contextmanager

DB_PATH = os.environ.get("DATABASE_URL", "sqlite:///./polystudio.db")
if DB_PATH.startswith("sqlite:///"):
    DB_PATH = DB_PATH.replace("sqlite:///", "")


@contextmanager
def connect(path=DB_PATH):
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(path=DB_PATH):
    """Create tables."""
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with connect(path) as conn:
        c = conn.cursor()
        c.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        c.execute("""CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            target TEXT NOT NULL,
            source TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )""")