-- ============================================================
-- RedBrick — Two-tier customer model
-- ============================================================
-- Tier 1: trade_credit (default for ALL new users)
--   - Tokens delivered immediately from Redbrick bulk float
--   - 4% service fee on electricity cost
--   - Payment due within 48 hours via MoMo / Airtel
--   - Account frozen if payment not received within 48hrs
--
-- Tier 2: loan_credit (graduated customers only)
--   - Unlocked after meeting graduation criteria
--   - Full loan management with credit limit
-- ============================================================

-- Add tier columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tier                       VARCHAR(20) NOT NULL DEFAULT 'trade_credit',
  ADD COLUMN IF NOT EXISTS tier_upgraded_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trade_credit_transactions   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trade_credit_default_count  INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_frozen              BOOLEAN NOT NULL DEFAULT FALSE;

-- Constraint: tier must be one of two values
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_tier_check;
ALTER TABLE users
  ADD CONSTRAINT users_tier_check CHECK (tier IN ('trade_credit', 'loan_credit'));

-- ── Trade credit orders ─────────────────────────────────────
-- Tracks each "buy now, pay later" token purchase under Tier 1.
CREATE TABLE IF NOT EXISTS trade_credit_orders (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id),
  meter_id        INT NOT NULL REFERENCES meters(id),
  electricity_amt DECIMAL(12,2) NOT NULL,          -- base electricity cost in ZMW
  service_fee     DECIMAL(12,2) NOT NULL,          -- 4% of electricity_amt
  total_due       DECIMAL(12,2) NOT NULL,          -- electricity_amt + service_fee
  token_delivered VARCHAR(30),                     -- 20-digit ZESCO token code
  units_kwh       DECIMAL(12,2),
  status          VARCHAR(20) NOT NULL DEFAULT 'pending_payment',
                  -- pending_payment → paid | frozen | defaulted
  payment_method  VARCHAR(20),                     -- mtn | airtel (set on payment)
  payment_ref     VARCHAR(60),                     -- mobile-money reference
  created_at      TIMESTAMPTZ DEFAULT now(),       -- token issued at
  payment_due_at  TIMESTAMPTZ NOT NULL,            -- created_at + 48 hours
  paid_at         TIMESTAMPTZ,
  frozen_at       TIMESTAMPTZ
);

-- Index for expiry checks (find unpaid orders past due)
CREATE INDEX IF NOT EXISTS idx_tco_status_due
  ON trade_credit_orders (status, payment_due_at)
  WHERE status = 'pending_payment';

-- Backfill: set all existing users to trade_credit (safe for empty tables too)
UPDATE users SET tier = 'trade_credit' WHERE tier IS NULL;
