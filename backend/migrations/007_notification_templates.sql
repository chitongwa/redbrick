-- ── Migration 007: Notification templates + delivery log ──
-- Admin-configurable SMS + push notification copy for every system message.
--
-- Each row stores ONE template under a stable `key` (e.g. tc_token_delivered).
-- Templates support variable interpolation with {{var}} placeholders — see
-- services/notifications.js for the full variable list per key.

CREATE TABLE IF NOT EXISTS notification_templates (
  key           VARCHAR(100) PRIMARY KEY,
  tier          VARCHAR(20)  NOT NULL,             -- 'tier1' | 'tier2' | 'milestone'
  label         VARCHAR(100) NOT NULL,             -- human-friendly name shown in admin UI
  description   TEXT         NOT NULL,             -- when this template is sent
  sms_body      TEXT         NOT NULL,             -- SMS template (max ~320 chars)
  push_title    VARCHAR(120) NOT NULL,             -- push notification title
  push_body     TEXT         NOT NULL,             -- push notification body
  variables     JSONB        NOT NULL DEFAULT '[]'::jsonb, -- list of available {{variables}}
  sms_enabled   BOOLEAN      NOT NULL DEFAULT TRUE,
  push_enabled  BOOLEAN      NOT NULL DEFAULT TRUE,
  is_default    BOOLEAN      NOT NULL DEFAULT TRUE,  -- FALSE once admin has edited
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_by    VARCHAR(100)          DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_notification_templates_tier ON notification_templates(tier);

-- ── Delivery log — every SMS / push ever dispatched ───────────────────────
CREATE TABLE IF NOT EXISTS notification_log (
  id            BIGSERIAL PRIMARY KEY,
  template_key  VARCHAR(100) NOT NULL,
  user_id       VARCHAR(100),                      -- nullable (test sends, broadcasts)
  phone_number  VARCHAR(30),
  channel       VARCHAR(10)  NOT NULL,             -- 'sms' | 'push'
  status        VARCHAR(20)  NOT NULL,             -- 'sent' | 'failed' | 'mocked'
  provider      VARCHAR(30)  NOT NULL,             -- 'twilio' | 'onesignal' | 'mock'
  provider_ref  VARCHAR(120),                      -- Twilio SID / OneSignal notification ID
  rendered_body TEXT         NOT NULL,
  error_message TEXT,
  variables     JSONB,                             -- the context used to render
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user     ON notification_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_template ON notification_log(template_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_created  ON notification_log(created_at DESC);

-- ── Seed default templates ────────────────────────────────────────────────
-- Variables available to every template: {{first_name}}, {{full_name}}, {{phone}}
-- Tier-1 trade credit templates also receive:
--   {{token}}, {{units}}, {{amount}}, {{due_time}}, {{order_id}}, {{hours_remaining}}
-- Tier-2 loan templates also receive:
--   {{token}}, {{amount}}, {{due_date}}, {{loan_id}}, {{credit_limit}}
-- Milestone templates also receive:
--   {{credit_limit}}, {{new_limit}}, {{old_limit}}

INSERT INTO notification_templates
  (key, tier, label, description, sms_body, push_title, push_body, variables)
VALUES
  ('tc_token_delivered', 'tier1', 'Token Delivered',
   'Sent immediately after ZESCO token is purchased on trade credit (Tier 1).',
   'Your ZESCO token is: {{token}}. Pay ZMW {{amount}} by {{due_time}} via MTN MoMo *321# or Airtel *778#. Ref: RB{{order_id}}',
   'ZESCO token ready',
   'Your token: {{token}} — ZMW {{amount}} due by {{due_time}}',
   '["first_name","token","units","amount","due_time","order_id"]'::jsonb),

  ('tc_reminder_20h', 'tier1', '20-Hour Reminder',
   'Sent 20 hours after the trade credit order was created — 4 hours before default.',
   'Reminder: ZMW {{amount}} due in 4 hours. Pay now to keep your account active. MTN *321# or Airtel *778#',
   'Payment due in 4 hours',
   'ZMW {{amount}} due soon — tap to pay now',
   '["first_name","amount","order_id","hours_remaining"]'::jsonb),

  ('tc_account_frozen', 'tier1', 'Account Frozen (48h)',
   'Sent when the account is frozen due to non-payment at the 48-hour mark.',
   'Your Redbrick account is frozen. Pay ZMW {{amount}} to reactivate. MTN *321# or Airtel *778#',
   'Account frozen',
   'Pay ZMW {{amount}} to reactivate your account',
   '["first_name","amount","order_id"]'::jsonb),

  ('tc_payment_received', 'tier1', 'Payment Received',
   'Sent after a successful trade credit payment.',
   'Payment of ZMW {{amount}} received. Thank you! Your account is active. {{graduation_hint}}',
   'Payment received',
   'ZMW {{amount}} — thanks! Account active.',
   '["first_name","amount","order_id","graduation_hint"]'::jsonb),

  ('loan_disbursed', 'tier2', 'Loan Disbursed',
   'Sent when a Tier 2 customer borrows on credit — ZESCO token delivered.',
   'Your ZESCO token is: {{token}}. Repay ZMW {{amount}} by {{due_date}}. MTN *321# or Airtel *778#',
   'Loan approved',
   'Token: {{token}} — repay ZMW {{amount}} by {{due_date}}',
   '["first_name","token","amount","due_date","loan_id"]'::jsonb),

  ('loan_due_3d', 'tier2', 'Loan Due in 3 Days',
   'Sent 3 days before the loan due date.',
   'Your Redbrick loan of ZMW {{amount}} is due in 3 days',
   'Loan due in 3 days',
   'ZMW {{amount}} — due {{due_date}}',
   '["first_name","amount","loan_id","due_date"]'::jsonb),

  ('loan_repaid', 'tier2', 'Loan Repaid',
   'Sent when a loan is fully repaid — credit is restored.',
   'Loan repaid. Thank you! Your credit limit of ZMW {{credit_limit}} is restored.',
   'Loan repaid',
   'Credit limit of ZMW {{credit_limit}} restored',
   '["first_name","amount","loan_id","credit_limit"]'::jsonb),

  ('milestone_graduation', 'milestone', 'Graduation to Credit Member',
   'Sent when a Tier 1 customer graduates to Tier 2 (Credit Member).',
   'Congratulations! You have been upgraded to Redbrick Credit Member. You now have a ZMW {{credit_limit}} credit line. Thank you for being a trusted customer.',
   'You''re a Credit Member!',
   'ZMW {{credit_limit}} credit line unlocked',
   '["first_name","credit_limit"]'::jsonb),

  ('milestone_limit_increase', 'milestone', 'Credit Limit Increase',
   'Sent when a Tier 2 customer''s credit limit is raised.',
   'Great news! Your credit limit has increased to ZMW {{new_limit}} based on your excellent repayment history.',
   'Credit limit increased',
   'New limit: ZMW {{new_limit}}',
   '["first_name","new_limit","old_limit"]'::jsonb)

ON CONFLICT (key) DO NOTHING;
