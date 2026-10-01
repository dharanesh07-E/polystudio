"""Pydantic models for project storage."""
from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    target: str
    source: str


class ProjectResponse(BaseModel):
    id: int
    name: str
    target: str
    source: str
    created_at: datetime | None = None
    updated_at: datetime | None = None