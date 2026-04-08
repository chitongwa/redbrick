// ── Real mobile-money payment service (placeholder) ──

import env from '../config/env.js';

export async function processPayment({ method, phone, amount }) {
  const config = method === 'mtn' ? env.mtn : env.airtel;

  const res = await fetch(`${config.apiUrl}/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ phone, amount }),
  });

  return res.json();
}
