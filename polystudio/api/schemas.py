from typing import Any

from pydantic import BaseModel


class CompileRequest(BaseModel):
    source: str
    target: str = "tac"


class CompileResponse(BaseModel):
    success: bool
    output: str | None = None
    ast: str | None = None
    error: str | None = None
    stage: str | None = None


class BackendInfo(BaseModel):
    id: str
    name: str
    description: str


class BackendList(BaseModel):
    backends: list[BackendInfo]


class ProjectCreate(BaseModel):
    name: str
    target: str
    source: str


class SQLExecuteRequest(BaseModel):
    source: str


class SQLExecuteResponse(BaseModel):
    success: bool
    sql: str | None = None
    columns: list[str] = []
    rows: list[list[Any]] = []
    rowCount: int = 0
    executionTimeMs: float = 0.0
    error: str | None = None


class SQLNaturalRequest(BaseModel):
    prompt: str


class SQLNaturalResponse(BaseModel):
    success: bool
    prompt: str = ""
    poly: str | None = None
    sql: str | None = None
    explanation: str | None = None
    spec: dict[str, Any] | None = None
    error: str | None = None