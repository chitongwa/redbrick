-- ============================================================
-- RedBrick — Initial schema
-- ============================================================

-- ── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  phone_number    VARCHAR(20) UNIQUE NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  kyc_status      VARCHAR(20) DEFAULT 'pending',   -- pending | verified | rejected
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── Meters ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meters (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id),
  meter_number    VARCHAR(20) UNIQUE NOT NULL,
  zesco_verified  BOOLEAN DEFAULT FALSE,
  added_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Credit limits ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_limits (
  id              SERIAL PRIMARY KEY,
  meter_id        INT NOT NULL REFERENCES meters(id),
  limit_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  calculated_at   TIMESTAMPTZ DEFAULT now(),
  model_version   VARCHAR(20)
);

-- ── Loans ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
  id              SERIAL PRIMARY KEY,
  meter_id        INT NOT NULL REFERENCES meters(id),
  amount_borrowed DECIMAL(12,2) NOT NULL,
  token_delivered VARCHAR(30),
  status          VARCHAR(20) DEFAULT 'active',    -- active | pending | repaid | overdue | defaulted
  due_date        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  repaid_at       TIMESTAMPTZ
);

-- ── Repayments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repayments (
  id              SERIAL PRIMARY KEY,
  loan_id         INT NOT NULL REFERENCES loans(id),
  amount_paid     DECIMAL(12,2) NOT NULL,
  payment_method  VARCHAR(20),                     -- mtn | airtel
  paid_at         TIMESTAMPTZ DEFAULT now()
);

-- ── Transactions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              SERIAL PRIMARY KEY,
  meter_id        INT NOT NULL REFERENCES meters(id),
  amount_zmw      DECIMAL(12,2) NOT NULL,
  units_purchased DECIMAL(12,2),
  purchased_at    TIMESTAMPTZ DEFAULT now(),
  source          VARCHAR(20) DEFAULT 'zesco_history' -- zesco_history | redbrick | trade_credit
);
