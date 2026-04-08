// ── Payment countdown & enforcement service ──
// Processes overdue trade credit orders in stages:
//   20h  → reminder SMS
//   24h  → urgent reminder SMS
//   48h  → freeze account, mark defaulted, release float, send notice

import { query } from '../config/db.js';
import { releaseFloat } from './float.js';
import {
  sendReminder20h,
  sendReminder24h,
  sendAccountFrozen,
} from './sms-notify.js';


/**
 * Run a single pass of the payment countdown processor.
 * Call this from a cron job, scheduler, or manual endpoint.
 *
 * @returns {Promise<{ reminders20h: number, reminders24h: number, defaults: number }>}
 */
export async function processPaymentCountdown() {
  const stats = { reminders20h: 0, reminders24h: 0, defaults: 0 };
  const now = new Date();

  // ── Stage 1: 20-hour reminders ─────────────────────────────────────────
  // Orders created 20+ hours ago, not yet reminded, still unpaid
  const remind20Result = await query(
    `SELECT tco.id, tco.user_id, tco.total_due, tco.payment_due_at,
            u.phone_number, u.full_name
     FROM trade_credit_orders tco
     JOIN users u ON u.id = tco.user_id
     WHERE tco.status = 'token_delivered'
       AND tco.reminder_20h_sent = FALSE
       AND tco.created_at <= now() - INTERVAL '20 hours'`
  );

  for (const order of remind20Result.rows) {
    await sendReminder20h(
      order.phone_number,
      order.id,
      parseFloat(order.total_due),
      order.payment_due_at,
      { userId: order.user_id, fullName: order.full_name },
    );

    await query(
      `UPDATE trade_credit_orders SET reminder_20h_sent = TRUE WHERE id = $1`,
      [order.id]
    );

    stats.reminders20h++;
  }

  // ── Stage 2: 24-hour urgent reminders ──────────────────────────────────
  const remind24Result = await query(
    `SELECT tco.id, tco.user_id, tco.total_due,
            u.phone_number, u.full_name
     FROM trade_credit_orders tco
     JOIN users u ON u.id = tco.user_id
     WHERE tco.status = 'token_delivered'
       AND tco.reminder_24h_sent = FALSE
       AND tco.created_at <= now() - INTERVAL '24 hours'`
  );

  for (const order of remind24Result.rows) {
    await sendReminder24h(
      order.phone_number,
      order.id,
      parseFloat(order.total_due),
      { userId: order.user_id, fullName: order.full_name },
    );

    await query(
      `UPDATE trade_credit_orders SET reminder_24h_sent = TRUE WHERE id = $1`,
      [order.id]
    );

    stats.reminders24h++;
  }

  // ── Stage 3: 48-hour default & freeze ──────────────────────────────────
  const defaultResult = await query(
    `SELECT tco.id, tco.user_id, tco.total_due, tco.float_reservation_id,
            u.phone_number, u.full_name
     FROM trade_credit_orders tco
     JOIN users u ON u.id = tco.user_id
     WHERE tco.status = 'token_delivered'
       AND tco.freeze_processed = FALSE
       AND tco.created_at <= now() - INTERVAL '48 hours'`
  );

  for (const order of defaultResult.rows) {
    // Mark order as defaulted
    await query(
      `UPDATE trade_credit_orders
       SET status = 'defaulted', frozen_at = now(), freeze_processed = TRUE
       WHERE id = $1`,
      [order.id]
    );

    // Freeze user account
    await query(
      `UPDATE users SET account_frozen = TRUE WHERE id = $1`,
      [order.user_id]
    );

    // Increment default counter
    await query(
      `UPDATE users
       SET trade_credit_default_count = trade_credit_default_count + 1
       WHERE id = $1`,
      [order.user_id]
    );

    // Release the float reservation (tokens already delivered, but we
    // account for the loss by releasing the hold — the stock is gone
    // but we track that it was not paid for)
    if (order.float_reservation_id) {
      try {
        await releaseFloat(order.float_reservation_id);
      } catch (err) {
        console.error(`[countdown] Failed to release float for order ${order.id}:`, err.message);
      }
    }

    // Send freeze notification (SMS + push)
    await sendAccountFrozen(
      order.phone_number,
      order.id,
      parseFloat(order.total_due),
      { userId: order.user_id, fullName: order.full_name },
    );

    stats.defaults++;
  }

  if (stats.reminders20h || stats.reminders24h || stats.defaults) {
    console.log(`[countdown] Processed: ${stats.reminders20h} 20h reminders, ${stats.reminders24h} 24h reminders, ${stats.defaults} defaults`);
  }

  return stats;
}
