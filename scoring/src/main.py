"""
RedBrick Credit Scoring Engine — FastAPI application.

Run:
    uvicorn src.main:app --reload --port 8001
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field, field_validator

from .scorer import calculate_credit_limit

app = FastAPI(
    title="RedBrick Scoring Engine",
    version="0.2.0",
    description="Calculates credit limits based on ZESCO transaction history.",
)


# ── Request / Response models ───────────────────────────────────────────────

class Transaction(BaseModel):
    date: str = Field(..., examples=["2026-03-15"])
    amount: float = Field(..., gt=0, examples=[150.00])

    @field_validator("date")
    @classmethod
    def date_must_be_iso(cls, v: str) -> str:
        try:
            datetime.fromisoformat(v)
        except ValueError:
            raise ValueError("date must be a valid ISO-8601 string")
        return v


class ScoringRequest(BaseModel):
    meter_number: str = Field(..., min_length=6, max_length=20, examples=["12345678"])
    transactions: list[Transaction] = Field(default_factory=list)
    has_active_loan: bool = Field(default=False)


class ScoringResponse(BaseModel):
    meter_number: str
    credit_limit: float
    avg_monthly_spend: float
    months_used: int
    total_transactions: int
    reason: str


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "redbrick-scoring", "version": "0.2.0"}


@app.post("/score", response_model=ScoringResponse)
def score(req: ScoringRequest):
    """Score a meter and return the recommended credit limit."""

    tx_dicts = [{"date": t.date, "amount": t.amount} for t in req.transactions]

    result = calculate_credit_limit(
        transactions=tx_dicts,
        has_active_loan=req.has_active_loan,
    )

    return ScoringResponse(
        meter_number=req.meter_number,
        **result,
    )
