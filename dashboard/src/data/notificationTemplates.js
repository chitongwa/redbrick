// ── Seed notification templates for the admin dashboard ──
// Mirrors backend migration 007. Used as initial state for the Settings →
// Notifications editor. When the backend is live, the dashboard will also
// fetch /notifications/templates and overlay any admin edits on top of these.

export const defaultTemplates = [
  // ── Tier 1 — Trade Credit ──────────────────────────────────────────────
  {
    key: 'tc_token_delivered',
    tier: 'tier1',
    label: 'Token Delivered',
    description: 'Sent immediately after ZESCO token is purchased on trade credit (Tier 1).',
    sms_body:
      'Your ZESCO token is: {{token}}. Pay ZMW {{amount}} by {{due_time}} via MTN MoMo *321# or Airtel *778#. Ref: RB{{order_id}}',
    push_title: 'ZESCO token ready',
    push_body:  'Your token: {{token}} — ZMW {{amount}} due by {{due_time}}',
    variables: ['first_name', 'token', 'units', 'amount', 'due_time', 'order_id'],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'system',
  },
  {
    key: 'tc_reminder_20h',
    tier: 'tier1',
    label: '20-Hour Reminder',
    description: 'Sent 20 hours after the trade credit order was created — 4 hours before default.',
    sms_body:
      'Reminder: ZMW {{amount}} due in 4 hours. Pay now to keep your account active. MTN *321# or Airtel *778#',
    push_title: 'Payment due in 4 hours',
    push_body:  'ZMW {{amount}} due soon — tap to pay now',
    variables: ['first_name', 'amount', 'order_id', 'hours_remaining'],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'system',
  },
  {
    key: 'tc_account_frozen',
    tier: 'tier1',
    label: 'Account Frozen (48h)',
    description: 'Sent when the account is frozen due to non-payment at the 48-hour mark.',
    sms_body:
      'Your Redbrick account is frozen. Pay ZMW {{amount}} to reactivate. MTN *321# or Airtel *778#',
    push_title: 'Account frozen',
    push_body:  'Pay ZMW {{amount}} to reactivate your account',
    variables: ['first_name', 'amount', 'order_id'],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'system',
  },
  {
    key: 'tc_payment_received',
    tier: 'tier1',
    label: 'Payment Received',
    description: 'Sent after a successful trade credit payment.',
    sms_body:
      'Payment of ZMW {{amount}} received. Thank you! Your account is active. {{graduation_hint}}',
    push_title: 'Payment received',
    push_body:  'ZMW {{amount}} — thanks! Account active.',
    variables: ['first_name', 'amount', 'order_id', 'graduation_hint'],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'system',
  },

  // ── Tier 2 — Loan Credit ───────────────────────────────────────────────
  {
    key: 'loan_disbursed',
    tier: 'tier2',
    label: 'Loan Disbursed',
    description: 'Sent when a Tier 2 customer borrows on credit — ZESCO token delivered.',
    sms_body:
      'Your ZESCO token is: {{token}}. Repay ZMW {{amount}} by {{due_date}}. MTN *321# or Airtel *778#',
    push_title: 'Loan approved',
    push_body:  'Token: {{token}} — repay ZMW {{amount}} by {{due_date}}',
    variables: ['first_name', 'token', 'amount', 'due_date', 'loan_id'],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'system',
  },
  {
    key: 'loan_due_3d',
    tier: 'tier2',
    label: 'Loan Due in 3 Days',
    description: 'Sent 3 days before the loan due date.',
    sms_body: 'Your Redbrick loan of ZMW {{amount}} is due in 3 days',
    push_title: 'Loan due in 3 days',
    push_body:  'ZMW {{amount}} — due {{due_date}}',
    variables: ['first_name', 'amount', 'loan_id', 'due_date'],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'system',
  },
  {
    key: 'loan_repaid',
    tier: 'tier2',
    label: 'Loan Repaid',
    description: 'Sent when a loan is fully repaid — credit is restored.',
    sms_body:
      'Loan repaid. Thank you! Your credit limit of ZMW {{credit_limit}} is restored.',
    push_title: 'Loan repaid',
    push_body:  'Credit limit of ZMW {{credit_limit}} restored',
    variables: ['first_name', 'amount', 'loan_id', 'credit_limit'],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'system',
  },

  // ── Milestones ─────────────────────────────────────────────────────────
  {
    key: 'milestone_graduation',
    tier: 'milestone',
    label: 'Graduation to Credit Member',
    description: 'Sent when a Tier 1 customer graduates to Tier 2 (Credit Member).',
    sms_body:
      'Congratulations! You have been upgraded to Redbrick Credit Member. You now have a ZMW {{credit_limit}} credit line. Thank you for being a trusted customer.',
    push_title: "You're a Credit Member!",
    push_body:  'ZMW {{credit_limit}} credit line unlocked',
    variables: ['first_name', 'credit_limit'],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'system',
  },
  {
    key: 'milestone_limit_increase',
    tier: 'milestone',
    label: 'Credit Limit Increase',
    description: "Sent when a Tier 2 customer's credit limit is raised.",
    sms_body:
      'Great news! Your credit limit has increased to ZMW {{new_limit}} based on your excellent repayment history.',
    push_title: 'Credit limit increased',
    push_body:  'New limit: ZMW {{new_limit}}',
    variables: ['first_name', 'new_limit', 'old_limit'],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'system',
  },
];

// Sample context used by the live preview (so {{variables}} render with
// plausible values instead of showing as empty strings).
export const sampleContext = {
  first_name:      'Grace',
  full_name:       'Grace Mwamba',
  phone:           '+260977123456',
  token:           '5738-2041-9637-1084-2956',
  units:           '40',
  amount:          '104',
  due_time:        '10 May 2026, 14:32',
  due_date:        '10 May 2026',
  order_id:        'TC-2418',
  loan_id:         'LN-0037',
  credit_limit:    '120',
  new_limit:       '180',
  old_limit:       '120',
  hours_remaining: '4',
  graduation_hint: 'You may qualify for Tier 2 Loan Credit.',
};

// Render a {{var}} template with fallback to empty string for unknown keys.
export function renderTemplate(template, ctx = sampleContext) {
  if (!template) return '';
  return String(template)
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, name) => {
      const v = ctx[name];
      if (v === undefined || v === null) return '';
      return String(v);
    })
    .replace(/\s{2,}/g, ' ')
    .trim();
}
