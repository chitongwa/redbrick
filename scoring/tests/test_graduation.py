"""
Unit tests for the RedBrick graduation engine.

Run:
    cd scoring && python -m pytest tests/test_graduation.py -v
"""

from datetime import date, timedelta
import pytest

from src.graduation import (
    evaluate_graduation,
    MIN_TRADE_TRANSACTIONS,
    MIN_TOTAL_TRANSACTED,
    MIN_ACCOUNT_MONTHS,
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _user(
    created_days_ago=120,
    trade_credit_transactions=8,
    trade_credit_default_count=0,
    account_frozen=False,
    tier="trade_credit",
):
    created = (date.today() - timedelta(days=created_days_ago)).isoformat()
    return {
        "id": "test-user-1",
        "tier": tier,
        "trade_credit_transactions": trade_credit_transactions,
        "trade_credit_default_count": trade_credit_default_count,
        "account_frozen": account_frozen,
        "created_at": created,
    }


def _paid_orders(count=8, hours_to_pay=12.0, amount_each=50.0):
    """Generate paid trade credit orders."""
    from datetime import datetime, timedelta
    orders = []
    for i in range(count):
        created_dt = datetime(2026, 1, 10 + i, 10, 0, 0)
        paid_dt = created_dt + timedelta(hours=hours_to_pay)
        orders.append({
            "status": "paid",
            "created_at": created_dt.isoformat(),
            "paid_at": paid_dt.isoformat(),
            "frozen_at": None,
            "total_due": amount_each,
            "electricity_amt": amount_each * 0.96,
        })
    return orders


def _zesco_txs(months=6, amount_per_month=250.0):
    """Generate ZESCO transaction history."""
    txs = []
    today = date.today()
    for m in range(months):
        d = today.replace(day=15)
        year = d.year
        month = d.month - m
        while month <= 0:
            month += 12
            year -= 1
        txs.append({"date": date(year, month, 15).isoformat(), "amount": amount_per_month})
    return txs


# ═════════════════════════════════════════════════════════════════════════════
# Full eligibility — all criteria met
# ═════════════════════════════════════════════════════════════════════════════

class TestFullEligibility:
    def test_approved_with_good_history(self):
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(8, hours_to_pay=12),
            zesco_transactions=_zesco_txs(6, 250.0),
        )
        assert r["decision"] == "approved"
        assert r["reasons"] == []
        assert r["initial_credit_limit"] > 0
        assert "initial_credit_limit" in r

    def test_credit_limit_is_30_percent(self):
        """30% of avg monthly = 250 * 0.3 = 75."""
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(8),
            zesco_transactions=_zesco_txs(6, 250.0),
        )
        assert r["initial_credit_limit"] == 75.0

    def test_credit_limit_capped_at_500(self):
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(8),
            zesco_transactions=_zesco_txs(6, 5000.0),
        )
        assert r["initial_credit_limit"] == 500.0


# ═════════════════════════════════════════════════════════════════════════════
# Criterion 1: Minimum 6 completed transactions
# ═════════════════════════════════════════════════════════════════════════════

class TestMinTransactions:
    def test_too_few_transactions(self):
        r = evaluate_graduation(
            user=_user(trade_credit_transactions=4),
            trade_credit_orders=_paid_orders(4),
            zesco_transactions=_zesco_txs(),
        )
        assert r["decision"] == "not_yet_eligible"
        assert any("4 completed" in reason for reason in r["reasons"])

    def test_exactly_6_passes(self):
        r = evaluate_graduation(
            user=_user(trade_credit_transactions=6),
            trade_credit_orders=_paid_orders(6),
            zesco_transactions=_zesco_txs(),
        )
        assert r["decision"] == "approved"


# ═════════════════════════════════════════════════════════════════════════════
# Criterion 2: Zero defaults in last 3 months
# ═════════════════════════════════════════════════════════════════════════════

class TestRecentDefaults:
    def test_recent_default_blocks(self):
        orders = _paid_orders(8)
        # Add a recent defaulted order
        orders.append({
            "status": "defaulted",
            "created_at": (date.today() - timedelta(days=30)).isoformat(),
            "paid_at": None,
            "frozen_at": None,
            "total_due": 50,
            "electricity_amt": 48,
        })
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=orders,
            zesco_transactions=_zesco_txs(),
        )
        assert r["decision"] == "not_yet_eligible"
        assert any("default" in reason.lower() for reason in r["reasons"])


# ═════════════════════════════════════════════════════════════════════════════
# Criterion 3: Average payment time under 24 hours
# ═════════════════════════════════════════════════════════════════════════════

class TestPaymentSpeed:
    def test_slow_payments_block(self):
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(8, hours_to_pay=30),
            zesco_transactions=_zesco_txs(),
        )
        assert r["decision"] == "not_yet_eligible"
        assert any("payment time" in reason.lower() for reason in r["reasons"])

    def test_fast_payments_pass(self):
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(8, hours_to_pay=6),
            zesco_transactions=_zesco_txs(),
        )
        assert r["decision"] == "approved"


# ═════════════════════════════════════════════════════════════════════════════
# Criterion 4: Minimum 3 months account history
# ═════════════════════════════════════════════════════════════════════════════

class TestAccountAge:
    def test_new_account_blocks(self):
        r = evaluate_graduation(
            user=_user(created_days_ago=45),  # ~1.5 months
            trade_credit_orders=_paid_orders(8),
            zesco_transactions=_zesco_txs(),
        )
        assert r["decision"] == "not_yet_eligible"
        assert any("month" in reason.lower() for reason in r["reasons"])


# ═════════════════════════════════════════════════════════════════════════════
# Criterion 5: No frozen incidents in last 60 days
# ═════════════════════════════════════════════════════════════════════════════

class TestFreezeIncidents:
    def test_recent_freeze_blocks(self):
        orders = _paid_orders(8)
        orders.append({
            "status": "frozen",
            "created_at": (date.today() - timedelta(days=30)).isoformat(),
            "paid_at": None,
            "frozen_at": (date.today() - timedelta(days=30)).isoformat(),
            "total_due": 50,
            "electricity_amt": 48,
        })
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=orders,
            zesco_transactions=_zesco_txs(),
        )
        assert r["decision"] == "not_yet_eligible"
        assert any("frozen" in reason.lower() for reason in r["reasons"])


# ═════════════════════════════════════════════════════════════════════════════
# Criterion 6: At least ZMW 200 total transacted
# ═════════════════════════════════════════════════════════════════════════════

class TestMinTransacted:
    def test_low_total_blocks(self):
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(8, amount_each=20),  # 8×20 = 160 < 200
            zesco_transactions=_zesco_txs(),
        )
        assert r["decision"] == "not_yet_eligible"
        assert any("200" in reason for reason in r["reasons"])

    def test_exactly_200_passes(self):
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(8, amount_each=25),  # 8×25 = 200
            zesco_transactions=_zesco_txs(),
        )
        assert r["decision"] == "approved"


# ═════════════════════════════════════════════════════════════════════════════
# Output structure
# ═════════════════════════════════════════════════════════════════════════════

class TestOutputStructure:
    def test_approved_has_credit_limit(self):
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(8),
            zesco_transactions=_zesco_txs(),
        )
        assert "initial_credit_limit" in r
        assert "criteria_met" in r

    def test_not_eligible_has_estimated_date(self):
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(3),
            zesco_transactions=_zesco_txs(),
        )
        assert "estimated_graduation_date" in r
        assert r["estimated_graduation_date"] > date.today().isoformat()

    def test_criteria_summary_present(self):
        r = evaluate_graduation(
            user=_user(),
            trade_credit_orders=_paid_orders(8),
            zesco_transactions=_zesco_txs(),
        )
        cm = r["criteria_met"]
        assert "completed_transactions" in cm
        assert "recent_defaults" in cm
        assert "avg_payment_hours" in cm
        assert "account_age_months" in cm
        assert "recent_freeze_incidents" in cm
        assert "total_transacted_zmw" in cm
