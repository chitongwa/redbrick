// ── OneSignal push notification adapter ──
// Sends push notifications via the OneSignal REST API (v1).
// Falls back to a mock (console log + synthetic ID) when credentials are
// missing or USE_MOCKS=true.
//
// Used by services/notifications.js — do not import directly from routes.
//
// OneSignal targeting works in two modes:
//   1. include_external_user_ids  — preferred; match by your own user ID
//   2. include_player_ids         — legacy; match by OneSignal device ID
// This adapter accepts either via the `target` argument.

import env from '../config/env.js';

const ONESIGNAL_URL = 'https://onesignal.com/api/v1/notifications';

/**
 * Send a push notification via OneSignal.
 *
 * @param {object} args
 * @param {object} args.target               Targeting info:
 *   - { externalUserIds: string[] }         Match by your external_user_id
 *   - { playerIds: string[] }               Match by OneSignal player/subscription ID
 *   - { segments: string[] }                Broadcast to named segments
 * @param {string} args.title                Notification title
 * @param {string} args.body                 Notification body
 * @param {object} [args.data]               Custom data payload (deep link / template key)
 * @returns {Promise<{ success: boolean, provider: string, ref: string, mock?: boolean, error?: string }>}
 */
export async function sendPush({ target, title, body, data }) {
  if (!title || !body) {
    return {
      success: false,
      provider: 'onesignal',
      ref:      null,
      error:    'Missing required fields: title, body',
    };
  }

  const { appId, apiKey } = env.onesignal;

  // ── Mock mode ───────────────────────────────────────────────────────────
  if (env.useMocks || !appId || !apiKey) {
    const targetSummary = target?.externalUserIds?.join(',')
      ?? target?.playerIds?.join(',')
      ?? target?.segments?.join(',')
      ?? '*';
    const ref = 'mock-push-' + Math.random().toString(36).slice(2, 12);
    console.log(`[onesignal-push] (mock) → ${targetSummary}: ${title} — ${body}`);
    return { success: true, provider: 'mock', ref, mock: true };
  }

  // ── Build the payload ───────────────────────────────────────────────────
  const payload = {
    app_id:    appId,
    headings:  { en: title },
    contents:  { en: body },
    ...(data && { data }),
  };

  if (target?.externalUserIds?.length) {
    payload.include_external_user_ids = target.externalUserIds;
    payload.channel_for_external_user_ids = 'push';
  } else if (target?.playerIds?.length) {
    payload.include_player_ids = target.playerIds;
  } else if (target?.segments?.length) {
    payload.included_segments = target.segments;
  } else {
    return {
      success: false,
      provider: 'onesignal',
      ref:      null,
      error:    'No target supplied (externalUserIds | playerIds | segments)',
    };
  }

  // ── Live send ───────────────────────────────────────────────────────────
  try {
    const response = await fetch(ONESIGNAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json; charset=utf-8',
        'Authorization': `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();

    if (!response.ok || json.errors) {
      const errMsg = json.errors
        ? (Array.isArray(json.errors) ? json.errors.join('; ') : JSON.stringify(json.errors))
        : `HTTP ${response.status}`;
      console.error('[onesignal-push] send failed:', errMsg);
      return { success: false, provider: 'onesignal', ref: null, error: errMsg };
    }

    return { success: true, provider: 'onesignal', ref: json.id };
  } catch (err) {
    console.error('[onesignal-push] network error:', err.message);
    return { success: false, provider: 'onesignal', ref: null, error: err.message };
  }
}
