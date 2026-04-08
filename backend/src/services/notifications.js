// ── Unified notifications service ──
// One entry point (`notify`) that:
//   1. Loads the admin-configurable template for a given key
//   2. Renders variables into both the SMS body and push title/body
//   3. Dispatches to Twilio (SMS) + OneSignal (push) based on toggles
//   4. Writes every delivery attempt to the notification_log table
//
// All triggers across the backend — trade credit, loans, graduation, credit
// limit increases — go through this module. Admins can change copy / toggle
// channels at runtime from the dashboard Settings → Notifications tab.

import { query } from '../config/db.js';
import { sendSms }  from './twilio-sms.js';
import { sendPush } from './onesignal-push.js';

// ── Template cache (60 s TTL) ─────────────────────────────────────────────
let _cache = null;
let _cacheAt = 0;
const CACHE_TTL_MS = 60_000;

/**
 * Invalidate the in-memory template cache.
 * Called automatically after admin updates via updateTemplate().
 */
export function clearTemplateCache() {
  _cache = null;
  _cacheAt = 0;
}

/**
 * Load all notification templates, caching the result for 60 s.
 * @returns {Promise<Record<string, object>>}  key → template row
 */
export async function getAllTemplates(forceRefresh = false) {
  if (!forceRefresh && _cache && Date.now() - _cacheAt < CACHE_TTL_MS) {
    return _cache;
  }
  const result = await query(
    `SELECT key, tier, label, description, sms_body, push_title, push_body,
            variables, sms_enabled, push_enabled, is_default, updated_at, updated_by
     FROM notification_templates
     ORDER BY tier, key`
  );
  const map = {};
  for (const row of result.rows) {
    // variables may come back as jsonb (array) or stringified JSON — normalise
    if (typeof row.variables === 'string') {
      try { row.variables = JSON.parse(row.variables); } catch { row.variables = []; }
    }
    map[row.key] = row;
  }
  _cache = map;
  _cacheAt = Date.now();
  return map;
}

/**
 * Fetch a single template by key. Returns `null` if not found.
 */
export async function getTemplate(key) {
  const all = await getAllTemplates();
  return all[key] ?? null;
}

/**
 * Update a template (admin). Clears the cache on success.
 */
export async function updateTemplate(key, patch, updatedBy = 'admin') {
  const allowed = ['sms_body', 'push_title', 'push_body', 'sms_enabled', 'push_enabled'];
  const sets = [];
  const values = [];
  let i = 1;

  for (const field of allowed) {
    if (patch[field] !== undefined) {
      sets.push(`${field} = $${i++}`);
      values.push(patch[field]);
    }
  }

  if (sets.length === 0) {
    throw new Error('No updatable fields supplied');
  }

  sets.push(`is_default = FALSE`);
  sets.push(`updated_at = now()`);
  sets.push(`updated_by = $${i++}`);
  values.push(updatedBy);
  values.push(key);

  const result = await query(
    `UPDATE notification_templates SET ${sets.join(', ')} WHERE key = $${i}
     RETURNING key, tier, label, description, sms_body, push_title, push_body,
               variables, sms_enabled, push_enabled, is_default, updated_at, updated_by`,
    values
  );

  clearTemplateCache();
  return result.rows[0] ?? null;
}

// ── Template rendering ────────────────────────────────────────────────────

/**
 * Render a {{variable}} template against a context object.
 * Unknown variables are replaced with an empty string, not left as literals.
 * Double-brace collapses any accidental whitespace: "{{ name }}" → "{{name}}".
 */
export function render(template, ctx = {}) {
  if (!template) return '';
  return String(template).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, name) => {
    const v = ctx[name];
    if (v === undefined || v === null) return '';
    return String(v);
  }).replace(/\s+\./g, '.').replace(/\s{2,}/g, ' ').trim();
}

// ── Variable helpers (shared by callers) ──────────────────────────────────

/**
 * Build a base context for a user — always present on every notification.
 */
export function buildUserContext(user = {}) {
  const fullName = user.full_name || user.fullName || '';
  const firstName = fullName.split(/\s+/)[0] || 'there';
  return {
    first_name: firstName,
    full_name:  fullName,
    phone:      user.phone_number || user.phone || '',
  };
}

/**
 * Format a ZMW amount for display inside templates.
 */
export function money(n) {
  const v = Number(n || 0);
  return v.toFixed(2).replace(/\.00$/, '');
}

/**
 * Format a Date / ISO string as a Lusaka local time string.
 */
export function localTime(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-ZM', {
    timeZone: 'Africa/Lusaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Format a Date / ISO string as a short day reference (e.g. "08 May").
 */
export function localDate(d) {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-ZM', {
    timeZone: 'Africa/Lusaka',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ── Main dispatcher ───────────────────────────────────────────────────────

/**
 * Send a notification using a named template.
 *
 * @param {object} args
 * @param {string}  args.key        Template key (e.g. 'tc_token_delivered')
 * @param {object}  args.user       User object — must have phone_number + full_name
 * @param {object}  [args.context]  Extra variables (token, amount, order_id, …)
 * @param {string[]} [args.channels] Restrict to a subset of channels. Default:
 *                                   both channels (respecting template toggles).
 * @returns {Promise<{ template: string, sms: object|null, push: object|null }>}
 */
export async function notify({ key, user, context = {}, channels }) {
  const template = await getTemplate(key);
  if (!template) {
    console.error(`[notifications] Template not found: ${key}`);
    return { template: key, sms: null, push: null, error: 'template_not_found' };
  }

  const fullCtx = { ...buildUserContext(user), ...context };

  const results = { template: key, sms: null, push: null };

  const useSms  = template.sms_enabled  && (!channels || channels.includes('sms'));
  const usePush = template.push_enabled && (!channels || channels.includes('push'));

  // ── SMS dispatch ──
  if (useSms && user?.phone_number) {
    const body = render(template.sms_body, fullCtx);
    const smsResult = await sendSms({ to: user.phone_number, body });
    results.sms = smsResult;

    _logDelivery({
      templateKey: key,
      userId:      user.id ?? null,
      phone:       user.phone_number,
      channel:     'sms',
      status:      smsResult.success ? (smsResult.mock ? 'mocked' : 'sent') : 'failed',
      provider:    smsResult.provider,
      providerRef: smsResult.ref,
      body,
      error:       smsResult.error ?? null,
      ctx:         fullCtx,
    });
  }

  // ── Push dispatch ──
  if (usePush && user?.id) {
    const title = render(template.push_title, fullCtx);
    const body  = render(template.push_body,  fullCtx);
    const pushResult = await sendPush({
      target: { externalUserIds: [String(user.id)] },
      title,
      body,
      data:  { key, ...context },
    });
    results.push = pushResult;

    _logDelivery({
      templateKey: key,
      userId:      user.id ?? null,
      phone:       user.phone_number ?? null,
      channel:     'push',
      status:      pushResult.success ? (pushResult.mock ? 'mocked' : 'sent') : 'failed',
      provider:    pushResult.provider,
      providerRef: pushResult.ref,
      body:        `${title} — ${body}`,
      error:       pushResult.error ?? null,
      ctx:         fullCtx,
    });
  }

  return results;
}

/**
 * Admin-facing helper: render a template against an arbitrary context
 * without sending anything. Used by the Settings page live preview.
 */
export async function previewTemplate(key, context = {}) {
  const template = await getTemplate(key);
  if (!template) return null;
  const ctx = {
    first_name: 'Grace',
    full_name:  'Grace Mwamba',
    phone:      '+260977123456',
    ...context,
  };
  return {
    key:        template.key,
    label:      template.label,
    tier:       template.tier,
    sms_body:   render(template.sms_body,   ctx),
    push_title: render(template.push_title, ctx),
    push_body:  render(template.push_body,  ctx),
  };
}

/**
 * Admin-facing helper: send a live test message to a given phone number.
 */
export async function sendTestNotification({ key, phone, userId, context = {} }) {
  const template = await getTemplate(key);
  if (!template) {
    return { success: false, error: 'template_not_found' };
  }

  const testUser = {
    id:           userId || 'test-user',
    phone_number: phone,
    full_name:    context.full_name || 'Test Customer',
  };

  const ctx = {
    // Reasonable defaults so blank {{vars}} render nicely in a test
    token:        '5738-2041-9637-1084-2956',
    units:        '40',
    amount:       '104',
    due_time:     localTime(new Date(Date.now() + 48 * 3600_000)),
    due_date:     localDate(new Date(Date.now() + 30 * 86400_000)),
    order_id:     'TEST',
    loan_id:      'TEST',
    credit_limit: '100',
    new_limit:    '150',
    old_limit:    '100',
    hours_remaining: '4',
    graduation_hint: '',
    ...context,
  };

  const result = await notify({ key, user: testUser, context: ctx });
  return { success: true, result };
}

// ── Private: persist a delivery attempt to notification_log ──
function _logDelivery({ templateKey, userId, phone, channel, status, provider, providerRef, body, error, ctx }) {
  // Fire-and-forget; we never want a DB write to block the actual send.
  query(
    `INSERT INTO notification_log
       (template_key, user_id, phone_number, channel, status, provider,
        provider_ref, rendered_body, error_message, variables)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      templateKey,
      userId ? String(userId) : null,
      phone ?? null,
      channel,
      status,
      provider,
      providerRef ?? null,
      body,
      error ?? null,
      JSON.stringify(ctx ?? {}),
    ]
  ).catch((err) => {
    console.warn(`[notifications] Failed to log delivery (${templateKey}/${channel}): ${err.message}`);
  });
}
