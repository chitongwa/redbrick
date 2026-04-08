// ── Loan due-date reminder service ──
// Sends the "your loan is due in 3 days" notification to Tier 2 customers.
// Call this from a daily cron job (or manually via /countdown/process).

import { query } from '../config/db.js';
import { sendLoanDue3d } from './sms-notify.js';

/**
 * Run one pass of the loan reminder processor.
 *
 * Picks up every active loan whose due_date is 3 calendar days from now
 * (with a ±12 hour window so a once-daily cron definitely catches it) and
 * hasn't already received the reminder, then dispatches SMS + push.
 *
 * The `loans` table is assumed to have a boolean `reminder_3d_sent` column
 * — we flip it true after sending so the cron is idempotent.
 *
 * @returns {Promise<{ reminders3d: number }>}
 */
export async function processLoanReminders() {
  const stats = { reminders3d: 0 };

  // Orders where the due date is 3 days out (give or take 12h)
  const result = await query(
    `SELECT l.id, l.amount_borrowed, l.due_date, m.user_id,
            u.phone_number, u.full_name
     FROM loans l
     JOIN meters m ON m.id = l.meter_id
     JOIN users  u ON u.id = m.user_id
     WHERE l.status = 'active'
       AND COALESCE(l.reminder_3d_sent, FALSE) = FALSE
       AND l.due_date BETWEEN now() + INTERVAL '2 days 12 hours'
                          AND now() + INTERVAL '3 days 12 hours'`
  );

  for (const loan of result.rows) {
    try {
      await sendLoanDue3d(
        loan.phone_number,
        loan.id,
        parseFloat(loan.amount_borrowed),
        loan.due_date,
        { userId: loan.user_id, fullName: loan.full_name },
      );

      await query(
        `UPDATE loans SET reminder_3d_sent = TRUE WHERE id = $1`,
        [loan.id]
      );

      stats.reminders3d++;
    } catch (err) {
      console.error(`[loan-reminders] Failed for loan ${loan.id}:`, err.message);
    }
  }

  if (stats.reminders3d) {
    console.log(`[loan-reminders] Sent ${stats.reminders3d} 3-day loan reminders`);
  }

  return stats;
}
