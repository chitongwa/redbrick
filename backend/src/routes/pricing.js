// ── Pricing routes ──
// POST /pricing/calculate         — Full cost breakdown for a tier + amount
// GET  /pricing/preview/:amount   — Quick preview (no auth required for demo)
// GET  /pricing/preview/:amount/:user_id — Personalised preview with credit info
// GET  /pricing/margin            — Blended margin report (admin)
// GET  /pricing/settings          — View all pricing settings (admin)
// PUT  /pricing/settings/:key     — Update a pricing setting (admin)

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  calculateTradeCredit,
  calculateLoanCredit,
  getMarginReport,
} from '../services/pricing.js';
import {
  getAllSettings,
  updateSetting,
  getPricingConfig,
} from '../services/settings.js';

const router = Router();


// ── POST /pricing/calculate ────────────────────────────────────────────────
// Accepts { tier, amount, user_id? } and returns full cost breakdown.
router.post('/calculate', async (req, res) => {
  try {
    const { tier, amount, user_id } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const amountZmw = parseFloat(amount);

    // ── Tier 1 — Trade Credit ───────────────────────────────────────────
    if (!tier || tier === 'trade_credit') {
      const pricing = await calculateTradeCredit(amountZmw);
      return res.json(pricing);
    }

    // ── Tier 2 — Loan Credit ────────────────────────────────────────────
    if (tier === 'loan_credit') {
      let userInfo = {};

      // If user_id provided, fetch credit info
      if (user_id) {
        const userResult = await query(
          'SELECT id, tier FROM users WHERE id = $1',
          [user_id]
        );

        if (userResult.rows.length > 0 && userResult.rows[0].tier === 'loan_credit') {
          // Get credit limit from most recent meter
          const limitResult = await query(
            `SELECT COALESCE(MAX(cl.limit_amount), 0) AS credit_limit
             FROM credit_limits cl
             JOIN meters m ON m.id = cl.meter_id
             WHERE m.user_id = $1`,
            [user_id]
          );

          const creditLimit = parseFloat(limitResult.rows[0].credit_limit);

          // Get outstanding loan balance
          const outstandingResult = await query(
            `SELECT COALESCE(SUM(amount_borrowed), 0) AS total
             FROM loans
             WHERE meter_id IN (SELECT id FROM meters WHERE user_id = $1)
               AND status IN ('active', 'pending')`,
            [user_id]
          );
          const outstanding = parseFloat(outstandingResult.rows[0].total);

          userInfo = {
            credit_limit:    creditLimit,
            available_credit: Math.max(0, creditLimit - outstanding),
          };
        }
      }

      const pricing = await calculateLoanCredit(amountZmw, userInfo);
      return res.json(pricing);
    }

    return res.status(400).json({
      error: 'Invalid tier — must be "trade_credit" or "loan_credit"',
    });
  } catch (err) {
    console.error('[pricing] calculate error:', err);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
});


// ── GET /pricing/preview/:amount ───────────────────────────────────────────
// Quick preview — shows both tier breakdowns for a given amount.
// No authentication required (useful for demo / onboarding).
router.get('/preview/:amount', async (req, res) => {
  try {
    const amountZmw = parseFloat(req.params.amount);

    if (!amountZmw || amountZmw <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const [tradePricing, loanPricing] = await Promise.all([
      calculateTradeCredit(amountZmw),
      calculateLoanCredit(amountZmw),
    ]);

    res.json({
      amount_zmw: amountZmw,
      trade_credit: tradePricing,
      loan_credit:  loanPricing,
    });
  } catch (err) {
    console.error('[pricing] preview error:', err);
    res.status(500).json({ error: 'Failed to generate pricing preview' });
  }
});


// ── GET /pricing/preview/:amount/:user_id ──────────────────────────────────
// Personalised preview — shows the relevant tier pricing for a specific user.
router.get('/preview/:amount/:user_id', async (req, res) => {
  try {
    const amountZmw = parseFloat(req.params.amount);
    const userId    = req.params.user_id;

    if (!amountZmw || amountZmw <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    // Fetch user tier
    const userResult = await query(
      'SELECT id, tier, trade_credit_transactions, account_frozen FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const cfg  = await getPricingConfig();

    // Always include trade credit pricing
    const tradePricing = await calculateTradeCredit(amountZmw);

    let loanPricing = null;
    let userCredit  = null;

    // Include loan pricing if Tier 2
    if (user.tier === 'loan_credit') {
      const limitResult = await query(
        `SELECT COALESCE(MAX(cl.limit_amount), 0) AS credit_limit
         FROM credit_limits cl
         JOIN meters m ON m.id = cl.meter_id
         WHERE m.user_id = $1`,
        [userId]
      );
      const creditLimit = parseFloat(limitResult.rows[0].credit_limit);

      const outstandingResult = await query(
        `SELECT COALESCE(SUM(amount_borrowed), 0) AS total
         FROM loans
         WHERE meter_id IN (SELECT id FROM meters WHERE user_id = $1)
           AND status IN ('active', 'pending')`,
        [userId]
      );
      const outstanding = parseFloat(outstandingResult.rows[0].total);

      userCredit = {
        approved_limit_zmw:  creditLimit,
        outstanding_zmw:     outstanding,
        available_zmw:       Math.max(0, creditLimit - outstanding),
      };

      loanPricing = await calculateLoanCredit(amountZmw, {
        credit_limit:    creditLimit,
        available_credit: Math.max(0, creditLimit - outstanding),
      });
    }

    res.json({
      user_id:    userId,
      user_tier:  user.tier,
      amount_zmw: amountZmw,
      trade_credit: tradePricing,
      ...(loanPricing && { loan_credit: loanPricing }),
      ...(userCredit  && { credit: userCredit }),
      eligible_for_loan: user.tier === 'loan_credit',
      account_frozen:    user.account_frozen,
    });
  } catch (err) {
    console.error('[pricing] preview/user error:', err);
    res.status(500).json({ error: 'Failed to generate personalised pricing preview' });
  }
});


// ── GET /pricing/margin ────────────────────────────────────────────────────
// Blended margin report across both tiers (admin).
router.get('/margin', async (_req, res) => {
  try {
    const report = await getMarginReport();
    res.json(report);
  } catch (err) {
    console.error('[pricing] margin error:', err);
    res.status(500).json({ error: 'Failed to generate margin report' });
  }
});


// ── GET /pricing/settings ──────────────────────────────────────────────────
// View all pricing settings (admin).
router.get('/settings', async (_req, res) => {
  try {
    const result = await query(
      'SELECT key, value, description, updated_at, updated_by FROM settings ORDER BY key'
    );
    res.json({ settings: result.rows });
  } catch (err) {
    console.error('[pricing] settings list error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});


// ── PUT /pricing/settings/:key ─────────────────────────────────────────────
// Update a pricing setting (admin).
router.put('/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null || value === '') {
      return res.status(400).json({ error: 'Value is required' });
    }

    // Validate that numeric settings get numeric values
    const numericKeys = [
      'pricing.retail_rate_per_kwh', 'pricing.service_fee_rate',
      'pricing.min_purchase_zmw', 'pricing.loan_fee_rate',
      'pricing.loan_flat_fee_zmw', 'pricing.loan_period_days',
      'pricing.early_repayment_days', 'pricing.early_repayment_discount',
      'pricing.kwh_per_zmw', 'pricing.max_credit_limit_zmw',
    ];

    if (numericKeys.includes(key) && isNaN(parseFloat(value))) {
      return res.status(400).json({ error: `Setting "${key}" requires a numeric value` });
    }

    const updated = await updateSetting(key, value, 'admin');

    res.json({
      message: `Setting "${key}" updated`,
      setting: updated,
    });
  } catch (err) {
    console.error('[pricing] settings update error:', err);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});


export default router;
