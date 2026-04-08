-- ============================================================
-- RedBrick — Float management system
-- ============================================================
-- Tracks Redbrick's bulk ZESCO electricity purchases and
-- deducts units (FIFO) when customers purchase tokens via
-- either Tier 1 (trade credit) or Tier 2 (loan credit).
-- ============================================================

-- ── Float inventory — each row is a bulk ZESCO purchase ─────
CREATE TABLE IF NOT EXISTS float_inventory (
  id                  SERIAL PRIMARY KEY,
  purchase_date       TIMESTAMPTZ NOT NULL DEFAULT now(),
  units_purchased     DECIMAL(14,2) NOT NULL,       -- kWh bought from ZESCO
  amount_paid_zmw     DECIMAL(14,2) NOT NULL,       -- total ZMW paid for this batch
  unit_cost_zmw       DECIMAL(10,4) NOT NULL,       -- amount_paid / units_purchased
  units_remaining     DECIMAL(14,2) NOT NULL,       -- decremented on each sale (FIFO)
  purchase_reference  VARCHAR(60),                  -- ZESCO invoice / receipt number
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Index for FIFO queries (oldest stock with remaining units)
CREATE INDEX IF NOT EXISTS idx_float_inv_fifo
  ON float_inventory (purchase_date ASC)
  WHERE units_remaining > 0;

-- ── Float transactions — audit trail of every movement ──────
CREATE TABLE IF NOT EXISTS float_transactions (
  id                  SERIAL PRIMARY KEY,
  float_id            INT NOT NULL REFERENCES float_inventory(id),
  transaction_type    VARCHAR(20) NOT NULL,          -- purchase | sale | adjustment
  units               DECIMAL(14,2) NOT NULL,        -- positive = in, negative = out
  amount_zmw          DECIMAL(14,2),                 -- ZMW value at cost
  user_id             INT REFERENCES users(id),      -- NULL for purchases/adjustments
  note                VARCHAR(200),                  -- e.g. "Trade credit order #42"
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- Constraint on transaction_type
ALTER TABLE float_transactions
  DROP CONSTRAINT IF EXISTS ft_type_check;
ALTER TABLE float_transactions
  ADD CONSTRAINT ft_type_check
  CHECK (transaction_type IN ('purchase', 'sale', 'adjustment'));
