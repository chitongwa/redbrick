"""
RedBrick Graduation Engine — evaluates Tier 1 → Tier 2 eligibility.

Graduation Criteria (ALL must be met)
--------------------------------------
1. Minimum 6 completed trade credit transactions.
2. Zero payment defaults in the last 3 months.
3. Average payment time under 24 hours.
4. Minimum 3 months of account history.
5. No frozen account incidents in the last 60 days.
6. At least ZMW 200 total transacted through Redbrick.

Output
------
- decision: "approved" | "not_yet_eligible"
- If approved: initial_credit_limit (30 % of avg monthly ZESCO spend)
- If not eligible: reasons list + estimated_graduation_date
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Sequence

# ── Constants ──────────────────────────────────────────────────────────────

MIN_TRADE_TRANSACTIONS = 6
MAX_RECENT_DEFAULTS    = 0       # zero defaults in last 3 months
MAX_AVG_PAYMENT_HOURS  = 24.0    # average must be under 24h
MIN_ACCOUNT_MONTHS     = 3
MAX_FREEZE_DAYS        = 60      # no freeze incidents in last 60 days
MIN_TOTAL_TRANSACTED   = 200.0   # ZMW
INITIAL_LIMIT_RATIO    = 0.30    # 30 % of avg monthly ZESCO spend
MIN_CREDIT_LIMIT       = 20.0
MAX_CREDIT_LIMIT       = 500.0


# ── Public API ─────────────────────────────────────────────────────────────

def evaluate_graduation(
    user: dict,
    trade_credit_orders: Sequence[dict],
    zesco_transactions: Sequence[dict],
    freeze_incidents: Sequence[dict] | None = None,
) -> dict:
    """Evaluate whether a Tier 1 customer qualifies for Tier 2.

    Parameters
    ----------
    user : dict
        Must contain: id, tier, trade_credit_transactions,
        trade_credit_default_count, account_frozen, created_at.
    trade_credit_orders : list[dict]
        Each dict: status, created_at, paid_at (ISO strings).
        Only 'paid' orders count as completed.
    zesco_transactions : list[dict]
        Each dict: date (ISO), amount (ZMW). For credit limit calc.
    freeze_incidents : list[dict] | None
        Each dict: frozen_at (ISO). Recent account freezes.

    Returns
    -------
    dict with: decision, reasons (if not eligible),
    initial_credit_limit (if approved), estimated_graduation_date (if not).
    """

    reasons: list[str] = []
    today = date.today()

    # ── Criterion 1: Min 6 completed trade credit transactions ──────────
    completed = sum(
        1 for o in trade_credit_orders if o.get("status") == "paid"
    )
    if completed < MIN_TRADE_TRANSACTIONS:
        remaining = MIN_TRADE_TRANSACTIONS - completed
        reasons.append(
            f"Only {completed} completed transaction(s), need {MIN_TRADE_TRANSACTIONS} "
            f"({remaining} more required)"
        )

    # ── Criterion 2: Zero defaults in last 3 months ────────────────────
    three_months_ago = today - timedelta(days=90)
    recent_defaults = 0
    for o in trade_credit_orders:
        if o.get("status") in ("defaulted", "frozen"):
            order_date = _to_date(o.get("created_at", today.isoformat()))
            if order_date >= three_months_ago:
                recent_defaults += 1
    if recent_defaults > MAX_RECENT_DEFAULTS:
        reasons.append(
            f"{recent_defaults} payment default(s) in the last 3 months, need 0"
        )

    # ── Criterion 3: Average payment time under 24 hours ───────────────
    payment_hours = _calc_avg_payment_hours(trade_credit_orders)
    if payment_hours is not None and payment_hours >= MAX_AVG_PAYMENT_HOURS:
        reasons.append(
            f"Average payment time is {payment_hours:.1f} hours, must be under {MAX_AVG_PAYMENT_HOURS:.0f}"
        )
    elif payment_hours is None and completed > 0:
        # Can't calculate — missing timestamps
        pass  # don't penalise if data is incomplete

    # ── Criterion 4: Minimum 3 months of account history ───────────────
    account_created = _to_date(user.get("created_at", today.isoformat()))
    account_age_days = (today - account_created).days
    account_age_months = account_age_days / 30.44  # average days per month
    if account_age_months < MIN_ACCOUNT_MONTHS:
        months_left = MIN_ACCOUNT_MONTHS - account_age_months
        reasons.append(
            f"Account is {account_age_days} days old "
            f"({account_age_months:.1f} months), need {MIN_ACCOUNT_MONTHS} months "
            f"(~{int(months_left * 30)} more days)"
        )

    # ── Criterion 5: No frozen account incidents in last 60 days ───────
    freeze_cutoff = today - timedelta(days=MAX_FREEZE_DAYS)
    recent_freezes = 0
    if freeze_incidents:
        for f in freeze_incidents:
            frozen_date = _to_date(f.get("frozen_at", "2000-01-01"))
            if frozen_date >= freeze_cutoff:
                recent_freezes += 1
    # Also check orders that went to frozen status
    for o in trade_credit_orders:
        if o.get("status") == "frozen" and o.get("frozen_at"):
            frozen_date = _to_date(o["frozen_at"])
            if frozen_date >= freeze_cutoff:
                recent_freezes += 1
    if recent_freezes > 0:
        reasons.append(
            f"{recent_freezes} frozen account incident(s) in the last 60 days"
        )

    # ── Criterion 6: At least ZMW 200 total transacted ─────────────────
    total_transacted = sum(
        float(o.get("total_due", 0) or o.get("electricity_amt", 0))
        for o in trade_credit_orders
        if o.get("status") == "paid"
    )
    if total_transacted < MIN_TOTAL_TRANSACTED:
        shortfall = MIN_TOTAL_TRANSACTED - total_transacted
        reasons.append(
            f"Total transacted is ZMW {total_transacted:.2f}, "
            f"need ZMW {MIN_TOTAL_TRANSACTED:.2f} (ZMW {shortfall:.2f} more)"
        )

    # ── Decision ───────────────────────────────────────────────────────
    if reasons:
        estimated_date = _estimate_graduation_date(
            completed, account_created, today
        )
        return {
            "decision": "not_yet_eligible",
            "reasons": reasons,
            "criteria_met": _criteria_summary(
                completed, recent_defaults, payment_hours,
                account_age_months, recent_freezes, total_transacted
            ),
            "estimated_graduation_date": estimated_date,
        }

    # ── Approved: calculate initial credit limit ───────────────────────
    initial_limit = _calc_initial_credit_limit(zesco_transactions)

    return {
        "decision": "approved",
        "reasons": [],
        "initial_credit_limit": initial_limit,
        "criteria_met": _criteria_summary(
            completed, recent_defaults, payment_hours,
            account_age_months, recent_freezes, total_transacted
        ),
    }


# ── Helpers ────────────────────────────────────────────────────────────────

def _calc_avg_payment_hours(orders: Sequence[dict]) -> float | None:
    """Average hours between order creation and payment for paid orders."""
    hours_list = []
    for o in orders:
        if o.get("status") != "paid":
            continue
        created = o.get("created_at")
        paid = o.get("paid_at")
        if not created or not paid:
            continue
        try:
            dt_created = datetime.fromisoformat(str(created))
            dt_paid = datetime.fromisoformat(str(paid))
            diff = (dt_paid - dt_created).total_seconds() / 3600.0
            if diff >= 0:
                hours_list.append(diff)
        except (ValueError, TypeError):
            continue
    if not hours_list:
        return None
    return sum(hours_list) / len(hours_list)


def _calc_initial_credit_limit(zesco_transactions: Sequence[dict]) -> float:
    """30 % of average monthly ZESCO spend, clamped to [20, 500]."""
    if not zesco_transactions:
        return MIN_CREDIT_LIMIT

    monthly: dict[tuple[int, int], float] = {}
    for tx in zesco_transactions:
        try:
            d = _to_date(tx["date"])
            amount = float(tx["amount"])
        except (KeyError, TypeError, ValueError):
            continue
        if amount <= 0:
            continue
        key = (d.year, d.month)
        monthly[key] = monthly.get(key, 0.0) + amount

    if len(monthly) < 3:
        return MIN_CREDIT_LIMIT

    avg_monthly = sum(monthly.values()) / len(monthly)
    raw_limit = avg_monthly * INITIAL_LIMIT_RATIO
    return round(max(MIN_CREDIT_LIMIT, min(MAX_CREDIT_LIMIT, raw_limit)), 2)


def _estimate_graduation_date(
    completed: int, account_created: date, today: date
) -> str:
    """Rough estimate of when criteria could be met."""
    # Estimate based on whichever criterion takes longest
    days_needed = []

    # Transaction shortfall: assume ~2 transactions per month
    if completed < MIN_TRADE_TRANSACTIONS:
        remaining_tx = MIN_TRADE_TRANSACTIONS - completed
        days_needed.append(remaining_tx * 15)  # ~15 days per transaction

    # Account age
    account_age_days = (today - account_created).days
    min_days = int(MIN_ACCOUNT_MONTHS * 30.44)
    if account_age_days < min_days:
        days_needed.append(min_days - account_age_days)

    if not days_needed:
        # All time-based criteria met, just behavioural issues remain
        days_needed.append(30)  # buffer for clearing defaults/freezes

    estimated = today + timedelta(days=max(days_needed))
    return estimated.isoformat()


def _criteria_summary(
    completed: int,
    recent_defaults: int,
    payment_hours: float | None,
    account_months: float,
    recent_freezes: int,
    total_transacted: float,
) -> dict:
    """Summary of each criterion's status."""
    return {
        "completed_transactions": {
            "value": completed,
            "required": MIN_TRADE_TRANSACTIONS,
            "met": completed >= MIN_TRADE_TRANSACTIONS,
        },
        "recent_defaults": {
            "value": recent_defaults,
            "required": f"<= {MAX_RECENT_DEFAULTS}",
            "met": recent_defaults <= MAX_RECENT_DEFAULTS,
        },
        "avg_payment_hours": {
            "value": round(payment_hours, 1) if payment_hours is not None else None,
            "required": f"< {MAX_AVG_PAYMENT_HOURS}",
            "met": (payment_hours is not None and payment_hours < MAX_AVG_PAYMENT_HOURS)
                   if payment_hours is not None else None,
        },
        "account_age_months": {
            "value": round(account_months, 1),
            "required": f">= {MIN_ACCOUNT_MONTHS}",
            "met": account_months >= MIN_ACCOUNT_MONTHS,
        },
        "recent_freeze_incidents": {
            "value": recent_freezes,
            "required": 0,
            "met": recent_freezes == 0,
        },
        "total_transacted_zmw": {
            "value": round(total_transacted, 2),
            "required": MIN_TOTAL_TRANSACTED,
            "met": total_transacted >= MIN_TOTAL_TRANSACTED,
        },
    }


def _to_date(value) -> date:
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value)).date()
