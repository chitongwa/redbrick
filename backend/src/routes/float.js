// ── Float management routes ──
// GET  /float/balance       — Current float status + alerts
// POST /float/purchase      — Record a new bulk ZESCO purchase
// GET  /float/inventory     — List all float batches
// GET  /float/transactions  — Audit trail of all float movements

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as rules from '../validators/rules.js';
import { getFloatBalance } from '../services/float.js';

const router = Router();

// ── GET /float/balance ─────────────────────────────────────────────────────
// Returns total units remaining, ZMW value at cost, estimated days of stock,
// and alert level (LOW / CRITICAL / null).
router.get(
  '/balance',
  requireAuth,
  async (_req, res) => {
    try {
      const balance = await getFloatBalance();
      res.json(balance);
    } catch (err) {
      console.error('[float] balance error:', err);
      res.status(500).json({ error: 'Failed to fetch float balance' });
    }
  }
);

// ── POST /float/purchase ───────────────────────────────────────────────────
// Record a new bulk ZESCO electricity purchase into float inventory.
router.post(
  '/purchase',
  requireAuth,
  validate({
    units_purchased: rules.positiveAmount,
    amount_paid_zmw: rules.positiveAmount,
  }),
  async (req, res) => {
    try {
      const unitsPurchased = parseFloat(req.body.units_purchased);
      const amountPaid     = parseFloat(req.body.amount_paid_zmw);
      const reference      = req.body.purchase_reference || null;
      const purchaseDate   = req.body.purchase_date || new Date().toISOString();

      // Calculate unit cost
      const unitCost = Math.round((amountPaid / unitsPurchased) * 10000) / 10000;

      // Insert into float_inventory
      const result = await query(
        `INSERT INTO float_inventory
           (purchase_date, units_purchased, amount_paid_zmw, unit_cost_zmw,
            units_remaining, purchase_reference)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, purchase_date, units_purchased, amount_paid_zmw,
                   unit_cost_zmw, units_remaining, purchase_reference, created_at`,
        [purchaseDate, unitsPurchased, amountPaid, unitCost, unitsPurchased, reference]
      );

      const batch = result.rows[0];

      // Record as a float_transaction (purchase = positive units)
      await query(
        `INSERT INTO float_transactions
           (float_id, transaction_type, units, amount_zmw, note)
         VALUES ($1, 'purchase', $2, $3, $4)`,
        [batch.id, unitsPurchased, amountPaid, `Bulk ZESCO purchase — ref: ${reference || 'N/A'}`]
      );

      // Return current balance after purchase
      const balance = await getFloatBalance();

      res.status(201).json({
        message: 'Float purchase recorded',
        batch,
        float_balance: balance,
      });
    } catch (err) {
      console.error('[float] purchase error:', err);
      res.status(500).json({ error: 'Failed to record float purchase' });
    }
  }
);

// ── GET /float/inventory ───────────────────────────────────────────────────
// List all float inventory batches (most recent first).
router.get(
  '/inventory',
  requireAuth,
  async (req, res) => {
    try {
      const page   = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const result = await query(
        `SELECT id, purchase_date, units_purchased, amount_paid_zmw,
                unit_cost_zmw, units_remaining, purchase_reference, created_at
         FROM float_inventory
         ORDER BY purchase_date DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      const countResult = await query(
        'SELECT COUNT(*) AS total FROM float_inventory'
      );
      const total = parseInt(countResult.rows[0].total, 10);

      res.json({
        inventory: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('[float] inventory error:', err);
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  }
);

// ── GET /float/transactions ────────────────────────────────────────────────
// Audit trail of all float movements (purchases, sales, adjustments).
router.get(
  '/transactions',
  requireAuth,
  async (req, res) => {
    try {
      const page   = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;
      const type   = req.query.type; // optional filter: purchase | sale | adjustment

      let sql = `SELECT id, float_id, transaction_type, units, amount_zmw,
                        user_id, note, created_at
                 FROM float_transactions`;
      const params = [];

      if (type && ['purchase', 'sale', 'adjustment'].includes(type)) {
        sql += ' WHERE transaction_type = $1';
        params.push(type);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await query(sql, params);

      // Count
      let countSql = 'SELECT COUNT(*) AS total FROM float_transactions';
      const countParams = [];
      if (type && ['purchase', 'sale', 'adjustment'].includes(type)) {
        countSql += ' WHERE transaction_type = $1';
        countParams.push(type);
      }
      const countResult = await query(countSql, countParams);
      const total = parseInt(countResult.rows[0].total, 10);

      res.json({
        transactions: result.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('[float] transactions error:', err);
      res.status(500).json({ error: 'Failed to fetch float transactions' });
    }
  }
);

export default router;
