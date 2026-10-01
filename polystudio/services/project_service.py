"""Project CRUD."""
from polystudio.db.database import connect


def create_project(user_id, name, target, source):
    with connect() as conn:
        c = conn.cursor()
        c.execute("""INSERT INTO projects (user_id, name, target, source)
                     VALUES (?, ?, ?, ?)""", (user_id, name, target, source))
        return c.lastrowid


def list_projects(user_id):
    with connect() as conn:
        c = conn.cursor()
        c.execute("""SELECT id, name, target, updated_at FROM projects
                     WHERE user_id = ? ORDER BY updated_at DESC""",
                  (user_id,))
        return [dict(r) for r in c.fetchall()]


def get_project(project_id):
    with connect() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = c.fetchone()
        return dict(row) if row else None


def update_project(project_id, source=None, target=None, name=None):
    sets, args = [], []
    if source is not None: sets.append("source = ?"); args.append(source)
    if target is not None: sets.append("target = ?"); args.append(target)
    if name is not None: sets.append("name = ?"); args.append(name)
    sets.append("updated_at = CURRENT_TIMESTAMP")
    args.append(project_id)
    with connect() as conn:
        c = conn.cursor()
        c.execute(f"UPDATE projects SET {', '.join(sets)} WHERE id = ?", args)


def delete_project(project_id):
    with connect() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM projects WHERE id = ?", (project_id,))