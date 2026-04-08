// ── Twilio SMS adapter ──
// Thin wrapper around the Twilio Node SDK with an automatic mock fallback
// when credentials are missing or USE_MOCKS=true.
//
// Used by services/notifications.js — do not import directly from routes.

import env from '../config/env.js';

let client = null;

// Lazy-load the Twilio SDK so the process still boots when the package
// isn't installed (e.g. in CI / preview environments).
async function getClient() {
  if (client) return client;
  if (env.useMocks) return null;
  if (!env.twilio.accountSid || !env.twilio.authToken) return null;

  try {
    const { default: twilio } = await import('twilio');
    client = twilio(env.twilio.accountSid, env.twilio.authToken);
    return client;
  } catch (err) {
    console.warn('[twilio-sms] Twilio SDK not available — falling back to mock:', err.message);
    return null;
  }
}

/**
 * Send an SMS via Twilio.
 * Transparently falls back to a mock (console log + synthetic SID) when
 * Twilio is not configured.
 *
 * @param {object} args
 * @param {string} args.to    E.164 phone number (e.g. +260977123456)
 * @param {string} args.body  Rendered SMS body
 * @returns {Promise<{ success: boolean, provider: string, ref: string, mock?: boolean, error?: string }>}
 */
export async function sendSms({ to, body }) {
  if (!to || !body) {
    return {
      success: false,
      provider: 'twilio',
      ref:      null,
      error:    'Missing required fields: to, body',
    };
  }

  const c = await getClient();

  // ── Mock mode ───────────────────────────────────────────────────────────
  if (!c) {
    const ref = 'mock-sms-' + Math.random().toString(36).slice(2, 12);
    console.log(`[twilio-sms] (mock) → ${to}: ${body}`);
    return { success: true, provider: 'mock', ref, mock: true };
  }

  // ── Live mode ───────────────────────────────────────────────────────────
  try {
    const payload = {
      body,
      to,
      // Prefer a Messaging Service SID if configured (supports A2P 10DLC,
      // sender pools, etc); otherwise fall back to the single "from" number.
      ...(env.twilio.messagingServiceSid
        ? { messagingServiceSid: env.twilio.messagingServiceSid }
        : { from: env.twilio.phoneNumber }),
    };
    const message = await c.messages.create(payload);
    return { success: true, provider: 'twilio', ref: message.sid };
  } catch (err) {
    console.error('[twilio-sms] send failed:', err.message);
    return {
      success: false,
      provider: 'twilio',
      ref:      null,
      error:    err.message,
    };
  }
}
