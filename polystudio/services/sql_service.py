"""SQL Service for Natural Language to SQL and SQLite execution."""
import re
import time
from typing import Any

from polystudio.db.demo import run_query, setup_demo_db
from polystudio.services.compiler_service import compile_source


def execute_sql(source_or_sql: str) -> dict[str, Any]:
    """Execute PolyLang query or SQL against demo.db."""
    clean = source_or_sql.strip()
    if not clean:
        return {"success": False, "error": "Query is empty"}

    # If it looks like a PolyLang query (FROM <table> ...), compile it first
    sql_to_run = clean
    if clean.upper().startswith("FROM "):
        if not clean.endswith(";"):
            clean += ";"
        comp = compile_source(clean, "sql")
        if comp.success and comp.output:
            sql_to_run = comp.output.strip()
        else:
            return {
                "success": False,
                "error": comp.error or "Failed to compile PolyLang query to SQL",
                "stage": comp.stage,
            }

    # Ensure SQL ends with semicolon
    if not sql_to_run.endswith(";"):
        sql_to_run += ";"

    start_t = time.perf_counter()
    try:
        headers, rows = run_query(sql_to_run)
        elapsed_ms = round((time.perf_counter() - start_t) * 1000, 2)
        # Convert row tuples to lists
        rows_list = [list(r) for r in rows]
        return {
            "success": True,
            "sql": sql_to_run,
            "columns": headers,
            "rows": rows_list,
            "rowCount": len(rows_list),
            "executionTimeMs": elapsed_ms,
        }
    except Exception as e:
        return {
            "success": False,
            "sql": sql_to_run,
            "error": str(e),
        }


def natural_to_query(prompt: str) -> dict[str, Any]:
    """Translate natural language English prompt into PolyLang query and ANSI SQL."""
    p = prompt.strip().lower()
    if not p:
        return {
            "success": False,
            "error": "Prompt is empty",
        }

    # Determine table using word boundaries and context
    has_orders = bool(re.search(r"\b(orders?|purchases?|sales|total)\b", p))
    has_users = bool(re.search(r"\b(users?|people|persons?|accounts?|customers?|members?|names?|emails?|ages?)\b", p))
    
    if re.search(r"^\s*(?:find|show|get|list|display)?\s*orders\b", p) or re.search(r"\borders\s+(?:for|by|with|where)\b", p):
        table = "orders"
    elif has_orders and not has_users:
        table = "orders"
    elif has_users and not has_orders:
        table = "users"
    elif has_orders and re.search(r"(?:user\s*id|user_id|user)\s*(?:==?|is)?\s*\d+", p):
        table = "orders"
    else:
        table = "users"

    # Determine columns
    valid_cols = ["id", "name", "email", "age"] if table == "users" else ["id", "user_id", "total"]
    selected_cols: list[str] = []

    # Check for explicit column mention in "show ...", "select ...", "get ..."
    m_cols = re.search(r"(?:show|select|display|get|list|fetch)\s+(?:only\s+)?([a-z0-9_,\s]+?)(?:\s+(?:from|where|order|sorted|with|who|that)|$)", p)
    if m_cols:
        target_phrase = m_cols.group(1)
        for col in valid_cols:
            if re.search(r"\b" + col + r"\b", target_phrase):
                selected_cols.append(col)

    if not selected_cols:
        for col in (["name", "email"] if table == "users" else ["total"]):
            if re.search(r"\b" + col + r"s?\b", p) and not re.search(r"(?:by|order|where|older|greater|less|under|equal)\s+" + col, p):
                selected_cols.append(col)

    if not selected_cols or any(k in p for k in ["all", "everything", "all columns", "all rows", "every"]):
        selected_cols = ["*"]

    # Determine WHERE condition
    where_parts: list[str] = []

    # Age conditions
    if table == "users":
        # Between condition: "age between 20 and 30"
        m_between = re.search(r"(?:age\s+)?between\s+(\d+)\s+and\s+(\d+)", p)
        if m_between:
            low, high = m_between.groups()
            where_parts.append(f"age >= {low} AND age <= {high}")
        else:
            # older than / greater than / above / >
            m_gt = re.search(r"(?:older\s+than|greater\s+than|above|over|more\s+than|age\s*>\s*=?)\s*(\d+)", p)
            if m_gt:
                op = ">=" if ">=" in p or "at least" in p else ">"
                where_parts.append(f"age {op} {m_gt.group(1)}")
            # younger than / less than / under / below / <
            m_lt = re.search(r"(?:younger\s+than|less\s+than|under|below|age\s*<\s*=?)\s*(\d+)", p)
            if m_lt:
                op = "<=" if "<=" in p or "at most" in p else "<"
                where_parts.append(f"age {op} {m_lt.group(1)}")
            # adults
            if "adult" in p and not m_gt:
                where_parts.append("age >= 18")
            # young users
            if "young" in p and not m_lt:
                where_parts.append("age < 25")

        # Name condition
        m_name = re.search(r"(?:named\s+|name\s+is\s+|name\s*==?\s*|for\s+)(['\"]?)([A-Za-z]+)\1", prompt, re.IGNORECASE)
        if m_name and m_name.group(2).lower() not in ["users", "user", "order", "orders", "all", "the", "a", "an"]:
            where_parts.append(f"name == '{m_name.group(2)}'")

        # Email condition
        m_email = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", prompt)
        if m_email:
            where_parts.append(f"email == '{m_email.group(0)}'")

    # Orders conditions
    if table == "orders":
        m_tot_gt = re.search(r"(?:total\s+)?(?:greater\s+than|above|over|more\s+than|total\s*>\s*=?)\s*(\d+(?:\.\d+)?)", p)
        if m_tot_gt:
            where_parts.append(f"total > {m_tot_gt.group(1)}")
        m_tot_lt = re.search(r"(?:total\s+)?(?:less\s+than|under|below|total\s*<\s*=?)\s*(\d+(?:\.\d+)?)", p)
        if m_tot_lt:
            where_parts.append(f"total < {m_tot_lt.group(1)}")
        if "high value" in p and not m_tot_gt:
            where_parts.append("total > 100")

        m_uid = re.search(r"(?:user\s*id|user_id|user)\s*(?:==?|is)?\s*(\d+)", p)
        if m_uid:
            where_parts.append(f"user_id == {m_uid.group(1)}")

    where_clause = " AND ".join(where_parts) if where_parts else None

    # Determine ORDER BY
    order_by: str | None = None
    if "highest" in p or "most expensive" in p or "maximum" in p:
        order_by = "total DESC" if table == "orders" else "age DESC"
    elif "lowest" in p or "cheapest" in p or "minimum" in p:
        order_by = "total ASC" if table == "orders" else "age ASC"
    elif "oldest" in p:
        order_by = "age DESC"
    elif "youngest" in p:
        order_by = "age ASC"
    elif "alphabetical" in p or "by name" in p or "order by name" in p or "sort by name" in p:
        order_by = "name"
    elif "order by age" in p or "sorted by age" in p or "by age" in p:
        order_by = "age DESC" if "desc" in p else "age"
    elif "order by total" in p or "sorted by total" in p or "by total" in p:
        order_by = "total DESC" if "desc" in p else "total"
    elif "order by" in p or "sorted by" in p:
        m_ord = re.search(r"(?:order|sorted)\s+by\s+([a-z_]+)(?:\s+(asc|desc))?", p)
        if m_ord:
            col = m_ord.group(1)
            direction = f" {m_ord.group(2).upper()}" if m_ord.group(2) else ""
            if col in valid_cols:
                order_by = f"{col}{direction}"

    # Determine LIMIT
    limit: int | None = None
    m_limit = re.search(r"(?:top|first|limit)\s+(\d+)", p)
    if m_limit:
        limit = int(m_limit.group(1))

    # Assemble PolyLang query
    cols_str = ", ".join(selected_cols)
    poly = f"FROM {table}"
    if where_clause:
        poly += f" WHERE {where_clause}"
    poly += f" SELECT {cols_str}"
    if order_by:
        poly += f" ORDER BY {order_by}"
    if limit:
        poly += f" LIMIT {limit}"
    poly += ";"

    # Assemble ANSI SQL
    sql = f"SELECT {cols_str} FROM {table}"
    if where_clause:
        sql_where = where_clause.replace("==", "=")
        sql += f" WHERE {sql_where}"
    if order_by:
        sql += f" ORDER BY {order_by}"
    if limit:
        sql += f" LIMIT {limit}"
    sql += ";"

    # Build human explanation
    explanation_parts = [f"Query table '{table}'"]
    if where_clause:
        explanation_parts.append(f"filter where {where_clause}")
    explanation_parts.append(f"select {cols_str}")
    if order_by:
        explanation_parts.append(f"order by {order_by}")
    if limit:
        explanation_parts.append(f"limit to {limit} records")

    explanation = ", ".join(explanation_parts) + "."

    return {
        "success": True,
        "prompt": prompt,
        "poly": poly,
        "sql": sql,
        "explanation": explanation,
        "spec": {
            "table": table,
            "columns": selected_cols,
            "filter": where_clause,
            "orderBy": order_by,
            "limit": limit,
        },
    }
