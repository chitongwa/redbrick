// ── Payment countdown enforcement routes ──
// POST /countdown/process   — Run one pass of the payment countdown worker
// GET  /countdown/overdue   — List overdue orders (admin view)

import { Router } from 'express';
import { query } from '../config/db.js';
import { processPaymentCountdown } from '../services/payment-countdown.js';
import { processLoanReminders }    from '../services/loan-reminders.js';

const router = Router();

// ── POST /countdown/process ────────────────────────────────────────────────
// Trigger one pass of BOTH countdown workers:
//   - trade credit payment countdown (20h / 24h / 48h)
//   - loan due-date reminders (3 days before due)
// In production this would be called by a cron job every 5–10 minutes.
// For demo / Vercel, it can be called manually or via a scheduled function.
router.post('/process', async (_req, res) => {
  try {
    const [countdownStats, loanStats] = await Promise.all([
      processPaymentCountdown(),
      processLoanReminders(),
    ]);
    res.json({
      message: 'Countdown processing complete',
      stats: { ...countdownStats, ...loanStats },
    });
  } catch (err) {
    console.error('[countdown] process error:', err);
    res.status(500).json({ error: 'Failed to process countdown' });
  }
});

// ── GET /countdown/overdue ─────────────────────────────────────────────────
// Admin view of orders approaching or past their payment deadline.
router.get('/overdue', async (_req, res) => {
  try {
    const result = await query(
      `SELECT tco.id, tco.user_id, tco.total_due, tco.status,
              tco.payment_due_at, tco.created_at,
              tco.reminder_20h_sent, tco.reminder_24h_sent, tco.freeze_processed,
              u.full_name, u.phone_number
       FROM trade_credit_orders tco
       JOIN users u ON u.id = tco.user_id
       WHERE tco.status IN ('token_delivered', 'defaulted')
       ORDER BY tco.created_at ASC`
    );

    res.json({
      overdue_orders: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error('[countdown] overdue error:', err);
    res.status(500).json({ error: 'Failed to fetch overdue orders' });
  }
});

export default router;
