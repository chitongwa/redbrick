/**
 * Format a number as ZMW currency with commas and two decimal places.
 * e.g. zmw(1250) → "ZMW 1,250.00"
 *      zmw(80)   → "ZMW 80.00"
 */
export function zmw(amount) {
  return `ZMW ${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format just the number portion with commas + 2 decimals (no "ZMW" prefix).
 * e.g. num(1250) → "1,250.00"
 */
export function num(amount) {
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
