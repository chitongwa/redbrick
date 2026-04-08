// ── Auth routes ──
// POST /auth/request-otp
// POST /auth/verify-otp

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import env from '../config/env.js';
import { validate } from '../middleware/validate.js';
import * as rules from '../validators/rules.js';
import { sms } from '../services/index.js';

const router = Router();

// ── POST /auth/request-otp ──────────────────────────────────────────────────
router.post(
  '/request-otp',
  validate({ phone_number: rules.phone }),
  async (req, res) => {
    try {
      const phone = req.body.phone_number.replace(/\s/g, '');
      const result = sms.sendOtp(phone);
      res.json({
        message: 'OTP sent',
        phone,
        ...(result.mock && { hint: 'Mock mode — use code 123456' }),
      });
    } catch (err) {
      console.error('[auth] request-otp error:', err);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  }
);

// ── POST /auth/verify-otp ───────────────────────────────────────────────────
router.post(
  '/verify-otp',
  validate({ phone_number: rules.phone, otp: rules.otp }),
  async (req, res) => {
    try {
      const phone = req.body.phone_number.replace(/\s/g, '');
      const code  = req.body.otp;

      const check = sms.verifyOtp(phone, code);
      if (!check.valid) {
        return res.status(401).json({ error: check.reason });
      }

      // Upsert user (create on first login — always starts on Tier 1: trade_credit)
      const fullName = req.body.full_name || phone;
      const upsert = await query(
        `INSERT INTO users (phone_number, full_name, tier)
         VALUES ($1, $2, 'trade_credit')
         ON CONFLICT (phone_number) DO UPDATE SET phone_number = EXCLUDED.phone_number
         RETURNING id, phone_number, full_name, kyc_status,
                   tier, tier_upgraded_at, trade_credit_transactions,
                   trade_credit_default_count, account_frozen`,
        [phone, fullName]
      );

      const user = upsert.rows[0];

      const token = jwt.sign(
        { sub: user.id, phone: user.phone_number },
        env.jwtSecret,
        { expiresIn: env.jwtExpiresIn }
      );

      res.json({
        message: 'Authenticated',
        token,
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
        },
      });
    } catch (err) {
      console.error('[auth] verify-otp error:', err);
      res.status(500).json({ error: 'Authentication failed' });
    }
  }
);

export default router;
