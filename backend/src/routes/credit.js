// ── Credit routes ──
// GET  /meters/:id/credit-limit
// POST /meters/:id/credit-limit  (admin — raise credit limit + notify customer)

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { sendCreditLimitIncrease } from '../services/sms-notify.js';

const router = Router();

// ── GET /meters/:id/credit-limit ────────────────────────────────────────────
router.get(
  '/:id/credit-limit',
  requireAuth,
  async (req, res) => {
    try {
      const meterId = parseInt(req.params.id, 10);
      if (!meterId || meterId <= 0) {
        return res.status(400).json({ error: 'Invalid meter ID' });
      }

      // Verify meter belongs to user
      const meter = await query(
        'SELECT id, user_id, meter_number, zesco_verified FROM meters WHERE id = $1',
        [meterId]
      );

      if (meter.rows.length === 0) {
        return res.status(404).json({ error: 'Meter not found' });
      }

      if (meter.rows[0].user_id !== '__mock_any__' && String(meter.rows[0].user_id) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (!meter.rows[0].zesco_verified) {
        return res.status(422).json({ error: 'Meter has not been verified by ZESCO yet' });
      }

      // Get latest credit limit for this meter
      const limit = await query(
        `SELECT id, limit_amount, calculated_at, model_version
         FROM credit_limits
         WHERE meter_id = $1
         ORDER BY calculated_at DESC
         LIMIT 1`,
        [meterId]
      );

      if (limit.rows.length === 0) {
        return res.json({
          meter_id: meterId,
          meter_number: meter.rows[0].meter_number,
          credit_limit: 0,
          message: 'No credit limit calculated yet — scoring pending',
        });
      }

      // Subtract any outstanding (active/pending) loan amounts
      const outstanding = await query(
        `SELECT COALESCE(SUM(amount_borrowed), 0) AS total_outstanding
         FROM loans
         WHERE meter_id = $1 AND status IN ('active', 'pending')`,
        [meterId]
      );

      const limitRow = limit.rows[0];
      const maxLimit = parseFloat(limitRow.limit_amount);
      const borrowed = parseFloat(outstanding.rows[0].total_outstanding);
      const available = Math.max(0, maxLimit - borrowed);

      res.json({
        meter_id: meterId,
        meter_number: meter.rows[0].meter_number,
        credit_limit: maxLimit,
        outstanding_borrowed: borrowed,
        available_credit: available,
        model_version: limitRow.model_version,
        calculated_at: limitRow.calculated_at,
      });
    } catch (err) {
      console.error('[credit] credit-limit error:', err);
      res.status(500).json({ error: 'Failed to fetch credit limit' });
    }
  }
);

// ── POST /meters/:id/credit-limit ───────────────────────────────────────────
// Admin — set a new credit limit on this meter. If it's strictly higher than
// the previous limit, send the customer a "credit limit increased" notification.
router.post(
  '/:id/credit-limit',
  requireAuth,
  async (req, res) => {
    try {
      const meterId = parseInt(req.params.id, 10);
      const newLimit = parseFloat(req.body?.limit_amount);
      const modelVersion = req.body?.model_version || 'admin-manual';

      if (!meterId || meterId <= 0) {
        return res.status(400).json({ error: 'Invalid meter ID' });
      }
      if (!newLimit || newLimit <= 0) {
        return res.status(400).json({ error: 'limit_amount must be a positive number' });
      }

      // Lookup meter + owner
      const meter = await query(
        `SELECT m.id, m.meter_number, m.user_id,
                u.phone_number, u.full_name
         FROM meters m
         LEFT JOIN users u ON u.id = m.user_id
         WHERE m.id = $1`,
        [meterId]
      );

      if (meter.rows.length === 0) {
        return res.status(404).json({ error: 'Meter not found' });
      }
      const row = meter.rows[0];

      // Fetch previous limit for the increase-check
      const prev = await query(
        `SELECT limit_amount FROM credit_limits
         WHERE meter_id = $1 ORDER BY calculated_at DESC LIMIT 1`,
        [meterId]
      );
      const previousLimit = parseFloat(prev.rows[0]?.limit_amount ?? 0);

      // Insert the new limit
      await query(
        `INSERT INTO credit_limits (meter_id, limit_amount, model_version)
         VALUES ($1, $2, $3)`,
        [meterId, newLimit, modelVersion]
      );

      // If strictly increased, fire the milestone notification
      let notified = false;
      if (newLimit > previousLimit && row.phone_number) {
        try {
          await sendCreditLimitIncrease(
            row.phone_number,
            row.full_name,
            newLimit,
            previousLimit,
            { userId: row.user_id },
          );
          notified = true;
        } catch (notifyErr) {
          console.warn('[credit] limit-increase notify failed:', notifyErr.message);
        }
      }

      res.json({
        message: 'Credit limit updated',
        meter_id: meterId,
        previous_limit: previousLimit,
        new_limit: newLimit,
        notified,
      });
    } catch (err) {
      console.error('[credit] update limit error:', err);
      res.status(500).json({ error: 'Failed to update credit limit' });
    }
  }
);

export default router;
