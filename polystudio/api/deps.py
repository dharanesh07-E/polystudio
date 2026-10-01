"""API dependencies."""
from polystudio.db.database import init_db


def ensure_db():
    init_db()