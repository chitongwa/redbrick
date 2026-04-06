"""RedBrick Credit Scoring Engine."""

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="RedBrick Scoring Engine", version="0.1.0")


class ScoringRequest(BaseModel):
    meter_number: str
    phone: str


class ScoringResponse(BaseModel):
    meter_number: str
    risk_score: float
    credit_limit: float
    approved: bool


@app.get("/health")
def health():
    return {"status": "ok", "service": "redbrick-scoring"}


@app.post("/score", response_model=ScoringResponse)
def score_customer(req: ScoringRequest):
    """Score a customer and return their credit limit.

    TODO: Replace stub with real ML model inference.
    """
    # Stub: approve everyone with default limit
    return ScoringResponse(
        meter_number=req.meter_number,
        risk_score=0.15,
        credit_limit=250.00,
        approved=True,
    )
