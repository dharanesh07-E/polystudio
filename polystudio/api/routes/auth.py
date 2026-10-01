"""Auth routes (stub for future expansion)."""
from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login():
    return {"message": "Auth coming soon"}


@router.post("/register")
def register():
    return {"message": "Auth coming soon"}