-- ============================================================================
-- RedBrick — Initial Database Schema
-- PostgreSQL 16+
-- Run: psql -d redbrick -f migrations/001_initial_schema.sql
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- ENUM TYPES
-- --------------------------------------------------------------------------

CREATE TYPE kyc_status_enum      AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE loan_status_enum     AS ENUM ('pending', 'active', 'repaid', 'defaulted');
CREATE TYPE payment_method_enum  AS ENUM ('mtn', 'airtel');
CREATE TYPE tx_source_enum       AS ENUM ('zesco_history', 'redbrick');

-- --------------------------------------------------------------------------
-- 1. USERS
-- --------------------------------------------------------------------------

CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    phone_number    VARCHAR(15)     UNIQUE NOT NULL,
    full_name       VARCHAR(120)    NOT NULL,
    kyc_status      kyc_status_enum NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  users              IS 'Registered RedBrick customers';
COMMENT ON COLUMN users.phone_number IS 'E.164 format, e.g. +260971234567';
COMMENT ON COLUMN users.kyc_status   IS 'KYC verification state: pending → verified | rejected';

-- --------------------------------------------------------------------------
-- 2. METERS
-- --------------------------------------------------------------------------

CREATE TABLE meters (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meter_number    VARCHAR(20)     UNIQUE NOT NULL,
    zesco_verified  BOOLEAN         NOT NULL DEFAULT false,
    added_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

COMMENT ON TABLE  meters                IS 'ZESCO prepaid meters linked to user accounts';
COMMENT ON COLUMN meters.zesco_verified IS 'true once meter ownership confirmed via ZESCO API';

-- --------------------------------------------------------------------------
-- 3. CREDIT LIMITS
-- --------------------------------------------------------------------------

CREATE TABLE credit_limits (
    id              BIGSERIAL       PRIMARY KEY,
    meter_id        BIGINT          NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    limit_amount    NUMERIC(10,2)   NOT NULL CHECK (limit_amount >= 0),
    calculated_at   TIMESTAMPTZ     NOT NULL DEFAULT now(),
    model_version   VARCHAR(30)     NOT NULL DEFAULT 'v0.1.0'
);

COMMENT ON TABLE  credit_limits               IS 'Credit limits produced by the scoring engine, one per meter';
COMMENT ON COLUMN credit_limits.model_version IS 'Scoring model version that generated this limit';

-- --------------------------------------------------------------------------
-- 4. LOANS
-- --------------------------------------------------------------------------

CREATE TABLE loans (
    id              BIGSERIAL        PRIMARY KEY,
    meter_id        BIGINT           NOT NULL REFERENCES meters(id) ON DELETE RESTRICT,
    amount_borrowed NUMERIC(10,2)    NOT NULL CHECK (amount_borrowed > 0),
    token_delivered VARCHAR(30),
    status          loan_status_enum NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ      NOT NULL DEFAULT now(),
    due_date        TIMESTAMPTZ      NOT NULL,
    repaid_at       TIMESTAMPTZ,

    CONSTRAINT chk_repaid_date CHECK (
        (status = 'repaid' AND repaid_at IS NOT NULL) OR
        (status != 'repaid')
    )
);

COMMENT ON TABLE  loans                 IS 'Pay-later loans issued against a meter';
COMMENT ON COLUMN loans.token_delivered IS '20-digit ZESCO token code issued to the customer';
COMMENT ON COLUMN loans.status          IS 'Lifecycle: pending → active → repaid | defaulted';

-- --------------------------------------------------------------------------
-- 5. TRANSACTIONS  (electricity purchase history)
-- --------------------------------------------------------------------------

CREATE TABLE transactions (
    id              BIGSERIAL       PRIMARY KEY,
    meter_id        BIGINT          NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    amount_zmw      NUMERIC(10,2)   NOT NULL CHECK (amount_zmw > 0),
    units_purchased NUMERIC(10,2)   NOT NULL CHECK (units_purchased > 0),
    purchased_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
    source          tx_source_enum  NOT NULL DEFAULT 'redbrick'
);

COMMENT ON TABLE  transactions        IS 'Electricity token purchases — both ZESCO history imports and RedBrick loans';
COMMENT ON COLUMN transactions.source IS 'zesco_history = imported from ZESCO; redbrick = purchased via RedBrick';

-- --------------------------------------------------------------------------
-- 6. REPAYMENTS
-- --------------------------------------------------------------------------

CREATE TABLE repayments (
    id              BIGSERIAL           PRIMARY KEY,
    loan_id         BIGINT              NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
    amount_paid     NUMERIC(10,2)       NOT NULL CHECK (amount_paid > 0),
    payment_method  payment_method_enum NOT NULL,
    paid_at         TIMESTAMPTZ         NOT NULL DEFAULT now()
);

COMMENT ON TABLE  repayments                IS 'Mobile-money payments made against outstanding loans';
COMMENT ON COLUMN repayments.payment_method IS 'mtn = MTN MoMo; airtel = Airtel Money';

-- --------------------------------------------------------------------------
-- INDEXES
-- --------------------------------------------------------------------------

-- Users
CREATE INDEX idx_users_phone           ON users(phone_number);

-- Meters
CREATE INDEX idx_meters_user_id        ON meters(user_id);
CREATE INDEX idx_meters_meter_number   ON meters(meter_number);

-- Credit limits
CREATE INDEX idx_credit_limits_meter   ON credit_limits(meter_id);

-- Loans
CREATE INDEX idx_loans_meter_id        ON loans(meter_id);
CREATE INDEX idx_loans_status          ON loans(status);
CREATE INDEX idx_loans_due_date        ON loans(due_date) WHERE status = 'active';

-- Transactions
CREATE INDEX idx_transactions_meter    ON transactions(meter_id);
CREATE INDEX idx_transactions_date     ON transactions(purchased_at);

-- Repayments
CREATE INDEX idx_repayments_loan       ON repayments(loan_id);

COMMIT;
