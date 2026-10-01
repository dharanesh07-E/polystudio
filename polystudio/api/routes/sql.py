"""SQL execution and natural language query routes."""
from fastapi import APIRouter

from polystudio.api.schemas import (
    SQLExecuteRequest,
    SQLExecuteResponse,
    SQLNaturalRequest,
    SQLNaturalResponse,
)
from polystudio.services.sql_service import execute_sql, natural_to_query

router = APIRouter(prefix="/sql", tags=["sql"])


@router.post("/execute", response_model=SQLExecuteResponse)
def execute_endpoint(req: SQLExecuteRequest):
    """Execute PolyLang query or ANSI SQL against the demo SQLite database."""
    res = execute_sql(req.source)
    return SQLExecuteResponse(
        success=res.get("success", False),
        sql=res.get("sql"),
        columns=res.get("columns", []),
        rows=res.get("rows", []),
        rowCount=res.get("rowCount", 0),
        executionTimeMs=res.get("executionTimeMs", 0.0),
        error=res.get("error"),
    )


@router.post("/natural", response_model=SQLNaturalResponse)
def natural_endpoint(req: SQLNaturalRequest):
    """Convert natural language query to PolyLang query and ANSI SQL."""
    res = natural_to_query(req.prompt)
    return SQLNaturalResponse(
        success=res.get("success", False),
        prompt=res.get("prompt", req.prompt),
        poly=res.get("poly"),
        sql=res.get("sql"),
        explanation=res.get("explanation"),
        spec=res.get("spec"),
        error=res.get("error"),
    )
