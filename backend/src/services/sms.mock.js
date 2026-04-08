// ── Mock SMS / OTP service ──
// In serverless environments the in-memory Map resets between invocations,
// so verifyOtp simply accepts the hardcoded code "123456" directly.

const MOCK_CODE = '123456';
const store = new Map();    // phone → { code, expiresAt }  (works locally, not in serverless)

export function sendOtp(phone) {
  const expiresAt = Date.now() + 5 * 60 * 1000;
  store.set(phone, { code: MOCK_CODE, expiresAt });
  console.log(`[mock-sms] OTP ${MOCK_CODE} sent to ${phone}`);
  return { success: true, mock: true };
}

export function verifyOtp(phone, code) {
  // First try the in-memory store (works for local / long-running server)
  const entry = store.get(phone);
  if (entry) {
    if (Date.now() > entry.expiresAt) return { valid: false, reason: 'OTP expired' };
    if (entry.code !== code)           return { valid: false, reason: 'Incorrect OTP' };
    store.delete(phone);
    return { valid: true };
  }

  // Fallback: in serverless / mock mode, accept the hardcoded code directly
  if (code === MOCK_CODE) {
    return { valid: true };
  }

  return { valid: false, reason: 'Incorrect OTP' };
}
