// ── Trade-credit / loan lifecycle notification helpers ──
//
// Thin compatibility shim over services/notifications.js. Every helper
// below loads the admin-configurable template, renders it, and dispatches
// both SMS (Twilio) and push (OneSignal) in one call. Callers that still
// import the old helper names keep working — they just get templated copy
// and dual-channel delivery for free.

import {
  notify,
  money,
  localTime,
  localDate,
} from './notifications.js';

// ── Tier 1 — Trade Credit ────────────────────────────────────────────────

/**
 * Send token delivery notification (Tier 1).
 * Accepts either the legacy positional signature or a single object.
 */
export function sendTokenDelivered(phone, token, units, totalDue, dueAt, opts = {}) {
  return notify({
    key: 'tc_token_delivered',
    user: {
      id:           opts.userId,
      full_name:    opts.fullName,
      phone_number: phone,
    },
    context: {
      token:    token,
      units:    String(units),
      amount:   money(totalDue),
      due_time: localTime(dueAt),
      order_id: String(opts.orderId ?? ''),
    },
  });
}

/**
 * Send the 20-hour reminder (4 hours before default).
 */
export function sendReminder20h(phone, orderId, totalDue, dueAt, opts = {}) {
  return notify({
    key: 'tc_reminder_20h',
    user: {
      id:           opts.userId,
      full_name:    opts.fullName,
      phone_number: phone,
    },
    context: {
      amount:          money(totalDue),
      order_id:        String(orderId),
      hours_remaining: '4',
      due_time:        localTime(dueAt),
    },
  });
}

/**
 * Send the 24-hour urgent reminder.
 * Reuses tc_reminder_20h with a different hours_remaining value — templates
 * can be configured to surface either from the admin UI.
 */
export function sendReminder24h(phone, orderId, totalDue, opts = {}) {
  return notify({
    key: 'tc_reminder_20h',
    user: {
      id:           opts.userId,
      full_name:    opts.fullName,
      phone_number: phone,
    },
    context: {
      amount:          money(totalDue),
      order_id:        String(orderId),
      hours_remaining: '0',
    },
  });
}

/**
 * Send the 48-hour freeze / default notification.
 */
export function sendAccountFrozen(phone, orderId, totalDue, opts = {}) {
  return notify({
    key: 'tc_account_frozen',
    user: {
      id:           opts.userId,
      full_name:    opts.fullName,
      phone_number: phone,
    },
    context: {
      amount:   money(totalDue),
      order_id: String(orderId),
    },
  });
}

/**
 * Send the payment-received confirmation.
 */
export function sendPaymentConfirmed(phone, orderId, amountPaid, method, opts = {}) {
  return notify({
    key: 'tc_payment_received',
    user: {
      id:           opts.userId,
      full_name:    opts.fullName,
      phone_number: phone,
    },
    context: {
      amount:           money(amountPaid),
      order_id:         String(orderId),
      method:           String(method || '').toUpperCase(),
      graduation_hint:  opts.graduationHint || '',
    },
  });
}

// ── Tier 2 — Loan Credit ─────────────────────────────────────────────────

/**
 * Send loan disbursement notification (token + repayment terms).
 */
export function sendLoanDisbursed(phone, token, amount, dueDate, opts = {}) {
  return notify({
    key: 'loan_disbursed',
    user: {
      id:           opts.userId,
      full_name:    opts.fullName,
      phone_number: phone,
    },
    context: {
      token:    token,
      amount:   money(amount),
      due_date: localDate(dueDate),
      loan_id:  String(opts.loanId ?? ''),
    },
  });
}

/**
 * Send the 3-days-before-due loan reminder.
 */
export function sendLoanDue3d(phone, loanId, amount, dueDate, opts = {}) {
  return notify({
    key: 'loan_due_3d',
    user: {
      id:           opts.userId,
      full_name:    opts.fullName,
      phone_number: phone,
    },
    context: {
      amount:   money(amount),
      loan_id:  String(loanId),
      due_date: localDate(dueDate),
    },
  });
}

/**
 * Send the loan-repaid confirmation.
 */
export function sendLoanRepaid(phone, loanId, amount, creditLimit, opts = {}) {
  return notify({
    key: 'loan_repaid',
    user: {
      id:           opts.userId,
      full_name:    opts.fullName,
      phone_number: phone,
    },
    context: {
      amount:       money(amount),
      loan_id:      String(loanId),
      credit_limit: money(creditLimit),
    },
  });
}

// ── Milestones ───────────────────────────────────────────────────────────

/**
 * Send graduation congratulations (Tier 1 → Tier 2).
 */
export function sendGraduationCongrats(phone, fullName, creditLimit, opts = {}) {
  return notify({
    key: 'milestone_graduation',
    user: {
      id:           opts.userId,
      full_name:    fullName,
      phone_number: phone,
    },
    context: {
      credit_limit: money(creditLimit),
    },
  });
}

/**
 * Send credit-limit-increase notification (Tier 2).
 */
export function sendCreditLimitIncrease(phone, fullName, newLimit, oldLimit, opts = {}) {
  return notify({
    key: 'milestone_limit_increase',
    user: {
      id:           opts.userId,
      full_name:    fullName,
      phone_number: phone,
    },
    context: {
      new_limit: money(newLimit),
      old_limit: money(oldLimit),
    },
  });
}
