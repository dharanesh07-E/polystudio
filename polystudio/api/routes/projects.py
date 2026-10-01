"""Project routes (stub — expand with auth)."""
from fastapi import APIRouter, HTTPException

from polystudio.api.schemas import ProjectCreate
from polystudio.services import project_service

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("")
def create(p: ProjectCreate):
    pid = project_service.create_project(0, p.name, p.target, p.source)
    return {"id": pid}


@router.get("")
def list_all():
    return {"projects": project_service.list_projects(0)}


@router.get("/{project_id}")
def get_one(project_id: int):
    p = project_service.get_project(project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@router.delete("/{project_id}")
def delete(project_id: int):
    project_service.delete_project(project_id)
    return {"ok": True}