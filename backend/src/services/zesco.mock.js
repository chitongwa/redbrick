// ── Mock ZESCO integration ──
// Returns canned data for meter verification, balance, and token purchase.

/**
 * Verify a meter number against ZESCO.
 * In mock mode every meter is valid.
 */
export function verifyMeter(meterNumber) {
  console.log(`[mock-zesco] Verifying meter ${meterNumber}`);
  return {
    verified: true,
    customerName: 'ZESCO Customer',
    meterNumber,
    mock: true,
  };
}

/**
 * Get the current balance / last-vend info for a meter.
 */
export function getBalance(meterNumber) {
  console.log(`[mock-zesco] Balance lookup for ${meterNumber}`);
  return {
    meterNumber,
    balance_zmw: 1425.0,
    units_kwh: 812.5,
    lastVendDate: '2026-03-28T10:00:00+02:00',
    mock: true,
  };
}

/**
 * Purchase electricity tokens from ZESCO.
 * Returns a dummy 20-digit token code.
 */
export function purchaseTokens(meterNumber, amountZmw) {
  const units = +(amountZmw / 2.5).toFixed(1);
  const token = Array.from({ length: 4 }, () =>
    String(Math.floor(1000 + Math.random() * 9000))
  ).join(' ') + ' ' + String(Math.floor(1000 + Math.random() * 9000));

  console.log(`[mock-zesco] Purchased ZMW ${amountZmw} → ${units} kWh for ${meterNumber}`);

  return {
    meterNumber,
    amountZmw,
    units_kwh: units,
    tokenCode: token,
    mock: true,
  };
}
