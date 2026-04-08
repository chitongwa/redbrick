// ── Real ZESCO integration (placeholder) ──
// Replace fetch calls with actual ZESCO API endpoints when available.

import env from '../config/env.js';

export async function verifyMeter(meterNumber) {
  const res = await fetch(`${env.zesco.apiUrl}/meters/${meterNumber}/verify`, {
    headers: { 'Authorization': `Bearer ${env.zesco.apiKey}` },
  });
  return res.json();
}

export async function getBalance(meterNumber) {
  const res = await fetch(`${env.zesco.apiUrl}/meters/${meterNumber}/balance`, {
    headers: { 'Authorization': `Bearer ${env.zesco.apiKey}` },
  });
  return res.json();
}

export async function purchaseTokens(meterNumber, amountZmw) {
  const res = await fetch(`${env.zesco.apiUrl}/meters/${meterNumber}/purchase`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.zesco.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amountZmw }),
  });
  return res.json();
}
