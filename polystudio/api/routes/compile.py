"""Compile routes."""
import os
import tempfile
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from polystudio.api.schemas import CompileRequest, CompileResponse
from polystudio.backends.registry import get_backend
from polystudio.core.lexer import Lexer
from polystudio.core.parser import Parser
from polystudio.services.compiler_service import compile_source

router = APIRouter(prefix="/compile", tags=["compile"])


@router.post("", response_model=CompileResponse)
def compile_endpoint(req: CompileRequest):
    r = compile_source(req.source, req.target)
    return CompileResponse(
        success=r.success,
        output=r.output,
        ast=r.ast,
        error=r.error,
        stage=r.stage,
    )


@router.post("/midi")
def compile_midi(req: CompileRequest):
    """Compile to MIDI and return the file."""
    try:
        tree = Parser(Lexer(req.source).tokens).parse()
    except SyntaxError as e:
        raise HTTPException(400, str(e))
    tmp = os.path.join(tempfile.gettempdir(), f"{uuid.uuid4().hex}.mid")
    try:
        get_backend("midi")(out_path=tmp).generate(tree)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, str(e))
    return FileResponse(tmp, media_type="audio/midi",
                        filename="output.mid")