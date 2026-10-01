from fastapi.testclient import TestClient

from polystudio.api.server import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_backends():
    r = client.get("/backends")
    assert r.status_code == 200
    assert len(r.json()["backends"]) == 5


def test_compile_tac():
    r = client.post("/compile", json={"source": "x = 5 + 3;", "target": "tac"})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "x = " in data["output"]