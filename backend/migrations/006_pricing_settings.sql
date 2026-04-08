-- ── Migration 006: Admin-configurable pricing settings ──

-- Key-value settings table for all configurable rates.
-- Settings can be changed at runtime via admin API — no redeployment needed.
CREATE TABLE IF NOT EXISTS settings (
  key           VARCHAR(100) PRIMARY KEY,
  value         VARCHAR(255) NOT NULL,
  description   TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by    VARCHAR(100) DEFAULT 'system'
);

-- ── Seed default pricing settings ──────────────────────────────────────────

-- Tier 1 — Trade Credit
INSERT INTO settings (key, value, description) VALUES
  ('pricing.retail_rate_per_kwh',       '2.50',  'ZESCO standard retail rate per kWh (ZMW)'),
  ('pricing.service_fee_rate',          '0.04',  'Tier 1 trade credit service fee as decimal (4%)'),
  ('pricing.min_purchase_zmw',          '10',    'Minimum trade credit purchase amount (ZMW)')
ON CONFLICT (key) DO NOTHING;

-- Tier 2 — Loan Credit
INSERT INTO settings (key, value, description) VALUES
  ('pricing.loan_fee_rate',             '0.05',  'Tier 2 loan fee as decimal per 30-day period (5%)'),
  ('pricing.loan_fee_type',             'percentage', 'Loan fee type: "percentage" or "flat"'),
  ('pricing.loan_flat_fee_zmw',         '10',    'Flat fee in ZMW if loan_fee_type is "flat"'),
  ('pricing.loan_period_days',          '30',    'Standard loan period in days'),
  ('pricing.early_repayment_days',      '7',     'Days threshold for early repayment discount'),
  ('pricing.early_repayment_discount',  '0.01',  'Early repayment discount as decimal (1%)')
ON CONFLICT (key) DO NOTHING;

-- General
INSERT INTO settings (key, value, description) VALUES
  ('pricing.kwh_per_zmw',              '0.4',   'kWh per ZMW conversion rate (1/2.50)'),
  ('pricing.max_credit_limit_zmw',     '500',   'Maximum credit limit for Tier 2 (ZMW)')
ON CONFLICT (key) DO NOTHING;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
