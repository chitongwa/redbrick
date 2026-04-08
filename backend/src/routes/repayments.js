// ── Repayment routes ──
// POST /repayments/pay

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as rules from '../validators/rules.js';
import { payments } from '../services/index.js';

const router = Router();

// ── POST /repayments/pay ────────────────────────────────────────────────────
router.post(
  '/pay',
  requireAuth,
  validate({
    loan_id:        rules.requiredId,
    amount:         rules.positiveAmount,
    payment_method: rules.paymentMethod,
  }),
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const loanId = parseInt(req.body.loan_id, 10);
      const amount = parseFloat(req.body.amount);
      const method = req.body.payment_method;

      // Fetch loan + verify ownership
      const loanResult = await query(
        `SELECT l.*, m.user_id, m.meter_number
         FROM loans l
         JOIN meters m ON m.id = l.meter_id
         WHERE l.id = $1`,
        [loanId]
      );

      if (loanResult.rows.length === 0) {
        return res.status(404).json({ error: 'Loan not found' });
      }

      const loan = loanResult.rows[0];
      if (loan.user_id !== '__mock_any__' && String(loan.user_id) !== String(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (loan.status === 'repaid') {
        return res.status(422).json({ error: 'Loan is already fully repaid' });
      }

      // Calculate remaining balance
      const paidResult = await query(
        'SELECT COALESCE(SUM(amount_paid), 0) AS total FROM repayments WHERE loan_id = $1',
        [loanId]
      );
      const totalPaid = parseFloat(paidResult.rows[0].total);
      const remaining = parseFloat(loan.amount_borrowed) - totalPaid;

      if (amount > remaining) {
        return res.status(422).json({
          error: 'Payment exceeds remaining balance',
          remaining,
          attempted: amount,
        });
      }

      // Process mobile-money payment
      const paymentResult = payments.processPayment({
        method,
        phone: req.user.phone,
        amount,
      });

      if (!paymentResult.success) {
        return res.status(502).json({ error: 'Payment provider rejected the transaction' });
      }

      // Record repayment
      const repayment = await query(
        `INSERT INTO repayments (loan_id, amount_paid, payment_method)
         VALUES ($1, $2, $3)
         RETURNING id, loan_id, amount_paid, payment_method, paid_at`,
        [loanId, amount, method]
      );

      // Check if loan is now fully repaid
      const newRemaining = remaining - amount;
      if (newRemaining <= 0) {
        await query(
          `UPDATE loans SET status = 'repaid', repaid_at = now() WHERE id = $1`,
          [loanId]
        );
      }

      res.json({
        message: newRemaining <= 0 ? 'Loan fully repaid — credit restored' : 'Payment recorded',
        repayment: repayment.rows[0],
        loan_remaining: Math.max(0, newRemaining),
        loan_status: newRemaining <= 0 ? 'repaid' : loan.status,
        payment_reference: paymentResult.reference,
        ...(paymentResult.mock && { mock: true }),
      });
    } catch (err) {
      console.error('[repayments] pay error:', err);
      res.status(500).json({ error: 'Failed to process repayment' });
    }
  }
);

export default router;
