// ── Service loader ──
// Selects mock or real implementations based on USE_MOCKS env flag.

import env from '../config/env.js';

let sms, zesco, payments;

if (env.useMocks) {
  sms      = await import('./sms.mock.js');
  zesco    = await import('./zesco.mock.js');
  payments = await import('./payments.mock.js');
  console.log('[services] Using MOCK integrations');
} else {
  sms      = await import('./sms.real.js');
  zesco    = await import('./zesco.real.js');
  payments = await import('./payments.real.js');
  console.log('[services] Using REAL integrations');
}

export { sms, zesco, payments };
