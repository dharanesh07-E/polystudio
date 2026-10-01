"""Export services."""
import io

from polystudio.services.compiler_service import compile_source


def export_as_text(source, target):
    """Compile and return as bytes for download."""
    result = compile_source(source, target)
    if not result.success or result.output is None:
        raise ValueError(result.error or "Compilation failed")
    return io.BytesIO(result.output.encode("utf-8"))