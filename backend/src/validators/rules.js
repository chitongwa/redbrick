// ── Reusable validation rules ──

/** Zambian phone: +2609XXXXXXXX (12 digits with +) */
const PHONE_RE = /^\+260[9]\d{8}$/;

/** Meter number: 6–20 digit string */
const METER_RE = /^\d{6,20}$/;

export const phone = (v) => {
  if (!v || typeof v !== 'string')       return 'Phone number is required';
  if (!PHONE_RE.test(v.replace(/\s/g, ''))) return 'Must be a valid Zambian phone (+260 9XX XXX XXX)';
  return null;
};

export const otp = (v) => {
  if (!v || typeof v !== 'string')       return 'OTP is required';
  if (!/^\d{6}$/.test(v))               return 'OTP must be exactly 6 digits';
  return null;
};

export const meterNumber = (v) => {
  if (!v || typeof v !== 'string')       return 'Meter number is required';
  if (!METER_RE.test(v))                 return 'Meter number must be 6–20 digits';
  return null;
};

export const positiveAmount = (v) => {
  if (v === undefined || v === null)     return 'Amount is required';
  const n = Number(v);
  if (isNaN(n) || n <= 0)               return 'Amount must be a positive number';
  return null;
};

export const paymentMethod = (v) => {
  if (!v || typeof v !== 'string')       return 'Payment method is required';
  if (!['mtn', 'airtel'].includes(v))    return 'Payment method must be "mtn" or "airtel"';
  return null;
};

export const requiredId = (v) => {
  if (v === undefined || v === null)     return 'ID is required';
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0)    return 'ID must be a positive integer';
  return null;
};
