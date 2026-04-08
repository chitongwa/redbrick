// ── Real SMS / OTP service via Twilio ──

import twilio from 'twilio';
import env from '../config/env.js';

const client = twilio(env.twilio.accountSid, env.twilio.authToken);

// In production, OTPs should live in Redis with TTL — this is a placeholder.
const store = new Map();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendOtp(phone) {
  const code = generateCode();
  const expiresAt = Date.now() + env.otpExpirySeconds * 1000;
  store.set(phone, { code, expiresAt });

  await client.messages.create({
    body: `Your RedBrick verification code is: ${code}`,
    from: env.twilio.phoneNumber,
    to: phone,
  });

  return { success: true, mock: false };
}

export function verifyOtp(phone, code) {
  const entry = store.get(phone);
  if (!entry)                           return { valid: false, reason: 'No OTP requested' };
  if (Date.now() > entry.expiresAt)     return { valid: false, reason: 'OTP expired' };
  if (entry.code !== code)              return { valid: false, reason: 'Incorrect OTP' };
  store.delete(phone);
  return { valid: true };
}
