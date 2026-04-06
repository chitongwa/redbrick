-- RedBrick initial database schema
-- PostgreSQL 16+

BEGIN;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    phone           VARCHAR(15) UNIQUE NOT NULL,
    name            VARCHAR(120),
    pin_hash        VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meters linked to users
CREATE TABLE IF NOT EXISTS meters (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    meter_number    VARCHAR(20) UNIQUE NOT NULL,
    label           VARCHAR(50) DEFAULT 'Primary',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credit scores produced by the scoring engine
CREATE TABLE IF NOT EXISTS credit_scores (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    risk_score      NUMERIC(5,4) NOT NULL,
    credit_limit    NUMERIC(10,2) NOT NULL,
    approved        BOOLEAN NOT NULL DEFAULT false,
    scored_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loans (pay-later transactions)
CREATE TABLE IF NOT EXISTS loans (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    meter_id        BIGINT NOT NULL REFERENCES meters(id),
    amount          NUMERIC(10,2) NOT NULL,
    units_kwh       NUMERIC(10,2) NOT NULL,
    token_code      VARCHAR(30),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active | repaid | overdue | written_off
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    due_at          TIMESTAMPTZ NOT NULL,
    repaid_at       TIMESTAMPTZ
);

-- Repayments made against loans
CREATE TABLE IF NOT EXISTS repayments (
    id              BIGSERIAL PRIMARY KEY,
    loan_id         BIGINT NOT NULL REFERENCES loans(id),
    user_id         BIGINT NOT NULL REFERENCES users(id),
    amount          NUMERIC(10,2) NOT NULL,
    method          VARCHAR(20) NOT NULL,  -- mtn_momo | airtel_money
    reference       VARCHAR(50),
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transaction log (top-ups, borrows, repayments)
CREATE TABLE IF NOT EXISTS transactions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    meter_id        BIGINT REFERENCES meters(id),
    loan_id         BIGINT REFERENCES loans(id),
    type            VARCHAR(20) NOT NULL,  -- topup | borrow | repayment
    amount          NUMERIC(10,2) NOT NULL,
    units_kwh       NUMERIC(10,2),
    description     VARCHAR(120),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_meters_user       ON meters(user_id);
CREATE INDEX idx_loans_user        ON loans(user_id);
CREATE INDEX idx_loans_status      ON loans(status);
CREATE INDEX idx_repayments_loan   ON repayments(loan_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);

COMMIT;
