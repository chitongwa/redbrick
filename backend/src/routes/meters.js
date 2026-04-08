// ── Meter routes ──
// POST /meters/add
// GET  /meters/:id/balance

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as rules from '../validators/rules.js';
import { zesco } from '../services/index.js';

const router = Router();

// ── POST /meters/add ────────────────────────────────────────────────────────
router.post(
  '/add',
  requireAuth,
  validate({ meter_number: rules.meterNumber }),
  async (req, res) => {
    try {
      const meterNumber = req.body.meter_number;
      const userId = req.user.userId;

      // Check if meter already exists
      const existing = await query(
        'SELECT id, user_id FROM meters WHERE meter_number = $1',
        [meterNumber]
      );

      if (existing.rows.length > 0) {
        const owner = existing.rows[0];
        if (String(owner.user_id) === String(userId)) {
          return res.status(409).json({ error: 'Meter already linked to your account' });
        }
        return res.status(409).json({ error: 'Meter is registered to another user' });
      }

      // Verify with ZESCO
      const verification = zesco.verifyMeter(meterNumber);
      if (!verification.verified) {
        return res.status(422).json({ error: 'ZESCO could not verify this meter number' });
      }

      // Insert meter
      const insert = await query(
        `INSERT INTO meters (user_id, meter_number, zesco_verified)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, meter_number, zesco_verified, added_at`,
        [userId, meterNumber, verification.verified]
      );

      res.status(201).json({
        message: 'Meter added successfully',
        meter: insert.rows[0],
        ...(verification.mock && { mock: true }),
      });
    } catch (err) {
      console.error('[meters] add error:', err);
      res.status(500).json({ error: 'Failed to add meter' });
    }
  }
);

// ── GET /meters/:id/balance ─────────────────────────────────────────────────
router.get(
  '/:id/balance',
  requireAuth,
  async (req, res) => {
    try {
      const meterId = parseInt(req.params.id, 10);
      if (!meterId || meterId <= 0) {
        return res.status(400).json({ error: 'Invalid meter ID' });
      }

      // Verify meter belongs to user
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

      const balance = zesco.getBalance(meter.rows[0].meter_number);

      res.json({
        meter_id: meterId,
        meter_number: meter.rows[0].meter_number,
        ...balance,
      });
    } catch (err) {
      console.error('[meters] balance error:', err);
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  }
);

export default router;
