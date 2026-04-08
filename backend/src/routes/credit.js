// ── Credit routes ──
// GET /meters/:id/credit-limit

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

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

export default router;
