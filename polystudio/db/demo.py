"""Demo SQLite tables for SQL backend playground."""
import os
import sqlite3

DEMO_DB = "demo.db"


def setup_demo_db(path=DEMO_DB):
    if os.path.exists(path):
        os.remove(path)
    conn = sqlite3.connect(path)
    c = conn.cursor()
    c.execute("""CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT, email TEXT, age INTEGER
    )""")
    c.execute("""CREATE TABLE orders (
        id INTEGER PRIMARY KEY, user_id INTEGER, total REAL
    )""")
    users = [
        (1, "Alice", "alice@x.com", 30),
        (2, "Bob", "bob@x.com", 22),
        (3, "Charlie", "charlie@x.com", 28),
        (4, "Diana", "diana@x.com", 35),
        (5, "Eve", "eve@x.com", 19),
    ]
    orders = [
        (1, 1, 150.0), (2, 2, 80.5), (3, 1, 220.0),
        (4, 4, 45.0), (5, 5, 300.0),
    ]
    c.executemany("INSERT INTO users VALUES (?,?,?,?)", users)
    c.executemany("INSERT INTO orders VALUES (?,?,?)", orders)
    conn.commit()
    conn.close()
    return path


def run_query(sql, path=DEMO_DB):
    if not os.path.exists(path):
        setup_demo_db(path)
    conn = sqlite3.connect(path)
    try:
        c = conn.cursor()
        c.execute(sql)
        rows = c.fetchall()
        headers = [d[0] for d in c.description] if c.description else []
        return headers, rows
    finally:
        conn.close()


def pretty_print(headers, rows):
    if not headers:
        print("(no result)")
        return
    widths = [len(h) for h in headers]
    for row in rows:
        for i, v in enumerate(row):
            widths[i] = max(widths[i], len(str(v)))
    line = "+" + "+".join("-" * (w + 2) for w in widths) + "+"
    print(line)
    print("| " + " | ".join(h.ljust(widths[i])
                            for i, h in enumerate(headers)) + " |")
    print(line)
    for row in rows:
        print("| " + " | ".join(str(v).ljust(widths[i])
                                for i, v in enumerate(row)) + " |")
    print(line)
    print(f"({len(rows)} rows)")