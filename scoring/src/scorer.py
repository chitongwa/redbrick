"""
RedBrick Credit Scoring Engine — pure business logic.

Rules
-----
1. Collect up to 24 months of ZESCO transaction history.
2. Group transactions by calendar month and calculate average monthly spend.
3. Credit limit = 50 % of average monthly spend.
4. Clamp the result to [ZMW 20, ZMW 500].
5. If fewer than 3 distinct months of history → minimum ZMW 20.
6. If there is an active unpaid loan        → ZMW 0 (no additional credit).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Sequence

MIN_LIMIT: float = 20.0
MAX_LIMIT: float = 500.0
MIN_MONTHS: int = 3
MAX_MONTHS: int = 24
LIMIT_RATIO: float = 0.50


# ── Public API ──────────────────────────────────────────────────────────────

def calculate_credit_limit(
    transactions: Sequence[dict],
    has_active_loan: bool = False,
) -> dict:
    """Return a scoring result dict.

    Parameters
    ----------
    transactions:
        Each dict must contain ``date`` (ISO-8601 str or date/datetime)
        and ``amount`` (positive number, ZMW).
    has_active_loan:
        ``True`` when the meter has at least one unpaid loan.

    Returns
    -------
    dict with keys: credit_limit, avg_monthly_spend, months_used,
    total_transactions, reason.
    """

    # Rule 6 — active loan → zero credit
    if has_active_loan:
        return _result(
            credit_limit=0.0,
            avg_monthly_spend=0.0,
            months_used=0,
            total_transactions=len(transactions),
            reason="Active unpaid loan — no additional credit available",
        )

    # Normalise and filter to last 24 months
    parsed = _parse_transactions(transactions)
    if not parsed:
        return _result(
            credit_limit=MIN_LIMIT,
            avg_monthly_spend=0.0,
            months_used=0,
            total_transactions=0,
            reason="No transaction history — minimum limit applied",
        )

    # Group by (year, month)
    monthly: dict[tuple[int, int], float] = {}
    for d, amount in parsed:
        key = (d.year, d.month)
        monthly[key] = monthly.get(key, 0.0) + amount

    months_used = len(monthly)

    # Rule 5 — fewer than 3 months
    if months_used < MIN_MONTHS:
        return _result(
            credit_limit=MIN_LIMIT,
            avg_monthly_spend=round(sum(monthly.values()) / months_used, 2),
            months_used=months_used,
            total_transactions=len(parsed),
            reason=f"Only {months_used} month(s) of history — minimum limit applied",
        )

    avg_monthly_spend = round(sum(monthly.values()) / months_used, 2)

    # Rule 3 — 50 % of average, clamped
    raw_limit = avg_monthly_spend * LIMIT_RATIO
    credit_limit = round(_clamp(raw_limit, MIN_LIMIT, MAX_LIMIT), 2)

    return _result(
        credit_limit=credit_limit,
        avg_monthly_spend=avg_monthly_spend,
        months_used=months_used,
        total_transactions=len(parsed),
        reason="Scored from transaction history",
    )


# ── Helpers ─────────────────────────────────────────────────────────────────

def _parse_transactions(
    transactions: Sequence[dict],
) -> list[tuple[date, float]]:
    """Parse, validate and trim to the last *MAX_MONTHS* calendar months."""
    now = date.today()
    cutoff_year = now.year - (MAX_MONTHS // 12)
    cutoff_month = now.month - (MAX_MONTHS % 12)
    if cutoff_month <= 0:
        cutoff_month += 12
        cutoff_year -= 1
    cutoff = date(cutoff_year, cutoff_month, 1)

    results: list[tuple[date, float]] = []
    for tx in transactions:
        try:
            d = _to_date(tx["date"])
            amount = float(tx["amount"])
        except (KeyError, TypeError, ValueError):
            continue  # skip malformed rows

        if amount <= 0:
            continue
        if d < cutoff:
            continue

        results.append((d, amount))

    return results


def _to_date(value) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    # ISO-8601 string
    return datetime.fromisoformat(str(value)).date()


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _result(**kwargs) -> dict:
    return kwargs
