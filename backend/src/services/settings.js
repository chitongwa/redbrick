// ── Admin-configurable settings service ──
// Reads from the `settings` table. All pricing rates are stored there
// so they can be changed at runtime without redeployment.

import { query } from '../config/db.js';

// ── In-memory cache (refreshed every 60s or on demand) ─────────────────────
let cache = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

/**
 * Get all settings as a key→value map.
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<Record<string, string>>}
 */
export async function getAllSettings(forceRefresh = false) {
  if (!forceRefresh && cache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return cache;
  }

  const result = await query('SELECT key, value FROM settings ORDER BY key');
  const map = {};
  for (const row of result.rows) {
    map[row.key] = row.value;
  }
  cache = map;
  cacheAt = Date.now();
  return map;
}

/**
 * Get a single setting value.
 * @param {string} key
 * @param {string} [fallback]
 * @returns {Promise<string>}
 */
export async function getSetting(key, fallback) {
  const all = await getAllSettings();
  return all[key] ?? fallback;
}

/**
 * Get a numeric setting.
 * @param {string} key
 * @param {number} fallback
 * @returns {Promise<number>}
 */
export async function getNumericSetting(key, fallback) {
  const val = await getSetting(key);
  if (val === undefined || val === null) return fallback;
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

/**
 * Update a setting (admin operation).
 * @param {string} key
 * @param {string} value
 * @param {string} [updatedBy='admin']
 * @returns {Promise<object>}
 */
export async function updateSetting(key, value, updatedBy = 'admin') {
  const result = await query(
    `UPDATE settings SET value = $1, updated_at = now(), updated_by = $2
     WHERE key = $3
     RETURNING key, value, description, updated_at, updated_by`,
    [String(value), updatedBy, key]
  );

  // Invalidate cache
  cache = null;

  if (result.rows.length === 0) {
    // Key doesn't exist — insert it
    const ins = await query(
      `INSERT INTO settings (key, value, updated_by)
       VALUES ($1, $2, $3)
       RETURNING key, value, description, updated_at, updated_by`,
      [key, String(value), updatedBy]
    );
    return ins.rows[0];
  }

  return result.rows[0];
}

/**
 * Get all pricing-related settings as a typed object.
 * Convenience wrapper for the pricing engine.
 * @returns {Promise<object>}
 */
export async function getPricingConfig() {
  const s = await getAllSettings();
  return {
    // Tier 1 — Trade Credit
    retailRatePerKwh:       parseFloat(s['pricing.retail_rate_per_kwh']       ?? '2.50'),
    serviceFeeRate:         parseFloat(s['pricing.service_fee_rate']          ?? '0.04'),
    minPurchaseZmw:         parseFloat(s['pricing.min_purchase_zmw']          ?? '10'),

    // Tier 2 — Loan Credit
    loanFeeRate:            parseFloat(s['pricing.loan_fee_rate']             ?? '0.05'),
    loanFeeType:            s['pricing.loan_fee_type']                        ?? 'percentage',
    loanFlatFeeZmw:         parseFloat(s['pricing.loan_flat_fee_zmw']         ?? '10'),
    loanPeriodDays:         parseInt(s['pricing.loan_period_days']            ?? '30', 10),
    earlyRepaymentDays:     parseInt(s['pricing.early_repayment_days']        ?? '7', 10),
    earlyRepaymentDiscount: parseFloat(s['pricing.early_repayment_discount']  ?? '0.01'),

    // General
    kwhPerZmw:              parseFloat(s['pricing.kwh_per_zmw']              ?? '0.4'),
    maxCreditLimitZmw:      parseFloat(s['pricing.max_credit_limit_zmw']     ?? '500'),
  };
}
