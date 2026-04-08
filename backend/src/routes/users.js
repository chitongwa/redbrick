// ── User routes ──
// GET /users/me — Authenticated user's profile with tier info

import { Router } from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ── GET /users/me ──────────────────────────────────────────────────────────
router.get(
  '/me',
  requireAuth,
  async (req, res) => {
    try {
      const userId = req.user.userId;

      const result = await query(
        `SELECT id, phone_number, full_name, kyc_status,
                tier, tier_upgraded_at,
                trade_credit_transactions, trade_credit_default_count,
                account_frozen, created_at
         FROM users WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      res.json({
        user: {
          id:                         user.id,
          phone_number:               user.phone_number,
          full_name:                  user.full_name,
          kyc_status:                 user.kyc_status,
          tier:                       user.tier,
          tier_upgraded_at:           user.tier_upgraded_at,
          trade_credit_transactions:  user.trade_credit_transactions,
          trade_credit_default_count: user.trade_credit_default_count,
          account_frozen:             user.account_frozen,
          created_at:                 user.created_at,
        },
        tier_info: {
          current_tier:   user.tier,
          tier_label:     user.tier === 'loan_credit' ? 'Loan Credit (Tier 2)' : 'Trade Credit (Tier 1)',
          can_borrow:     user.tier === 'loan_credit',
          is_frozen:      user.account_frozen,
          completed_trades: user.trade_credit_transactions,
          defaults:       user.trade_credit_default_count,
        },
      });
    } catch (err) {
      console.error('[users] me error:', err);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
);

export default router;
