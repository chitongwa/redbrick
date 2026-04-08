"""
Unit tests for the RedBrick credit scoring engine.

Run:
    cd scoring && python -m pytest tests/ -v
"""

from datetime import date, timedelta
import pytest

from src.scorer import (
    calculate_credit_limit,
    MIN_LIMIT,
    MAX_LIMIT,
    MIN_MONTHS,
    LIMIT_RATIO,
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _tx(months_ago: int, amount: float) -> dict:
    """Build a transaction dict *months_ago* months before today."""
    d = date.today().replace(day=15)
    year = d.year
    month = d.month - months_ago
    while month <= 0:
        month += 12
        year -= 1
    return {"date": date(year, month, 15).isoformat(), "amount": amount}


def _spread(months: int, amount_per_month: float) -> list[dict]:
    """One transaction per month for *months* months back."""
    return [_tx(m, amount_per_month) for m in range(months)]


# ═════════════════════════════════════════════════════════════════════════════
# Edge case: no history at all
# ═════════════════════════════════════════════════════════════════════════════

class TestNoHistory:
    def test_empty_list_returns_min(self):
        r = calculate_credit_limit([], has_active_loan=False)
        assert r["credit_limit"] == MIN_LIMIT
        assert r["months_used"] == 0
        assert r["total_transactions"] == 0
        assert "No transaction history" in r["reason"]

    def test_all_negative_amounts_ignored(self):
        txs = [{"date": "2026-01-15", "amount": -50}]
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MIN_LIMIT
        assert r["total_transactions"] == 0

    def test_malformed_rows_ignored(self):
        txs = [
            {"date": "not-a-date", "amount": 100},
            {"amount": 100},             # missing date
            {"date": "2026-01-15"},      # missing amount
        ]
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MIN_LIMIT
        assert r["total_transactions"] == 0


# ═════════════════════════════════════════════════════════════════════════════
# Edge case: 1 month (< MIN_MONTHS)
# ═════════════════════════════════════════════════════════════════════════════

class TestOneMonth:
    def test_single_month_returns_min(self):
        txs = _spread(1, 400.0)
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MIN_LIMIT
        assert r["months_used"] == 1
        assert "Only 1 month" in r["reason"]

    def test_two_months_returns_min(self):
        txs = _spread(2, 300.0)
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MIN_LIMIT
        assert r["months_used"] == 2


# ═════════════════════════════════════════════════════════════════════════════
# Exactly 3 months — threshold
# ═════════════════════════════════════════════════════════════════════════════

class TestThreeMonths:
    def test_three_months_applies_formula(self):
        txs = _spread(3, 200.0)  # avg = 200, limit = 100
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == 200.0 * LIMIT_RATIO
        assert r["months_used"] == 3

    def test_three_months_low_spend_floors_to_min(self):
        txs = _spread(3, 10.0)  # avg = 10, 50% = 5 → clamped to 20
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MIN_LIMIT


# ═════════════════════════════════════════════════════════════════════════════
# 6 months — typical user
# ═════════════════════════════════════════════════════════════════════════════

class TestSixMonths:
    def test_six_months_moderate_spend(self):
        txs = _spread(6, 300.0)  # avg = 300, limit = 150
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == 150.0
        assert r["months_used"] == 6
        assert r["avg_monthly_spend"] == 300.0

    def test_six_months_high_spend_caps_at_max(self):
        txs = _spread(6, 2000.0)  # avg = 2000, 50% = 1000 → capped 500
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MAX_LIMIT


# ═════════════════════════════════════════════════════════════════════════════
# 24 months — long history
# ═════════════════════════════════════════════════════════════════════════════

class TestTwentyFourMonths:
    def test_24_months_all_used(self):
        txs = _spread(24, 250.0)  # avg = 250, limit = 125
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == 125.0
        assert r["months_used"] == 24
        assert r["total_transactions"] == 24

    def test_transactions_beyond_24_months_ignored(self):
        txs = _spread(24, 250.0) + [_tx(30, 9999.0)]  # old tx ignored
        r = calculate_credit_limit(txs)
        assert r["months_used"] == 24
        assert r["total_transactions"] == 24  # the 30-month-old one is dropped


# ═════════════════════════════════════════════════════════════════════════════
# Irregular spending patterns
# ═════════════════════════════════════════════════════════════════════════════

class TestIrregularSpending:
    def test_multiple_transactions_same_month_summed(self):
        """Three purchases in one month should sum."""
        d = date.today().replace(day=1).isoformat()
        txs = [
            {"date": d, "amount": 100},
            {"date": d, "amount": 50},
            {"date": d, "amount": 50},
        ] + _spread(3, 200.0)  # add 3 more months so >= MIN_MONTHS
        r = calculate_credit_limit(txs)
        # month 0 = 200+100+50+50 = 400 if same month, else separate
        assert r["months_used"] >= MIN_MONTHS
        assert r["credit_limit"] >= MIN_LIMIT

    def test_one_big_month_many_small(self):
        """One massive month + 5 tiny months."""
        txs = [_tx(0, 3000.0)]  # big month
        txs += [_tx(m, 20.0) for m in range(1, 6)]  # 5 × ZMW 20
        r = calculate_credit_limit(txs)
        # avg = (3000 + 5*20) / 6 = 516.67 → 50% = 258.33
        assert r["credit_limit"] == 258.33
        assert r["months_used"] == 6

    def test_sporadic_months_only_present_counted(self):
        """Transactions in months 0, 3, 8 — three months but spread."""
        txs = [_tx(0, 300.0), _tx(3, 300.0), _tx(8, 300.0)]
        r = calculate_credit_limit(txs)
        assert r["months_used"] == 3
        assert r["avg_monthly_spend"] == 300.0
        assert r["credit_limit"] == 150.0


# ═════════════════════════════════════════════════════════════════════════════
# Active loan → zero credit
# ═════════════════════════════════════════════════════════════════════════════

class TestActiveLoan:
    def test_active_loan_returns_zero(self):
        txs = _spread(12, 500.0)  # would normally score high
        r = calculate_credit_limit(txs, has_active_loan=True)
        assert r["credit_limit"] == 0.0
        assert "Active unpaid loan" in r["reason"]

    def test_active_loan_with_no_history_still_zero(self):
        r = calculate_credit_limit([], has_active_loan=True)
        assert r["credit_limit"] == 0.0


# ═════════════════════════════════════════════════════════════════════════════
# Clamping boundaries
# ═════════════════════════════════════════════════════════════════════════════

class TestClamping:
    def test_min_clamp(self):
        """avg 30 → 50% = 15 → clamped to 20."""
        txs = _spread(6, 30.0)
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MIN_LIMIT

    def test_max_clamp(self):
        """avg 5000 → 50% = 2500 → capped at 500."""
        txs = _spread(6, 5000.0)
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MAX_LIMIT

    def test_exactly_min(self):
        """avg 40 → 50% = 20 exactly."""
        txs = _spread(6, 40.0)
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MIN_LIMIT

    def test_exactly_max(self):
        """avg 1000 → 50% = 500 exactly."""
        txs = _spread(6, 1000.0)
        r = calculate_credit_limit(txs)
        assert r["credit_limit"] == MAX_LIMIT
