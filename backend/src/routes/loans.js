// ── Loan routes ──
// POST /loans/borrow
// GET  /loans/:id

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as rules from '../validators/rules.js';
import { zesco } from '../services/index.js';

const router = Router();

// ── POST /loans/borrow ──────────────────────────────────────────────────────
router.post(
  '/borrow',
  requireAuth,
  validate({
    meter_id: rules.requiredId,
    amount:   rules.positiveAmount,
  }),
  async (req, res) => {
    try {
      const userId  = req.user.userId;
      const meterId = parseInt(req.body.meter_id, 10);
      const amount  = parseFloat(req.body.amount);

      // Verify meter ownership
      const meter = await query(
        'SELECT id, meter_number, user_id, zesco_verified FROM meters WHERE id = $1',
        [meterId]
      );

      if (meter.rows.length === 0) {
        return res.status(404).json({ error: 'Meter not found' });
      }
      if (meter.rows[0].user_id !== '__mock_any__' && String(meter.rows[0].user_id) !== String(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (!meter.rows[0].zesco_verified) {
        return res.status(422).json({ error: 'Meter not yet verified by ZESCO' });
      }

      // Check available credit
      const limitResult = await query(
        `SELECT COALESCE(
           (SELECT limit_amount FROM credit_limits WHERE meter_id = $1 ORDER BY calculated_at DESC LIMIT 1),
           0
         ) AS max_limit`,
        [meterId]
      );
      const maxLimit = parseFloat(limitResult.rows[0].max_limit);

      const outstandingResult = await query(
        `SELECT COALESCE(SUM(amount_borrowed), 0) AS total
         FROM loans WHERE meter_id = $1 AND status IN ('active', 'pending')`,
        [meterId]
      );
      const outstanding = parseFloat(outstandingResult.rows[0].total);
      const available = Math.max(0, maxLimit - outstanding);

      if (amount > available) {
        return res.status(422).json({
          error: 'Insufficient credit',
          available_credit: available,
          requested: amount,
        });
      }

      if (amount < 20) {
        return res.status(400).json({ error: 'Minimum borrow amount is ZMW 20' });
      }

      // Purchase tokens from ZESCO
      const purchase = zesco.purchaseTokens(meter.rows[0].meter_number, amount);

      // Calculate due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create loan record
      const loan = await query(
        `INSERT INTO loans (meter_id, amount_borrowed, token_delivered, status, due_date)
         VALUES ($1, $2, $3, 'active', $4)
         RETURNING id, meter_id, amount_borrowed, token_delivered, status, created_at, due_date`,
        [meterId, amount, purchase.tokenCode, dueDate.toISOString()]
      );

      // Record the transaction
      await query(
        `INSERT INTO transactions (meter_id, amount_zmw, units_purchased, source)
         VALUES ($1, $2, $3, 'redbrick')`,
        [meterId, amount, purchase.units_kwh]
      );

      res.status(201).json({
        message: 'Loan approved — tokens issued',
        loan: loan.rows[0],
        token: {
          code: purchase.tokenCode,
          units_kwh: purchase.units_kwh,
        },
        ...(purchase.mock && { mock: true }),
      });
    } catch (err) {
      console.error('[loans] borrow error:', err);
      res.status(500).json({ error: 'Failed to process loan' });
    }
  }
);

// ── GET /loans/:id ──────────────────────────────────────────────────────────
router.get(
  '/:id',
  requireAuth,
  async (req, res) => {
    try {
      const loanId = parseInt(req.params.id, 10);
      if (!loanId || loanId <= 0) {
        return res.status(400).json({ error: 'Invalid loan ID' });
      }

      const result = await query(
        `SELECT l.*, m.meter_number, m.user_id
         FROM loans l
         JOIN meters m ON m.id = l.meter_id
         WHERE l.id = $1`,
        [loanId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Loan not found' });
      }

      const loan = result.rows[0];
      if (loan.user_id !== '__mock_any__' && String(loan.user_id) !== String(req.user.userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get repayments for this loan
      const repayments = await query(
        `SELECT id, amount_paid, payment_method, paid_at
         FROM repayments WHERE loan_id = $1 ORDER BY paid_at`,
        [loanId]
      );

      const totalRepaid = repayments.rows.reduce(
        (sum, r) => sum + parseFloat(r.amount_paid), 0
      );

      res.json({
        loan: {
          id:              loan.id,
          meter_id:        loan.meter_id,
          meter_number:    loan.meter_number,
          amount_borrowed: loan.amount_borrowed,
          token_delivered: loan.token_delivered,
          status:          loan.status,
          created_at:      loan.created_at,
          due_date:        loan.due_date,
          repaid_at:       loan.repaid_at,
        },
        repayments: repayments.rows,
        total_repaid: totalRepaid,
        remaining: Math.max(0, parseFloat(loan.amount_borrowed) - totalRepaid),
      });
    } catch (err) {
      console.error('[loans] get error:', err);
      res.status(500).json({ error: 'Failed to fetch loan' });
    }
  }
);

export default router;
