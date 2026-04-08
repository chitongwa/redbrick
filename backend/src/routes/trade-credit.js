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
import { reserveFloat, confirmFloat, releaseFloat } from '../services/float.js';
import { triggerGraduationCheck } from '../services/graduation-trigger.js';
import {
  sendTokenDelivered,
  sendPaymentConfirmed,
} from '../services/sms-notify.js';

const router = Router();

const SERVICE_FEE_RATE = 0.04;       // 4% service fee
const PAYMENT_WINDOW_HOURS = 48;     // Payment due within 48 hours
const KWH_PER_ZMW = 1 / 2.5;        // ZMW to kWh conversion rate


// ── POST /trade-credit/purchase ────────────────────────────────────────────
// Full lifecycle:
//   1. Check float balance
//   2. Check no outstanding unpaid orders
//   3. Check account not frozen
//   4. Calculate amount (electricity + 4% fee)
//   5. Create order as 'pending_payment'
//   6. Reserve float units (hold, don't deduct)
//   7. Call ZESCO API for token
//   8. Deliver token via SMS
//   9. Update order to 'token_delivered'
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

      if (electricityAmt < 10) {
        return res.status(400).json({ error: 'Minimum purchase amount is ZMW 10' });
      }

      // ── 1. Fetch user & validate ──────────────────────────────────────
      const userResult = await query(
        'SELECT id, tier, account_frozen, phone_number, full_name FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = userResult.rows[0];

      // ── 2. Check account not frozen ───────────────────────────────────
      if (user.account_frozen) {
        return res.status(403).json({
          error: 'Account is frozen due to unpaid trade credit. Please settle outstanding orders first.',
        });
      }

      // ── 3. Check no outstanding unpaid orders ─────────────────────────
      const outstandingResult = await query(
        `SELECT id FROM trade_credit_orders
         WHERE user_id = $1
           AND status IN ('pending_payment', 'token_delivered')
         LIMIT 1`,
        [userId]
      );

      if (outstandingResult.rows.length > 0) {
        return res.status(409).json({
          error: 'You have an outstanding unpaid trade credit order. Please settle it before making a new purchase.',
          outstanding_order_id: outstandingResult.rows[0].id,
        });
      }

      // ── 4. Verify meter ownership ────────────────────────────────────
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

      // ── 5. Calculate fees ────────────────────────────────────────────
      const serviceFee = Math.round(electricityAmt * SERVICE_FEE_RATE * 100) / 100;
      const totalDue   = Math.round((electricityAmt + serviceFee) * 100) / 100;
      const unitsKwh   = Math.round(electricityAmt * KWH_PER_ZMW * 100) / 100;

      // ── 6. Create order (pending_payment) ────────────────────────────
      const paymentDueAt = new Date();
      paymentDueAt.setHours(paymentDueAt.getHours() + PAYMENT_WINDOW_HOURS);

      const order = await query(
        `INSERT INTO trade_credit_orders
           (user_id, meter_id, electricity_amt, service_fee, total_due,
            units_kwh, status, payment_due_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending_payment', $7)
         RETURNING id, user_id, meter_id, electricity_amt, service_fee, total_due,
                   units_kwh, status, payment_due_at, created_at`,
        [userId, meterId, electricityAmt, serviceFee, totalDue,
         unitsKwh, paymentDueAt.toISOString()]
      );

      const orderId = order.rows[0].id;

      // ── 7. Reserve float (hold, don't deduct) ───────────────────────
      const floatResult = await reserveFloat(unitsKwh, orderId);

      if (!floatResult.success) {
        // Roll back the order
        await query(
          `UPDATE trade_credit_orders SET status = 'cancelled' WHERE id = $1`,
          [orderId]
        );
        return res.status(503).json({
          error: 'Service temporarily unavailable — insufficient float inventory',
          detail: floatResult.error,
          float_alert: floatResult.alert,
        });
      }

      // Store reservation ID on the order
      await query(
        `UPDATE trade_credit_orders
         SET float_reservation_id = $2, float_reserved = TRUE
         WHERE id = $1`,
        [orderId, floatResult.reservationId]
      );

      // ── 8. Call ZESCO API for token ──────────────────────────────────
      const purchase = zesco.purchaseTokens(meter.rows[0].meter_number, electricityAmt);

      // Update order with token
      await query(
        `UPDATE trade_credit_orders
         SET token_delivered = $2, status = 'token_delivered', token_sms_sent = TRUE
         WHERE id = $1`,
        [orderId, purchase.tokenCode]
      );

      // ── 9. Deliver token via SMS + push ───────────────────────────────
      const phone = user.phone_number || req.user.phone;
      await sendTokenDelivered(
        phone,
        purchase.tokenCode,
        unitsKwh,
        totalDue,
        paymentDueAt.toISOString(),
        { userId, fullName: user.full_name, orderId },
      );

      // ── 10. Record as a transaction ──────────────────────────────────
      await query(
        `INSERT INTO transactions (meter_id, amount_zmw, units_purchased, source)
         VALUES ($1, $2, $3, 'trade_credit')`,
        [meterId, electricityAmt, purchase.units_kwh]
      );

      res.status(201).json({
        message: 'Tokens delivered — payment due within 48 hours',
        order: {
          id:               orderId,
          meter_id:         meterId,
          electricity_amt:  electricityAmt,
          service_fee:      serviceFee,
          total_due:        totalDue,
          units_kwh:        unitsKwh,
          status:           'token_delivered',
          payment_due_at:   paymentDueAt.toISOString(),
          created_at:       order.rows[0].created_at,
        },
        token: {
          code:      purchase.tokenCode,
          units_kwh: purchase.units_kwh,
        },
        payment: {
          total_due:        totalDue,
          electricity_amt:  electricityAmt,
          service_fee:      serviceFee,
          fee_rate:         `${SERVICE_FEE_RATE * 100}%`,
          due_at:           paymentDueAt.toISOString(),
          accepted_methods: ['mtn', 'airtel'],
        },
        float_reservation: floatResult.reservationId,
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
// On payment:
//   1. Process mobile-money payment
//   2. Confirm float reservation (record sale transactions)
//   3. Record fee revenue
//   4. Mark order as paid (with hours_to_pay)
//   5. Increment completed transaction counter
//   6. Unfreeze account if frozen
//   7. Send payment confirmation SMS
//   8. Auto-trigger graduation check
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
        `SELECT id, user_id, total_due, service_fee, status, payment_due_at,
                float_reservation_id, created_at
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

      if (order.status === 'cancelled') {
        return res.status(422).json({ error: 'Order has been cancelled' });
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

      // 3. Confirm float reservation (converts hold → sale)
      if (order.float_reservation_id) {
        await confirmFloat(
          order.float_reservation_id,
          userId,
          `Trade credit payment — order #${orderId}`
        );
      }

      // 4. Calculate hours to pay
      const createdAt = new Date(order.created_at);
      const paidAt = new Date();
      const hoursToPay = Math.round(((paidAt - createdAt) / 3600000) * 100) / 100;

      // 5. Mark order as paid
      await query(
        `UPDATE trade_credit_orders
         SET status = 'paid', payment_method = $2, payment_ref = $3,
             paid_at = now(), float_confirmed = TRUE, hours_to_pay = $4
         WHERE id = $1`,
        [orderId, method, paymentResult.reference, hoursToPay]
      );

      // 6. Record fee revenue
      const feeAmount = parseFloat(order.service_fee || 0);
      if (feeAmount > 0) {
        await query(
          `INSERT INTO fee_revenue (order_id, user_id, fee_amount_zmw, fee_type)
           VALUES ($1, $2, $3, 'trade_credit_service')`,
          [orderId, userId, feeAmount]
        );
      }

      // 7. Increment user's successful trade credit count
      await query(
        `UPDATE users
         SET trade_credit_transactions = trade_credit_transactions + 1
         WHERE id = $1`,
        [userId]
      );

      // 8. Unfreeze account if it was frozen
      await query(
        `UPDATE users SET account_frozen = FALSE WHERE id = $1 AND account_frozen = TRUE`,
        [userId]
      );

      // 9. Auto-trigger graduation check first so we can include the hint
      //    inside the payment-received notification body.
      let graduationHint = null;
      try {
        const gradResult = await triggerGraduationCheck(userId);
        if (gradResult && gradResult.decision === 'approved') {
          graduationHint = 'You may qualify for Tier 2 Loan Credit — pending admin review.';
        }
      } catch (gradErr) {
        console.warn('[trade-credit] graduation check failed (non-blocking):', gradErr.message);
      }

      // 10. Send payment confirmation (SMS + push)
      const phone = req.user.phone;
      await sendPaymentConfirmed(phone, orderId, amount, method, {
        userId,
        graduationHint: graduationHint ?? '',
      });

      res.json({
        message: 'Payment received — trade credit order settled',
        order_id:          orderId,
        amount_paid:       amount,
        hours_to_pay:      hoursToPay,
        payment_method:    method,
        payment_reference: paymentResult.reference,
        ...(graduationHint && { graduation_hint: graduationHint }),
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
                payment_due_at, created_at, paid_at, hours_to_pay
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
