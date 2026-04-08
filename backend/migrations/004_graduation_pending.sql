-- ============================================================
-- RedBrick — Graduation pending records
-- ============================================================
-- When the scoring engine approves a Tier 1 → Tier 2 graduation,
-- a record is created here for admin review before activation.
-- ============================================================

CREATE TABLE IF NOT EXISTS graduation_pending (
  id                    SERIAL PRIMARY KEY,
  user_id               INT NOT NULL REFERENCES users(id),
  decision              VARCHAR(30) NOT NULL,             -- approved | not_yet_eligible
  initial_credit_limit  DECIMAL(12,2),                    -- proposed Tier 2 credit limit
  criteria_snapshot     JSONB,                            -- full criteria_met object at time of eval
  reasons               JSONB,                            -- [] if approved, reasons list if not
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',
                        -- pending → confirmed | rejected
  evaluated_at          TIMESTAMPTZ DEFAULT now(),
  confirmed_at          TIMESTAMPTZ,
  confirmed_by          VARCHAR(100),                     -- admin email or ID
  rejected_at           TIMESTAMPTZ,
  rejection_reason      VARCHAR(500)
);

-- Only one pending record per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_grad_pending_user
  ON graduation_pending (user_id)
  WHERE status = 'pending';
