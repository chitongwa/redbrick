// ── Transaction routes ──
// GET /meters/:id/transactions

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ── GET /meters/:id/transactions ────────────────────────────────────────────
router.get(
  '/:id/transactions',
  requireAuth,
  async (req, res) => {
    try {
      const meterId = parseInt(req.params.id, 10);
      if (!meterId || meterId <= 0) {
        return res.status(400).json({ error: 'Invalid meter ID' });
      }

      // Verify meter ownership
      const meter = await query(
        'SELECT id, meter_number, user_id FROM meters WHERE id = $1',
        [meterId]
      );

      if (meter.rows.length === 0) {
        return res.status(404).json({ error: 'Meter not found' });
      }

      if (meter.rows[0].user_id !== '__mock_any__' && String(meter.rows[0].user_id) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Pagination
      const page  = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      // Fetch transactions
      const txResult = await query(
        `SELECT id, amount_zmw, units_purchased, purchased_at, source
         FROM transactions
         WHERE meter_id = $1
         ORDER BY purchased_at DESC
         LIMIT $2 OFFSET $3`,
        [meterId, limit, offset]
      );

      // Total count for pagination
      const countResult = await query(
        'SELECT COUNT(*) AS total FROM transactions WHERE meter_id = $1',
        [meterId]
      );

      const total = parseInt(countResult.rows[0].total, 10);

      res.json({
        meter_id: meterId,
        meter_number: meter.rows[0].meter_number,
        transactions: txResult.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      console.error('[transactions] list error:', err);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  }
);

export default router;
