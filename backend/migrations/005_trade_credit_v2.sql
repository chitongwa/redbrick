-- ── Migration 005: Trade credit v2 — float reservation + order lifecycle ──

-- Add float reservation columns to trade_credit_orders
ALTER TABLE trade_credit_orders
  ADD COLUMN IF NOT EXISTS float_reservation_id  UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS float_reserved        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS float_confirmed       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS token_sms_sent        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_20h_sent     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS freeze_processed      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hours_to_pay          NUMERIC(6,2) DEFAULT NULL;

-- Float reservations table — holds reserved units until payment or release
CREATE TABLE IF NOT EXISTS float_reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          INTEGER NOT NULL,
  units_reserved    NUMERIC(12,4) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'held',   -- held | confirmed | released
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ DEFAULT NULL,
  CONSTRAINT fk_reservation_order FOREIGN KEY (order_id) REFERENCES trade_credit_orders(id)
);

-- Float reservation detail — tracks which batches are reserved
CREATE TABLE IF NOT EXISTS float_reservation_batches (
  id                SERIAL PRIMARY KEY,
  reservation_id    UUID NOT NULL,
  float_id          INTEGER NOT NULL,
  units_held        NUMERIC(12,4) NOT NULL,
  unit_cost_zmw     NUMERIC(8,4) NOT NULL,
  CONSTRAINT fk_rb_reservation FOREIGN KEY (reservation_id) REFERENCES float_reservations(id),
  CONSTRAINT fk_rb_float FOREIGN KEY (float_id) REFERENCES float_inventory(id)
);

-- Fee revenue tracking
CREATE TABLE IF NOT EXISTS fee_revenue (
  id                SERIAL PRIMARY KEY,
  order_id          INTEGER NOT NULL,
  user_id           INTEGER NOT NULL,
  fee_amount_zmw    NUMERIC(10,2) NOT NULL,
  fee_type          VARCHAR(30) NOT NULL DEFAULT 'trade_credit_service',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_fee_order FOREIGN KEY (order_id) REFERENCES trade_credit_orders(id)
);

-- Index for countdown worker queries
CREATE INDEX IF NOT EXISTS idx_tco_status_due ON trade_credit_orders(status, payment_due_at);
CREATE INDEX IF NOT EXISTS idx_tco_user_status ON trade_credit_orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_float_res_status ON float_reservations(status);
