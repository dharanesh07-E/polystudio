.PHONY: install dev test lint api web clean

install:
	pip install -e ".[api,music,dev]"

dev:
	pip install -e ".[api,music,dev]"

test:
	pytest -v --cov=polystudio

lint:
	ruff check polystudio tests
	mypy polystudio

api:
	uvicorn polystudio.api.server:app --reload --port 8000

web:
	cd web && npm run dev

clean:
	rm -rf build dist *.egg-info .pytest_cache .coverage htmlcov
	find . -type d -name __pycache__ -exec rm -rf {} +