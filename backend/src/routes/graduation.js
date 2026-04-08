// ── Graduation routes ──
// POST /graduation/evaluate      — Trigger graduation check for a user
// POST /graduation/confirm       — Admin approves pending graduation
// POST /graduation/reject        — Admin rejects pending graduation
// GET  /graduation/pending       — List all pending graduations (admin)
// GET  /graduation/status/:userId — Check graduation status for a user

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as rules from '../validators/rules.js';
import env from '../config/env.js';
import { sendGraduationCongrats } from '../services/sms-notify.js';

const router = Router();

// Scoring engine URL (Python FastAPI service)
const SCORING_URL = process.env.SCORING_ENGINE_URL || 'http://localhost:8001';

// ── POST /graduation/evaluate ──────────────────────────────────────────────
// Trigger a graduation check for a user. Called automatically after
// each trade credit payment, or manually via this endpoint.
router.post(
  '/evaluate',
  requireAuth,
  async (req, res) => {
    try {
      const userId = req.body.user_id || req.user.userId;

      // 1. Fetch user profile
      const userResult = await query(
        `SELECT id, phone_number, full_name, tier, tier_upgraded_at,
                trade_credit_transactions, trade_credit_default_count,
                account_frozen, created_at
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // Already Tier 2
      if (user.tier === 'loan_credit') {
        return res.json({
          message: 'User is already on Tier 2 (Loan Credit)',
          tier: user.tier,
          tier_upgraded_at: user.tier_upgraded_at,
        });
      }

      // Check if there's already a pending graduation
      const existingPending = await query(
        `SELECT id, decision, initial_credit_limit, evaluated_at
         FROM graduation_pending
         WHERE user_id = $1 AND status = 'pending'`,
        [userId]
      );

      if (existingPending.rows.length > 0) {
        return res.json({
          message: 'Graduation evaluation already pending admin review',
          pending: existingPending.rows[0],
        });
      }

      // 2. Fetch trade credit orders for this user
      const ordersResult = await query(
        `SELECT id, status, electricity_amt, total_due, created_at,
                paid_at, frozen_at, payment_due_at
         FROM trade_credit_orders
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );

      // 3. Fetch ZESCO transactions (for credit limit calc)
      // Get all meters for this user first
      const metersResult = await query(
        `SELECT id FROM meters WHERE user_id = $1`,
        [userId]
      );

      let zescoTxs = [];
      if (metersResult.rows.length > 0) {
        const meterIds = metersResult.rows.map(m => m.id);
        // In real mode, query transactions for all meters
        // In mock mode, the handler returns sample data
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

      // 4. Call scoring engine's graduation endpoint
      const scoringPayload = {
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

      let graduationResult;

      if (env.useMocks) {
        // In mock mode, run a simplified evaluation locally
        graduationResult = mockGraduationEval(scoringPayload);
      } else {
        const response = await fetch(`${SCORING_URL}/score/graduate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scoringPayload),
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.error('[graduation] scoring engine error:', response.status, errBody);
          return res.status(502).json({ error: 'Scoring engine returned an error' });
        }

        graduationResult = await response.json();
      }

      // 5. If approved, create a graduation_pending record for admin review
      if (graduationResult.decision === 'approved') {
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
            graduationResult.decision,
            graduationResult.initial_credit_limit,
            JSON.stringify(graduationResult.criteria_met || {}),
            JSON.stringify(graduationResult.reasons || []),
          ]
        );
      }

      res.json({
        message: graduationResult.decision === 'approved'
          ? 'Graduation approved — pending admin confirmation'
          : 'Not yet eligible for graduation',
        graduation: graduationResult,
        user_id: userId,
        user_name: user.full_name,
      });
    } catch (err) {
      console.error('[graduation] evaluate error:', err);
      res.status(500).json({ error: 'Failed to evaluate graduation' });
    }
  }
);

// ── POST /graduation/confirm ───────────────────────────────────────────────
// Admin approves a pending graduation → upgrades user to Tier 2.
router.post(
  '/confirm',
  requireAuth,
  validate({ graduation_id: rules.requiredId }),
  async (req, res) => {
    try {
      const gradId = parseInt(req.body.graduation_id, 10);
      const adminId = req.body.confirmed_by || req.user.phone || 'admin';

      // Fetch the pending record
      const pending = await query(
        `SELECT id, user_id, decision, initial_credit_limit, status
         FROM graduation_pending WHERE id = $1`,
        [gradId]
      );

      if (pending.rows.length === 0) {
        return res.status(404).json({ error: 'Graduation record not found' });
      }

      const record = pending.rows[0];

      if (record.status !== 'pending') {
        return res.status(422).json({
          error: `Graduation has already been ${record.status}`,
        });
      }

      if (record.decision !== 'approved') {
        return res.status(422).json({
          error: 'Cannot confirm a graduation that was not approved by the scoring engine',
        });
      }

      // 1. Mark graduation as confirmed
      await query(
        `UPDATE graduation_pending
         SET status = 'confirmed', confirmed_at = now(), confirmed_by = $2
         WHERE id = $1`,
        [gradId, adminId]
      );

      // 2. Upgrade user to Tier 2
      await query(
        `UPDATE users
         SET tier = 'loan_credit', tier_upgraded_at = now()
         WHERE id = $1`,
        [record.user_id]
      );

      // 3. Create initial credit limit record for the user's meters
      const creditLimit = parseFloat(record.initial_credit_limit) || 20;
      const meters = await query(
        `SELECT id FROM meters WHERE user_id = $1`,
        [record.user_id]
      );

      for (const meter of meters.rows) {
        await query(
          `INSERT INTO credit_limits (meter_id, limit_amount, model_version)
           VALUES ($1, $2, 'graduation-v1')`,
          [meter.id, creditLimit]
        );
      }

      // 4. Send graduation congratulations (SMS + push) — fired on admin confirm
      try {
        const userProfile = await query(
          'SELECT phone_number, full_name FROM users WHERE id = $1',
          [record.user_id]
        );
        const profile = userProfile.rows[0];
        if (profile?.phone_number) {
          await sendGraduationCongrats(
            profile.phone_number,
            profile.full_name,
            creditLimit,
            { userId: record.user_id },
          );
        }
      } catch (notifyErr) {
        console.warn('[graduation] confirm notify failed:', notifyErr.message);
      }

      res.json({
        message: 'Graduation confirmed — user upgraded to Tier 2 (Loan Credit)',
        user_id: record.user_id,
        new_tier: 'loan_credit',
        initial_credit_limit: creditLimit,
        confirmed_by: adminId,
      });
    } catch (err) {
      console.error('[graduation] confirm error:', err);
      res.status(500).json({ error: 'Failed to confirm graduation' });
    }
  }
);

// ── POST /graduation/reject ────────────────────────────────────────────────
// Admin rejects a pending graduation.
router.post(
  '/reject',
  requireAuth,
  validate({ graduation_id: rules.requiredId }),
  async (req, res) => {
    try {
      const gradId = parseInt(req.body.graduation_id, 10);
      const reason = req.body.reason || 'Rejected by admin';

      const pending = await query(
        `SELECT id, user_id, status FROM graduation_pending WHERE id = $1`,
        [gradId]
      );

      if (pending.rows.length === 0) {
        return res.status(404).json({ error: 'Graduation record not found' });
      }

      if (pending.rows[0].status !== 'pending') {
        return res.status(422).json({
          error: `Graduation has already been ${pending.rows[0].status}`,
        });
      }

      await query(
        `UPDATE graduation_pending
         SET status = 'rejected', rejected_at = now(), rejection_reason = $2
         WHERE id = $1`,
        [gradId, reason]
      );

      res.json({
        message: 'Graduation rejected',
        graduation_id: gradId,
        user_id: pending.rows[0].user_id,
        reason,
      });
    } catch (err) {
      console.error('[graduation] reject error:', err);
      res.status(500).json({ error: 'Failed to reject graduation' });
    }
  }
);

// ── GET /graduation/pending ────────────────────────────────────────────────
// List all pending graduations (admin view).
router.get(
  '/pending',
  requireAuth,
  async (_req, res) => {
    try {
      const result = await query(
        `SELECT gp.id, gp.user_id, gp.decision, gp.initial_credit_limit,
                gp.criteria_snapshot, gp.reasons, gp.status, gp.evaluated_at,
                u.full_name, u.phone_number, u.trade_credit_transactions
         FROM graduation_pending gp
         JOIN users u ON u.id = gp.user_id
         WHERE gp.status = 'pending'
         ORDER BY gp.evaluated_at DESC`
      );

      res.json({ pending: result.rows });
    } catch (err) {
      console.error('[graduation] list pending error:', err);
      res.status(500).json({ error: 'Failed to fetch pending graduations' });
    }
  }
);

// ── GET /graduation/status/:userId ─────────────────────────────────────────
// Check graduation status for a specific user.
router.get(
  '/status/:userId',
  requireAuth,
  async (req, res) => {
    try {
      const userId = parseInt(req.params.userId, 10);
      if (!userId || userId <= 0) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const result = await query(
        `SELECT id, decision, initial_credit_limit, criteria_snapshot,
                reasons, status, evaluated_at, confirmed_at, rejected_at,
                rejection_reason
         FROM graduation_pending
         WHERE user_id = $1
         ORDER BY evaluated_at DESC
         LIMIT 5`,
        [userId]
      );

      res.json({ user_id: userId, graduation_history: result.rows });
    } catch (err) {
      console.error('[graduation] status error:', err);
      res.status(500).json({ error: 'Failed to fetch graduation status' });
    }
  }
);


// ── Mock graduation evaluation (for USE_MOCKS=true) ───────────────────────
// Simplified version of the Python graduation engine for mock mode.
function mockGraduationEval(payload) {
  const { user, trade_credit_orders, zesco_transactions } = payload;
  const reasons = [];

  const completed = trade_credit_orders.filter(o => o.status === 'paid').length;
  if (completed < 6) {
    reasons.push(`Only ${completed} completed transaction(s), need 6 (${6 - completed} more required)`);
  }

  const accountCreated = new Date(user.created_at);
  const now = new Date();
  const ageMonths = (now - accountCreated) / (30.44 * 24 * 3600 * 1000);
  if (ageMonths < 3) {
    reasons.push(`Account is ${Math.round(ageMonths * 30)} days old (${ageMonths.toFixed(1)} months), need 3 months`);
  }

  const totalTransacted = trade_credit_orders
    .filter(o => o.status === 'paid')
    .reduce((s, o) => s + (o.total_due || o.electricity_amt || 0), 0);
  if (totalTransacted < 200) {
    reasons.push(`Total transacted is ZMW ${totalTransacted.toFixed(2)}, need ZMW 200.00`);
  }

  if (reasons.length > 0) {
    return {
      decision: 'not_yet_eligible',
      reasons,
      estimated_graduation_date: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      criteria_met: { completed_transactions: { value: completed, required: 6, met: completed >= 6 } },
    };
  }

  // Calculate initial credit limit (30% of avg monthly ZESCO spend)
  const monthly = {};
  for (const tx of zesco_transactions) {
    const key = tx.date.slice(0, 7);
    monthly[key] = (monthly[key] || 0) + tx.amount;
  }
  const months = Object.keys(monthly).length || 1;
  const avgMonthly = Object.values(monthly).reduce((a, b) => a + b, 0) / months;
  const limit = Math.max(20, Math.min(500, Math.round(avgMonthly * 0.3 * 100) / 100));

  return {
    decision: 'approved',
    reasons: [],
    initial_credit_limit: limit,
    criteria_met: { completed_transactions: { value: completed, required: 6, met: true } },
  };
}


export default router;
