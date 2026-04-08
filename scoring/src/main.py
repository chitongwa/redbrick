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
from .graduation import evaluate_graduation

app = FastAPI(
    title="RedBrick Scoring Engine",
    version="0.3.0",
    description="Credit scoring and graduation engine for RedBrick Zambia.",
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


# ── Graduation models ──────────────────────────────────────────────────────

class TradeCreditOrder(BaseModel):
    status: str = Field(..., examples=["paid"])
    created_at: str = Field(..., examples=["2026-01-15T10:00:00"])
    paid_at: Optional[str] = Field(default=None, examples=["2026-01-15T18:30:00"])
    frozen_at: Optional[str] = Field(default=None)
    total_due: Optional[float] = Field(default=None, examples=[104.00])
    electricity_amt: Optional[float] = Field(default=None, examples=[100.00])


class FreezeIncident(BaseModel):
    frozen_at: str = Field(..., examples=["2026-03-01T00:00:00"])


class UserProfile(BaseModel):
    id: str | int = Field(..., examples=["user-1"])
    tier: str = Field(..., examples=["trade_credit"])
    trade_credit_transactions: int = Field(default=0)
    trade_credit_default_count: int = Field(default=0)
    account_frozen: bool = Field(default=False)
    created_at: str = Field(..., examples=["2025-10-14"])


class GraduationRequest(BaseModel):
    user: UserProfile
    trade_credit_orders: list[TradeCreditOrder] = Field(default_factory=list)
    zesco_transactions: list[Transaction] = Field(default_factory=list)
    freeze_incidents: list[FreezeIncident] = Field(default_factory=list)


# ── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "redbrick-scoring", "version": "0.3.0"}


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


@app.post("/score/graduate")
def graduate(req: GraduationRequest):
    """Evaluate whether a Tier 1 customer qualifies for Tier 2 graduation."""

    user_dict = req.user.model_dump()
    orders = [o.model_dump() for o in req.trade_credit_orders]
    zesco_txs = [{"date": t.date, "amount": t.amount} for t in req.zesco_transactions]
    freezes = [f.model_dump() for f in req.freeze_incidents]

    result = evaluate_graduation(
        user=user_dict,
        trade_credit_orders=orders,
        zesco_transactions=zesco_txs,
        freeze_incidents=freezes,
    )

    return result
