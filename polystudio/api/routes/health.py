"""Health route."""
from fastapi import APIRouter

from polystudio.backends.registry import list_backends
from polystudio.version import __version__

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"status": "ok", "version": __version__}


@router.get("/backends")
def backends():
    return {"backends": list_backends()}