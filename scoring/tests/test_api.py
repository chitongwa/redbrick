"""
Integration tests for the FastAPI /score endpoint.

Run:
    cd scoring && python -m pytest tests/test_api.py -v
"""

from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_score_empty_history():
    r = client.post("/score", json={
        "meter_number": "12345678",
        "transactions": [],
        "has_active_loan": False,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["credit_limit"] == 20.0
    assert body["meter_number"] == "12345678"


def test_score_with_history():
    txs = [
        {"date": "2026-01-15", "amount": 200.0},
        {"date": "2026-02-15", "amount": 200.0},
        {"date": "2026-03-15", "amount": 200.0},
    ]
    r = client.post("/score", json={
        "meter_number": "12345678",
        "transactions": txs,
        "has_active_loan": False,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["credit_limit"] == 100.0
    assert body["months_used"] == 3


def test_score_active_loan():
    txs = [{"date": "2026-01-15", "amount": 500.0}] * 6
    r = client.post("/score", json={
        "meter_number": "12345678",
        "transactions": txs,
        "has_active_loan": True,
    })
    assert r.status_code == 200
    assert r.json()["credit_limit"] == 0.0


def test_score_validation_bad_meter():
    r = client.post("/score", json={
        "meter_number": "AB",
        "transactions": [],
    })
    assert r.status_code == 422


def test_score_validation_bad_amount():
    r = client.post("/score", json={
        "meter_number": "12345678",
        "transactions": [{"date": "2026-01-15", "amount": -10}],
    })
    assert r.status_code == 422


def test_score_validation_bad_date():
    r = client.post("/score", json={
        "meter_number": "12345678",
        "transactions": [{"date": "not-a-date", "amount": 100}],
    })
    assert r.status_code == 422
