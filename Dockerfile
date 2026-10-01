FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY polystudio/ ./polystudio/

RUN pip install --no-cache-dir ".[api,music]"

EXPOSE 8000
CMD ["uvicorn", "polystudio.api.server:app", "--host", "0.0.0.0", "--port", "8000"]