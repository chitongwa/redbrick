// ── Graduation auto-trigger service ──
// Called after each successful trade credit payment.
// Evaluates graduation eligibility and creates a pending record if approved.

import { query } from '../config/db.js';
import env from '../config/env.js';
import { sendGraduationCongrats } from './sms-notify.js';

const SCORING_URL = process.env.SCORING_ENGINE_URL || 'http://localhost:8001';

/**
 * Trigger a graduation check for a Tier 1 user.
 * Returns the graduation result or null if skipped.
 */
export async function triggerGraduationCheck(userId) {
  // 1. Fetch user
  const userResult = await query(
    `SELECT id, phone_number, full_name, tier, trade_credit_transactions,
            trade_credit_default_count, account_frozen, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) return null;
  const user = userResult.rows[0];

  // Skip if already Tier 2
  if (user.tier === 'loan_credit') return null;

  // Quick pre-check: skip if obviously ineligible (< 6 transactions)
  if (user.trade_credit_transactions < 6) return null;

  // Check for existing pending graduation
  const existing = await query(
    `SELECT id FROM graduation_pending
     WHERE user_id = $1 AND status = 'pending'`,
    [userId]
  );
  if (existing.rows.length > 0) return null;

  // 2. Fetch trade credit orders
  const ordersResult = await query(
    `SELECT status, created_at, paid_at, frozen_at, total_due, electricity_amt
     FROM trade_credit_orders
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  // 3. Fetch ZESCO transactions
  const metersResult = await query(
    `SELECT id FROM meters WHERE user_id = $1`,
    [userId]
  );

  let zescoTxs = [];
  if (metersResult.rows.length > 0) {
    const meterIds = metersResult.rows.map(m => m.id);
    const txResult = await query(
      `SELECT amount_zmw, purchased_at
       FROM transactions
       WHERE meter_id = ANY($1)
       ORDER BY purchased_at DESC`,
      [meterIds]
    );
    zescoTxs = txResult.rows.map(t => ({
      date: t.purchased_at,
      amount: parseFloat(t.amount_zmw),
    }));
  }

  // 4. Build scoring payload
  const payload = {
    user: {
      id: String(user.id),
      tier: user.tier,
      trade_credit_transactions: user.trade_credit_transactions,
      trade_credit_default_count: user.trade_credit_default_count,
      account_frozen: user.account_frozen,
      created_at: user.created_at,
    },
    trade_credit_orders: ordersResult.rows.map(o => ({
      status: o.status,
      created_at: o.created_at,
      paid_at: o.paid_at,
      frozen_at: o.frozen_at,
      total_due: o.total_due ? parseFloat(o.total_due) : null,
      electricity_amt: o.electricity_amt ? parseFloat(o.electricity_amt) : null,
    })),
    zesco_transactions: zescoTxs,
    freeze_incidents: [],
  };

  // 5. Call scoring engine (or mock)
  let result;

  if (env.useMocks) {
    result = mockEval(payload);
  } else {
    const response = await fetch(`${SCORING_URL}/score/graduate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    result = await response.json();
  }

  // 6. If approved, create graduation_pending record + notify customer
  if (result.decision === 'approved') {
    const creditLimit = result.initial_credit_limit || 20;

    await query(
      `INSERT INTO graduation_pending
         (user_id, decision, initial_credit_limit, criteria_snapshot, reasons, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       ON CONFLICT (user_id) WHERE status = 'pending'
       DO UPDATE SET
         decision = EXCLUDED.decision,
         initial_credit_limit = EXCLUDED.initial_credit_limit,
         criteria_snapshot = EXCLUDED.criteria_snapshot,
         evaluated_at = now()`,
      [
        userId,
        result.decision,
        creditLimit,
        JSON.stringify(result.criteria_met || {}),
        JSON.stringify(result.reasons || []),
      ]
    );

    // 7. Notify customer via SMS + push (templated)
    try {
      await sendGraduationCongrats(user.phone_number, user.full_name, creditLimit, {
        userId: user.id,
      });
    } catch (e) {
      console.error('[graduation-trigger] notify failed:', e.message);
    }
  }

  return result;
}


/**
 * Simplified mock graduation evaluation (same logic as in graduation.js).
 */
function mockEval(payload) {
  const { user, trade_credit_orders, zesco_transactions } = payload;
  const reasons = [];

  const completed = trade_credit_orders.filter(o => o.status === 'paid').length;
  if (completed < 6) reasons.push(`Only ${completed} transactions, need 6`);

  const created = new Date(user.created_at);
  const ageMonths = (Date.now() - created.getTime()) / (30.44 * 24 * 3600 * 1000);
  if (ageMonths < 3) reasons.push(`Account too new (${ageMonths.toFixed(1)} months)`);

  const totalTransacted = trade_credit_orders
    .filter(o => o.status === 'paid')
    .reduce((s, o) => s + (o.total_due || o.electricity_amt || 0), 0);
  if (totalTransacted < 200) reasons.push(`Total ZMW ${totalTransacted.toFixed(2)} < 200`);

  if (reasons.length > 0) {
    return { decision: 'not_yet_eligible', reasons };
  }

  const monthly = {};
  for (const tx of zesco_transactions) {
    const key = String(tx.date).slice(0, 7);
    monthly[key] = (monthly[key] || 0) + tx.amount;
  }
  const months = Math.max(1, Object.keys(monthly).length);
  const avg = Object.values(monthly).reduce((a, b) => a + b, 0) / months;
  const limit = Math.max(20, Math.min(500, Math.round(avg * 0.3 * 100) / 100));

  return { decision: 'approved', reasons: [], initial_credit_limit: limit };
}
