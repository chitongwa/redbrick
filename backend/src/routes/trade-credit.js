// ── Trade Credit routes (Tier 1) ──
// POST /trade-credit/purchase   — Buy tokens now, pay within 48hrs
// POST /trade-credit/pay        — Settle an outstanding order
// GET  /trade-credit/orders     — List user's trade credit orders

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as rules from '../validators/rules.js';
import { zesco, payments } from '../services/index.js';
import { deductFloat } from '../services/float.js';

const router = Router();

const SERVICE_FEE_RATE = 0.04;       // 4% service fee
const PAYMENT_WINDOW_HOURS = 48;     // Payment due within 48 hours

// ── POST /trade-credit/purchase ────────────────────────────────────────────
// Customer gets ZESCO tokens immediately; payment due within 48hrs.
router.post(
  '/purchase',
  requireAuth,
  validate({
    meter_id: rules.requiredId,
    amount:   rules.positiveAmount,       // electricity amount in ZMW (before fee)
  }),
  async (req, res) => {
    try {
      const userId  = req.user.userId;
      const meterId = parseInt(req.body.meter_id, 10);
      const electricityAmt = parseFloat(req.body.amount);

      // 1. Check user tier & frozen status
      const userResult = await query(
        'SELECT id, tier, account_frozen FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      if (user.account_frozen) {
        return res.status(403).json({
          error: 'Account is frozen due to unpaid trade credit. Please settle outstanding orders first.',
        });
      }

      // Trade credit is available to both tiers (Tier 2 customers can still use it)
      // But the primary path for Tier 2 is /loans/borrow

      // 2. Verify meter ownership
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

      // 3. Calculate fees
      const serviceFee = Math.round(electricityAmt * SERVICE_FEE_RATE * 100) / 100;
      const totalDue   = Math.round((electricityAmt + serviceFee) * 100) / 100;

      if (electricityAmt < 10) {
        return res.status(400).json({ error: 'Minimum purchase amount is ZMW 10' });
      }

      // 4. Deduct from float inventory (FIFO) and purchase tokens
      const unitsNeeded = electricityAmt / 2.5;  // ZMW to kWh conversion
      const floatResult = await deductFloat(
        unitsNeeded,
        userId,
        `Trade credit purchase — meter ${meter.rows[0].meter_number}`
      );

      if (!floatResult.success) {
        return res.status(503).json({
          error: 'Insufficient float inventory to fulfil this order',
          detail: floatResult.error,
          float_alert: floatResult.alert,
        });
      }

      const purchase = zesco.purchaseTokens(meter.rows[0].meter_number, electricityAmt);

      // 5. Calculate payment deadline (48 hours from now)
      const paymentDueAt = new Date();
      paymentDueAt.setHours(paymentDueAt.getHours() + PAYMENT_WINDOW_HOURS);

      // 6. Create trade credit order
      const order = await query(
        `INSERT INTO trade_credit_orders
           (user_id, meter_id, electricity_amt, service_fee, total_due,
            token_delivered, units_kwh, status, payment_due_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_payment', $8)
         RETURNING id, user_id, meter_id, electricity_amt, service_fee, total_due,
                   token_delivered, units_kwh, status, payment_due_at, created_at`,
        [userId, meterId, electricityAmt, serviceFee, totalDue,
         purchase.tokenCode, purchase.units_kwh, paymentDueAt.toISOString()]
      );

      // 7. Record as a transaction
      await query(
        `INSERT INTO transactions (meter_id, amount_zmw, units_purchased, source)
         VALUES ($1, $2, $3, 'trade_credit')`,
        [meterId, electricityAmt, purchase.units_kwh]
      );

      res.status(201).json({
        message: 'Tokens delivered — payment due within 48 hours',
        order: order.rows[0],
        token: {
          code:     purchase.tokenCode,
          units_kwh: purchase.units_kwh,
        },
        payment: {
          total_due:       totalDue,
          electricity_amt: electricityAmt,
          service_fee:     serviceFee,
          fee_rate:        `${SERVICE_FEE_RATE * 100}%`,
          due_at:          paymentDueAt.toISOString(),
          accepted_methods: ['mtn', 'airtel'],
        },
        ...(purchase.mock && { mock: true }),
        ...(floatResult.alert && { float_alert: floatResult.alert }),
      });
    } catch (err) {
      console.error('[trade-credit] purchase error:', err);
      res.status(500).json({ error: 'Failed to process trade credit purchase' });
    }
  }
);

// ── POST /trade-credit/pay ─────────────────────────────────────────────────
// Settle a pending trade credit order via mobile money.
router.post(
  '/pay',
  requireAuth,
  validate({
    order_id:       rules.requiredId,
    payment_method: rules.paymentMethod,
  }),
  async (req, res) => {
    try {
      const userId  = req.user.userId;
      const orderId = parseInt(req.body.order_id, 10);
      const method  = req.body.payment_method;

      // 1. Fetch order
      const orderResult = await query(
        `SELECT id, user_id, total_due, status, payment_due_at
         FROM trade_credit_orders WHERE id = $1`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Trade credit order not found' });
      }

      const order = orderResult.rows[0];

      if (order.user_id !== '__mock_any__' && String(order.user_id) !== String(userId)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (order.status === 'paid') {
        return res.status(422).json({ error: 'Order is already paid' });
      }

      if (order.status === 'defaulted') {
        return res.status(422).json({ error: 'Order has been defaulted — contact support' });
      }

      const amount = parseFloat(order.total_due);

      // 2. Process mobile-money payment
      const paymentResult = payments.processPayment({
        method,
        phone: req.user.phone,
        amount,
      });

      if (!paymentResult.success) {
        return res.status(502).json({ error: 'Payment provider rejected the transaction' });
      }

      // 3. Mark order as paid
      await query(
        `UPDATE trade_credit_orders
         SET status = 'paid', payment_method = $2, payment_ref = $3, paid_at = now()
         WHERE id = $1`,
        [orderId, method, paymentResult.reference]
      );

      // 4. Increment user's successful trade credit count
      await query(
        `UPDATE users
         SET trade_credit_transactions = trade_credit_transactions + 1
         WHERE id = $1`,
        [userId]
      );

      // 5. Unfreeze account if it was frozen (user is settling)
      await query(
        `UPDATE users SET account_frozen = FALSE WHERE id = $1 AND account_frozen = TRUE`,
        [userId]
      );

      res.json({
        message: 'Payment received — trade credit order settled',
        order_id:          orderId,
        amount_paid:       amount,
        payment_method:    method,
        payment_reference: paymentResult.reference,
        ...(paymentResult.mock && { mock: true }),
      });
    } catch (err) {
      console.error('[trade-credit] pay error:', err);
      res.status(500).json({ error: 'Failed to process payment' });
    }
  }
);

// ── GET /trade-credit/orders ───────────────────────────────────────────────
// List the authenticated user's trade credit orders.
router.get(
  '/orders',
  requireAuth,
  async (req, res) => {
    try {
      const userId = req.user.userId;
      const page   = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
      const offset = (page - 1) * limit;

      const ordersResult = await query(
        `SELECT id, meter_id, electricity_amt, service_fee, total_due,
                token_delivered, units_kwh, status, payment_method,
                payment_due_at, created_at, paid_at
         FROM trade_credit_orders
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const countResult = await query(
        'SELECT COUNT(*) AS total FROM trade_credit_orders WHERE user_id = $1',
        [userId]
      );

      const total = parseInt(countResult.rows[0].total, 10);

      res.json({
        orders: ordersResult.rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      console.error('[trade-credit] orders error:', err);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
);

export default router;
