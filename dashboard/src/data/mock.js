// ── Mock data for the RedBrick admin dashboard ──
// 10 Zambian users, 15 loans, trade credit orders, float inventory, graduation queue

// ─── Users ──────────────────────────────────────────────────────────────────
export const users = [
  // Tier 2 — graduated to loan_credit (3 users: high trade credit history, 0 defaults)
  { id: 1,  full_name: 'Grace Mwamba',     phone_number: '+260 97 1234567', kyc_status: 'verified', meters: 2, neighbourhood: 'Chilenje',      created_at: '2025-10-14', tier: 'loan_credit',  tier_upgraded_at: '2026-02-01', trade_credit_transactions: 12, trade_credit_default_count: 0 },
  { id: 5,  full_name: 'Natasha Tembo',    phone_number: '+260 97 5678901', kyc_status: 'verified', meters: 2, neighbourhood: 'Woodlands',      created_at: '2025-11-22', tier: 'loan_credit',  tier_upgraded_at: '2026-03-05', trade_credit_transactions: 10, trade_credit_default_count: 0 },
  { id: 8,  full_name: 'Thandiwe Mulenga', phone_number: '+260 96 8901234', kyc_status: 'verified', meters: 1, neighbourhood: 'Roma',           created_at: '2026-02-14', tier: 'loan_credit',  tier_upgraded_at: '2026-03-28', trade_credit_transactions: 8,  trade_credit_default_count: 0 },

  // Tier 1 — trade_credit (7 users: building up history)
  { id: 2,  full_name: 'Joseph Phiri',     phone_number: '+260 96 2345678', kyc_status: 'verified', meters: 1, neighbourhood: 'Kalingalinga',   created_at: '2025-11-02', tier: 'trade_credit', tier_upgraded_at: null,         trade_credit_transactions: 5,  trade_credit_default_count: 1 },
  { id: 3,  full_name: 'Bwalya Mutale',    phone_number: '+260 97 3456789', kyc_status: 'verified', meters: 1, neighbourhood: 'Mtendere',       created_at: '2025-12-18', tier: 'trade_credit', tier_upgraded_at: null,         trade_credit_transactions: 4,  trade_credit_default_count: 0 },
  { id: 4,  full_name: 'Chisomo Banda',    phone_number: '+260 96 4567890', kyc_status: 'verified', meters: 1, neighbourhood: 'Kanyama',        created_at: '2026-01-05', tier: 'trade_credit', tier_upgraded_at: null,         trade_credit_transactions: 3,  trade_credit_default_count: 1 },
  { id: 6,  full_name: 'Emmanuel Zulu',    phone_number: '+260 96 6789012', kyc_status: 'pending',  meters: 1, neighbourhood: 'Chelstone',      created_at: '2026-03-10', tier: 'trade_credit', tier_upgraded_at: null,         trade_credit_transactions: 1,  trade_credit_default_count: 0 },
  { id: 7,  full_name: 'Mwila Kasonde',    phone_number: '+260 97 7890123', kyc_status: 'verified', meters: 1, neighbourhood: 'Chawama',        created_at: '2025-12-01', tier: 'trade_credit', tier_upgraded_at: null,         trade_credit_transactions: 6,  trade_credit_default_count: 0 },
  { id: 9,  full_name: 'Patrick Chilufya', phone_number: '+260 97 9012345', kyc_status: 'pending',  meters: 1, neighbourhood: 'Kabwata',        created_at: '2026-03-25', tier: 'trade_credit', tier_upgraded_at: null,         trade_credit_transactions: 0,  trade_credit_default_count: 0 },
  { id: 10, full_name: 'Dalitso Nkonde',   phone_number: '+260 96 0123456', kyc_status: 'rejected', meters: 0, neighbourhood: 'Matero',         created_at: '2026-02-28', tier: 'trade_credit', tier_upgraded_at: null,         trade_credit_transactions: 2,  trade_credit_default_count: 0 },
];

// ─── Loans ──────────────────────────────────────────────────────────────────
export const loans = [
  // ── Repaid (8) ──
  { id: 1,  user_id: 1, user_name: 'Grace Mwamba',     meter: '04512378', amount: 150, status: 'repaid',    payment_method: 'mtn',    created_at: '2025-11-10', due_date: '2025-12-10', repaid_at: '2025-12-03' },
  { id: 2,  user_id: 1, user_name: 'Grace Mwamba',     meter: '04512378', amount: 200, status: 'repaid',    payment_method: 'airtel', created_at: '2026-01-08', due_date: '2026-02-07', repaid_at: '2026-02-01' },
  { id: 3,  user_id: 2, user_name: 'Joseph Phiri',     meter: '07823456', amount:  80, status: 'repaid',    payment_method: 'mtn',    created_at: '2025-12-20', due_date: '2026-01-19', repaid_at: '2026-01-15' },
  { id: 4,  user_id: 3, user_name: 'Bwalya Mutale',    meter: '09134567', amount: 120, status: 'repaid',    payment_method: 'airtel', created_at: '2026-01-15', due_date: '2026-02-14', repaid_at: '2026-02-10' },
  { id: 5,  user_id: 5, user_name: 'Natasha Tembo',    meter: '03267890', amount: 250, status: 'repaid',    payment_method: 'mtn',    created_at: '2026-01-02', due_date: '2026-02-01', repaid_at: '2026-01-28' },
  { id: 6,  user_id: 5, user_name: 'Natasha Tembo',    meter: '03267890', amount: 175, status: 'repaid',    payment_method: 'mtn',    created_at: '2026-02-15', due_date: '2026-03-17', repaid_at: '2026-03-14' },
  { id: 7,  user_id: 7, user_name: 'Mwila Kasonde',    meter: '06745123', amount:  50, status: 'repaid',    payment_method: 'airtel', created_at: '2026-02-01', due_date: '2026-03-03', repaid_at: '2026-02-25' },
  { id: 8,  user_id: 8, user_name: 'Thandiwe Mulenga', meter: '08956234', amount: 100, status: 'repaid',    payment_method: 'mtn',    created_at: '2026-03-01', due_date: '2026-03-31', repaid_at: '2026-03-27' },

  // ── Active (4) ──
  { id: 9,  user_id: 1, user_name: 'Grace Mwamba',     meter: '04512378', amount: 180, status: 'active',    payment_method: null,     created_at: '2026-03-20', due_date: '2026-04-19', repaid_at: null },
  { id: 10, user_id: 3, user_name: 'Bwalya Mutale',    meter: '09134567', amount:  60, status: 'active',    payment_method: null,     created_at: '2026-03-25', due_date: '2026-04-24', repaid_at: null },
  { id: 11, user_id: 4, user_name: 'Chisomo Banda',    meter: '05478901', amount: 220, status: 'active',    payment_method: null,     created_at: '2026-04-01', due_date: '2026-05-01', repaid_at: null },
  { id: 12, user_id: 8, user_name: 'Thandiwe Mulenga', meter: '08956234', amount: 130, status: 'active',    payment_method: null,     created_at: '2026-04-03', due_date: '2026-05-03', repaid_at: null },

  // ── Overdue (2) ──
  { id: 13, user_id: 2, user_name: 'Joseph Phiri',     meter: '07823456', amount: 160, status: 'overdue',   payment_method: null,     created_at: '2026-02-10', due_date: '2026-03-12', repaid_at: null },
  { id: 14, user_id: 7, user_name: 'Mwila Kasonde',    meter: '06745123', amount:  90, status: 'overdue',   payment_method: null,     created_at: '2026-02-28', due_date: '2026-03-30', repaid_at: null },

  // ── Defaulted (1) ──
  { id: 15, user_id: 4, user_name: 'Chisomo Banda',    meter: '05478901', amount: 200, status: 'defaulted', payment_method: null,     created_at: '2025-12-05', due_date: '2026-01-04', repaid_at: null },
];

// ─── Transaction histories (ZESCO purchases) ───────────────────────────────
// Each user has 4–18 purchases spread across the last 24 months.
// Units = amount / 2.50.

function tx(id, userId, meter, amount, date) {
  return {
    id,
    user_id: userId,
    meter_number: meter,
    amount_zmw: amount,
    units_purchased: +(amount / 2.5).toFixed(1),
    purchased_at: date,
    source: 'zesco_history',
  };
}

let _id = 0;
const n = () => ++_id;

export const transactions = [
  // ── Grace Mwamba (user 1) — 14 transactions ──
  tx(n(), 1, '04512378', 350, '2024-05-18'),
  tx(n(), 1, '04512378', 280, '2024-07-12'),
  tx(n(), 1, '04512378', 200, '2024-08-25'),
  tx(n(), 1, '04512378', 310, '2024-10-03'),
  tx(n(), 1, '04512378', 150, '2024-11-15'),
  tx(n(), 1, '04512378', 400, '2025-01-08'),
  tx(n(), 1, '04512378', 250, '2025-03-22'),
  tx(n(), 1, '04512378', 180, '2025-05-14'),
  tx(n(), 1, '04512378', 320, '2025-07-01'),
  tx(n(), 1, '04512378', 275, '2025-09-10'),
  tx(n(), 1, '04512378', 200, '2025-11-05'),
  tx(n(), 1, '04512378', 350, '2026-01-12'),
  tx(n(), 1, '04512378', 150, '2026-02-20'),
  tx(n(), 1, '04512378', 300, '2026-03-28'),

  // ── Joseph Phiri (user 2) — 10 transactions ──
  tx(n(), 2, '07823456', 100, '2024-06-10'),
  tx(n(), 2, '07823456', 150, '2024-08-18'),
  tx(n(), 2, '07823456',  80, '2024-11-02'),
  tx(n(), 2, '07823456', 120, '2025-01-25'),
  tx(n(), 2, '07823456', 200, '2025-04-14'),
  tx(n(), 2, '07823456',  75, '2025-06-30'),
  tx(n(), 2, '07823456', 180, '2025-09-08'),
  tx(n(), 2, '07823456', 100, '2025-11-22'),
  tx(n(), 2, '07823456', 250, '2026-01-17'),
  tx(n(), 2, '07823456', 130, '2026-03-05'),

  // ── Bwalya Mutale (user 3) — 12 transactions ──
  tx(n(), 3, '09134567', 200, '2024-05-05'),
  tx(n(), 3, '09134567', 150, '2024-06-28'),
  tx(n(), 3, '09134567', 300, '2024-08-15'),
  tx(n(), 3, '09134567', 100, '2024-10-20'),
  tx(n(), 3, '09134567', 250, '2024-12-12'),
  tx(n(), 3, '09134567', 175, '2025-02-18'),
  tx(n(), 3, '09134567', 350, '2025-04-25'),
  tx(n(), 3, '09134567', 200, '2025-07-10'),
  tx(n(), 3, '09134567', 125, '2025-09-22'),
  tx(n(), 3, '09134567', 280, '2025-12-05'),
  tx(n(), 3, '09134567', 150, '2026-02-10'),
  tx(n(), 3, '09134567', 200, '2026-03-18'),

  // ── Chisomo Banda (user 4) — 8 transactions ──
  tx(n(), 4, '05478901', 100, '2024-09-12'),
  tx(n(), 4, '05478901', 250, '2024-11-28'),
  tx(n(), 4, '05478901', 150, '2025-02-05'),
  tx(n(), 4, '05478901', 200, '2025-04-18'),
  tx(n(), 4, '05478901', 300, '2025-07-22'),
  tx(n(), 4, '05478901', 175, '2025-10-10'),
  tx(n(), 4, '05478901', 120, '2026-01-08'),
  tx(n(), 4, '05478901', 250, '2026-03-15'),

  // ── Natasha Tembo (user 5) — 18 transactions ──
  tx(n(), 5, '03267890', 200, '2024-04-10'),
  tx(n(), 5, '03267890', 350, '2024-05-15'),
  tx(n(), 5, '03267890', 150, '2024-06-22'),
  tx(n(), 5, '03267890', 400, '2024-07-30'),
  tx(n(), 5, '03267890', 250, '2024-09-05'),
  tx(n(), 5, '03267890', 300, '2024-10-12'),
  tx(n(), 5, '03267890', 180, '2024-11-18'),
  tx(n(), 5, '03267890', 350, '2025-01-05'),
  tx(n(), 5, '03267890', 275, '2025-02-15'),
  tx(n(), 5, '03267890', 200, '2025-03-28'),
  tx(n(), 5, '03267890', 150, '2025-05-10'),
  tx(n(), 5, '03267890', 320, '2025-06-22'),
  tx(n(), 5, '03267890', 250, '2025-08-08'),
  tx(n(), 5, '03267890', 400, '2025-10-01'),
  tx(n(), 5, '03267890', 175, '2025-11-15'),
  tx(n(), 5, '03267890', 300, '2026-01-10'),
  tx(n(), 5, '03267890', 200, '2026-02-22'),
  tx(n(), 5, '03267890', 250, '2026-03-30'),

  // ── Emmanuel Zulu (user 6) — 4 transactions (new user) ──
  tx(n(), 6, '02189034', 100, '2026-01-15'),
  tx(n(), 6, '02189034',  75, '2026-02-08'),
  tx(n(), 6, '02189034', 150, '2026-03-02'),
  tx(n(), 6, '02189034',  50, '2026-03-28'),

  // ── Mwila Kasonde (user 7) — 9 transactions ──
  tx(n(), 7, '06745123', 150, '2024-07-20'),
  tx(n(), 7, '06745123', 200, '2024-10-05'),
  tx(n(), 7, '06745123', 100, '2024-12-18'),
  tx(n(), 7, '06745123', 250, '2025-03-10'),
  tx(n(), 7, '06745123', 175, '2025-05-28'),
  tx(n(), 7, '06745123', 300, '2025-08-15'),
  tx(n(), 7, '06745123', 125, '2025-11-02'),
  tx(n(), 7, '06745123', 200, '2026-01-20'),
  tx(n(), 7, '06745123',  80, '2026-03-12'),

  // ── Thandiwe Mulenga (user 8) — 7 transactions ──
  tx(n(), 8, '08956234', 180, '2024-10-08'),
  tx(n(), 8, '08956234', 250, '2025-01-12'),
  tx(n(), 8, '08956234', 100, '2025-04-05'),
  tx(n(), 8, '08956234', 300, '2025-06-20'),
  tx(n(), 8, '08956234', 150, '2025-09-15'),
  tx(n(), 8, '08956234', 200, '2025-12-10'),
  tx(n(), 8, '08956234', 275, '2026-03-02'),

  // ── Patrick Chilufya (user 9) — 6 transactions ──
  tx(n(), 9, '01234589', 120, '2025-05-12'),
  tx(n(), 9, '01234589', 200, '2025-08-22'),
  tx(n(), 9, '01234589',  80, '2025-10-30'),
  tx(n(), 9, '01234589', 150, '2025-12-18'),
  tx(n(), 9, '01234589', 250, '2026-02-05'),
  tx(n(), 9, '01234589', 100, '2026-03-20'),

  // ── Dalitso Nkonde (user 10) — 5 transactions ──
  tx(n(), 10, '03890127', 100, '2025-06-15'),
  tx(n(), 10, '03890127', 175, '2025-09-28'),
  tx(n(), 10, '03890127',  60, '2025-12-05'),
  tx(n(), 10, '03890127', 200, '2026-01-22'),
  tx(n(), 10, '03890127', 150, '2026-03-08'),
];

// ─── Derived stats (computed from the data above) ───────────────────────────
const _activeLoans   = loans.filter(l => l.status === 'active').length;
const _repaidLoans   = loans.filter(l => l.status === 'repaid').length;
const _totalSettled  = _repaidLoans + loans.filter(l => l.status === 'defaulted').length;
const _repaymentRate = _totalSettled > 0 ? +( (_repaidLoans / _totalSettled) * 100 ).toFixed(1) : 0;
const _totalDisbursed = loans.reduce((sum, l) => sum + l.amount, 0);

export const stats = {
  totalUsers:     users.length,
  activeLoans:    _activeLoans,
  repaymentRate:  _repaymentRate,
  totalDisbursed: _totalDisbursed,
};

// ─── Scoring distribution (derived from transaction averages) ───────────────
function computeCreditLimit(userTxs) {
  const months = new Map();
  for (const t of userTxs) {
    const key = t.purchased_at.slice(0, 7); // YYYY-MM
    months.set(key, (months.get(key) || 0) + t.amount_zmw);
  }
  if (months.size < 3) return 20;
  const avg = [...months.values()].reduce((a, b) => a + b, 0) / months.size;
  return Math.min(500, Math.max(20, Math.round(avg * 0.5)));
}

const _userLimits = users.map(u => {
  const userTxs = transactions.filter(t => t.user_id === u.id);
  return computeCreditLimit(userTxs);
});

const _avgLimit = _userLimits.length > 0
  ? +( _userLimits.reduce((a, b) => a + b, 0) / _userLimits.length ).toFixed(1)
  : 0;

const _dist = [
  { range: '0–50',    count: 0 },
  { range: '51–100',  count: 0 },
  { range: '101–150', count: 0 },
  { range: '151–200', count: 0 },
  { range: '201–250', count: 0 },
  { range: '251–350', count: 0 },
  { range: '351–500', count: 0 },
];
for (const lim of _userLimits) {
  if (lim <= 50)       _dist[0].count++;
  else if (lim <= 100) _dist[1].count++;
  else if (lim <= 150) _dist[2].count++;
  else if (lim <= 200) _dist[3].count++;
  else if (lim <= 250) _dist[4].count++;
  else if (lim <= 350) _dist[5].count++;
  else                 _dist[6].count++;
}

export const scoringData = {
  avgCreditLimit: _avgLimit,
  totalScored:    users.filter(u => u.kyc_status === 'verified').length,
  modelVersion:   'v0.2.0',
  distribution:   _dist,
};

// ─── Account freeze status (derived from trade credit orders) ───────────────
// Joseph Phiri (id 2) and Chisomo Banda (id 4) have defaulted trade credit.
export const frozenAccounts = [2, 4]; // user IDs currently frozen

// ─── Trade Credit Orders (Tier 1) ──────────────────────────────────────────
// Rich dataset covering all statuses: token_delivered, paid, overdue, frozen.
// Created_at dates are within the last 7 days relative to 2026-04-08 ("today").

const todayIso = '2026-04-08';
const now = new Date(`${todayIso}T10:00:00Z`);

function hoursAgo(h) {
  const d = new Date(now.getTime() - h * 3600 * 1000);
  return d.toISOString();
}
function hoursFromNow(h) {
  const d = new Date(now.getTime() + h * 3600 * 1000);
  return d.toISOString();
}

export const tradeCreditOrders = [
  // ── Paid today (3) ──
  {
    id: 'tc-001', user_id: 1, user_name: 'Grace Mwamba',  meter: '04512378',
    electricity_amt: 100, service_fee: 4, total_due: 104, units_kwh: 40,
    status: 'paid', created_at: hoursAgo(6),  due_at: hoursFromNow(42),
    paid_at: hoursAgo(3), payment_method: 'mtn',
    token_code: '1234-5678-9012-3456-7890',
  },
  {
    id: 'tc-002', user_id: 5, user_name: 'Natasha Tembo', meter: '03267890',
    electricity_amt: 200, service_fee: 8, total_due: 208, units_kwh: 80,
    status: 'paid', created_at: hoursAgo(5),  due_at: hoursFromNow(43),
    paid_at: hoursAgo(1), payment_method: 'airtel',
    token_code: '2345-6789-0123-4567-8901',
  },
  {
    id: 'tc-003', user_id: 7, user_name: 'Mwila Kasonde', meter: '06745123',
    electricity_amt:  50, service_fee: 2, total_due:  52, units_kwh: 20,
    status: 'paid', created_at: hoursAgo(10), due_at: hoursFromNow(38),
    paid_at: hoursAgo(2), payment_method: 'mtn',
    token_code: '3456-7890-1234-5678-9012',
  },

  // ── Token delivered, payment pending (4) ──
  {
    id: 'tc-004', user_id: 3, user_name: 'Bwalya Mutale',    meter: '09134567',
    electricity_amt: 150, service_fee: 6, total_due: 156, units_kwh: 60,
    status: 'token_delivered', created_at: hoursAgo(8),  due_at: hoursFromNow(40),
    paid_at: null, payment_method: null,
    token_code: '4567-8901-2345-6789-0123',
  },
  {
    id: 'tc-005', user_id: 1, user_name: 'Grace Mwamba',     meter: '04512378',
    electricity_amt: 120, service_fee: 4.80, total_due: 124.80, units_kwh: 48,
    status: 'token_delivered', created_at: hoursAgo(12), due_at: hoursFromNow(36),
    paid_at: null, payment_method: null,
    token_code: '5678-9012-3456-7890-1234',
  },
  {
    id: 'tc-006', user_id: 8, user_name: 'Thandiwe Mulenga', meter: '08956234',
    electricity_amt:  80, service_fee: 3.20, total_due: 83.20, units_kwh: 32,
    status: 'token_delivered', created_at: hoursAgo(20), due_at: hoursFromNow(28),
    paid_at: null, payment_method: null,
    token_code: '6789-0123-4567-8901-2345',
  },
  {
    id: 'tc-007', user_id: 6, user_name: 'Emmanuel Zulu',    meter: '02189034',
    electricity_amt:  60, service_fee: 2.40, total_due: 62.40, units_kwh: 24,
    status: 'token_delivered', created_at: hoursAgo(30), due_at: hoursFromNow(18),
    paid_at: null, payment_method: null,
    token_code: '7890-1234-5678-9012-3456',
  },

  // ── Overdue, not yet frozen (past due, within 48h window) (2) ──
  {
    id: 'tc-008', user_id: 3, user_name: 'Bwalya Mutale',  meter: '09134567',
    electricity_amt: 100, service_fee: 4, total_due: 104, units_kwh: 40,
    status: 'overdue', created_at: hoursAgo(38), due_at: hoursAgo(14),
    paid_at: null, payment_method: null,
    token_code: '8901-2345-6789-0123-4567',
  },
  {
    id: 'tc-009', user_id: 7, user_name: 'Mwila Kasonde',  meter: '06745123',
    electricity_amt:  70, service_fee: 2.80, total_due: 72.80, units_kwh: 28,
    status: 'overdue', created_at: hoursAgo(40), due_at: hoursAgo(16),
    paid_at: null, payment_method: null,
    token_code: '9012-3456-7890-1234-5678',
  },

  // ── Frozen / defaulted (48h+ past due) (2) ──
  {
    id: 'tc-010', user_id: 2, user_name: 'Joseph Phiri',   meter: '07823456',
    electricity_amt: 100, service_fee: 4, total_due: 104, units_kwh: 40,
    status: 'frozen', created_at: hoursAgo(84), due_at: hoursAgo(60),
    paid_at: null, payment_method: null, frozen_at: hoursAgo(12),
    token_code: '0123-4567-8901-2345-6789',
  },
  {
    id: 'tc-011', user_id: 4, user_name: 'Chisomo Banda',  meter: '05478901',
    electricity_amt: 150, service_fee: 6, total_due: 156, units_kwh: 60,
    status: 'frozen', created_at: hoursAgo(96), due_at: hoursAgo(72),
    paid_at: null, payment_method: null, frozen_at: hoursAgo(24),
    token_code: '1234-0987-6543-2109-8765',
  },

  // ── Earlier paid history (for trend data) ──
  {
    id: 'tc-012', user_id: 1, user_name: 'Grace Mwamba',   meter: '04512378',
    electricity_amt: 100, service_fee: 4, total_due: 104, units_kwh: 40,
    status: 'paid', created_at: hoursAgo(26), due_at: hoursFromNow(22),
    paid_at: hoursAgo(20), payment_method: 'mtn',
    token_code: 'PRV1-PRV1-PRV1-PRV1-PRV1',
  },
  {
    id: 'tc-013', user_id: 5, user_name: 'Natasha Tembo',  meter: '03267890',
    electricity_amt: 180, service_fee: 7.20, total_due: 187.20, units_kwh: 72,
    status: 'paid', created_at: hoursAgo(32), due_at: hoursFromNow(16),
    paid_at: hoursAgo(26), payment_method: 'airtel',
    token_code: 'PRV2-PRV2-PRV2-PRV2-PRV2',
  },
];

// ─── Float Inventory (bulk ZESCO purchases) ────────────────────────────────
// Batches represent units purchased in bulk from ZESCO at wholesale cost.
// Over the last 30 days we've burned ~600 units/day on average.

export const floatPurchases = [
  { id: 'fp-001', purchased_at: '2026-02-10', units_purchased: 8000,  cost_zmw: 18000, cost_per_unit: 2.25, vendor: 'ZESCO Bulk',      reference: 'ZB-20260210-001', notes: 'Q1 top-up' },
  { id: 'fp-002', purchased_at: '2026-02-20', units_purchased: 5000,  cost_zmw: 11250, cost_per_unit: 2.25, vendor: 'ZESCO Bulk',      reference: 'ZB-20260220-002', notes: '' },
  { id: 'fp-003', purchased_at: '2026-03-01', units_purchased: 10000, cost_zmw: 22500, cost_per_unit: 2.25, vendor: 'ZESCO Bulk',      reference: 'ZB-20260301-003', notes: 'March inventory' },
  { id: 'fp-004', purchased_at: '2026-03-12', units_purchased: 7500,  cost_zmw: 16875, cost_per_unit: 2.25, vendor: 'ZESCO Bulk',      reference: 'ZB-20260312-004', notes: '' },
  { id: 'fp-005', purchased_at: '2026-03-22', units_purchased: 6000,  cost_zmw: 13500, cost_per_unit: 2.25, vendor: 'ZESCO Bulk',      reference: 'ZB-20260322-005', notes: '' },
  { id: 'fp-006', purchased_at: '2026-04-01', units_purchased: 9000,  cost_zmw: 20250, cost_per_unit: 2.25, vendor: 'ZESCO Bulk',      reference: 'ZB-20260401-006', notes: 'April inventory' },
  { id: 'fp-007', purchased_at: '2026-04-06', units_purchased: 4000,  cost_zmw:  9000, cost_per_unit: 2.25, vendor: 'ZESCO Wholesale', reference: 'ZW-20260406-007', notes: 'Emergency top-up' },
];

// Current float balance = total purchased - total consumed (approximation)
const _totalPurchasedUnits = floatPurchases.reduce((s, p) => s + p.units_purchased, 0);
const _totalPurchasedCost  = floatPurchases.reduce((s, p) => s + p.cost_zmw, 0);
// Assume ~65% already consumed over the last 60 days
const _consumedUnits = Math.round(_totalPurchasedUnits * 0.65);
const _remainingUnits = _totalPurchasedUnits - _consumedUnits;
// Weighted avg cost per unit
const _avgCostPerUnit = _totalPurchasedCost / _totalPurchasedUnits;

export const floatBalance = {
  total_units:        _remainingUnits,
  total_value_zmw:    +(_remainingUnits * _avgCostPerUnit).toFixed(2),
  avg_cost_per_unit:  +_avgCostPerUnit.toFixed(4),
  last_updated:       `${todayIso}T10:00:00Z`,
};

// Daily float consumption for last 30 days (seeded pseudo-random but deterministic)
export const floatDailyConsumption = (() => {
  const days = [];
  const end = new Date(`${todayIso}T00:00:00Z`);
  // Deterministic "random" based on index
  for (let i = 29; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    // Smooth burn between 400-800 units/day
    const base = 550;
    const wiggle = Math.sin(i * 0.7) * 120 + Math.cos(i * 1.3) * 80;
    const units = Math.max(200, Math.round(base + wiggle));
    days.push({ date: key, units_consumed: units, zmw_value: +(units * _avgCostPerUnit).toFixed(2) });
  }
  return days;
})();

// ─── Graduation Queue — Tier 1 users who have met criteria ────────────────
// Approved candidates from the scoring engine awaiting admin sign-off.
// Mwila Kasonde (id 7) has 6 transactions + clean record → eligible.
// Bwalya Mutale (id 3) is borderline (4 trade credits).

export const graduationQueue = [
  {
    id: 'gq-001',
    user_id: 7,
    user_name: 'Mwila Kasonde',
    phone_number: '+260 97 7890123',
    neighbourhood: 'Chawama',
    transactions_completed: 6,
    trade_credit_default_count: 0,
    avg_payment_time_hours: 18.4,
    account_age_months: 4.2,
    total_trade_credit_zmw: 540,
    proposed_credit_limit: 120,
    decision: 'approved',
    criteria_met: {
      min_transactions: true,
      no_defaults: true,
      account_age: true,
      kyc_verified: true,
      total_volume: true,
    },
    evaluated_at: hoursAgo(4),
    status: 'pending',
  },
  {
    id: 'gq-002',
    user_id: 3,
    user_name: 'Bwalya Mutale',
    phone_number: '+260 97 3456789',
    neighbourhood: 'Mtendere',
    transactions_completed: 4,
    trade_credit_default_count: 0,
    avg_payment_time_hours: 22.1,
    account_age_months: 3.6,
    total_trade_credit_zmw: 380,
    proposed_credit_limit: 80,
    decision: 'approved',
    criteria_met: {
      min_transactions: false,
      no_defaults: true,
      account_age: true,
      kyc_verified: true,
      total_volume: false,
    },
    evaluated_at: hoursAgo(18),
    status: 'pending',
  },
  {
    id: 'gq-003',
    user_id: 6,
    user_name: 'Emmanuel Zulu',
    phone_number: '+260 96 6789012',
    neighbourhood: 'Chelstone',
    transactions_completed: 1,
    trade_credit_default_count: 0,
    avg_payment_time_hours: 16.0,
    account_age_months: 1.0,
    total_trade_credit_zmw: 60,
    proposed_credit_limit: 50,
    decision: 'approved',
    criteria_met: {
      min_transactions: false,
      no_defaults: true,
      account_age: false,
      kyc_verified: false,
      total_volume: false,
    },
    evaluated_at: hoursAgo(30),
    status: 'pending',
  },
];

// ─── Tier 2 loan balances per user (outstanding amounts) ───────────────────
// Computed from active/overdue loans.
export const loanBalances = (() => {
  const map = {};
  for (const u of users) {
    const active = loans.filter(l => l.user_id === u.id && (l.status === 'active' || l.status === 'overdue'));
    map[u.id] = {
      credit_limit: u.tier === 'loan_credit' ? Math.max(100, active.reduce((s, l) => s + l.amount, 0) + 50) : 0,
      outstanding: active.reduce((s, l) => s + l.amount, 0),
    };
  }
  return map;
})();

// ═══════════════════════════════════════════════════════════════════════════
//  REVENUE & ANALYTICS DATASETS
//  Generated deterministically so investor conversations show a plausible
//  12-month trajectory (April 2025 → April 2026). Growth is modelled as a
//  monthly 18% compound so the chart tells a "hockey stick" story without
//  ever going down.
// ═══════════════════════════════════════════════════════════════════════════

// ─── 30-day daily revenue (deterministic sine wave around a rising mean) ──
export const revenueDaily = (() => {
  const out = [];
  const base = new Date('2026-04-08T00:00:00Z');
  for (let i = 29; i >= 0; i--) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() - i);
    const dayIdx = 29 - i;
    // Trade credit fee revenue grows from ~35 to ~95 ZMW/day, with weekly rhythm
    const tc  = 35 + dayIdx * 2 + Math.sin(dayIdx / 1.3) * 8;
    // Loan fees grow from ~12 to ~80 ZMW/day (Tier 2 is the growth engine)
    const loan = Math.max(0, 12 + dayIdx * 2.3 + Math.cos(dayIdx / 1.8) * 10);
    // Float margin (bulk vs retail spread) grows with volume
    const floatMargin = 25 + dayIdx * 1.5 + Math.sin(dayIdx / 2) * 5;
    // Transaction count (for "per-txn revenue" calc)
    const txCount = Math.round(18 + dayIdx * 0.9 + Math.sin(dayIdx / 1.6) * 4);

    out.push({
      date:          d.toISOString().slice(0, 10),
      tc_fees:       Math.round(tc * 100) / 100,
      loan_fees:     Math.round(loan * 100) / 100,
      float_margin:  Math.round(floatMargin * 100) / 100,
      total:         Math.round((tc + loan + floatMargin) * 100) / 100,
      transactions:  txCount,
    });
  }
  return out;
})();

// ─── Weekly roll-up (last 12 ISO weeks) ───────────────────────────────────
export const revenueWeekly = (() => {
  const out = [];
  for (let w = 11; w >= 0; w--) {
    const weekIdx = 11 - w;
    // Weekly growth ~15% compound
    const growth = Math.pow(1.15, weekIdx);
    const tc    = Math.round((180 + 20 * weekIdx) * growth);
    const loan  = Math.round((80  + 30 * weekIdx) * growth);
    const fm    = Math.round((130 + 15 * weekIdx) * growth);
    const txCount = Math.round((120 + 10 * weekIdx) * growth);

    // Build a "W14" style label — week 14..25 of 2026 so the most recent
    // week corresponds to ~early April 2026.
    const weekNum = 14 + weekIdx;
    out.push({
      period:        `2026-W${String(weekNum).padStart(2, '0')}`,
      label:         `W${weekNum}`,
      tc_fees:       tc,
      loan_fees:     loan,
      float_margin:  fm,
      total:         tc + loan + fm,
      transactions:  txCount,
    });
  }
  return out;
})();

// ─── Monthly roll-up (12 months ending April 2026) ────────────────────────
export const revenueMonthly = (() => {
  const months = [
    '2025-05','2025-06','2025-07','2025-08','2025-09','2025-10',
    '2025-11','2025-12','2026-01','2026-02','2026-03','2026-04',
  ];
  const labels = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
  return months.map((m, i) => {
    const growth = Math.pow(1.18, i);          // 18% monthly compound
    const tc     = Math.round(620  * growth);
    const loan   = Math.round(180  * growth);  // Loans start slow, overtake from month 6
    const fm     = Math.round(430  * growth);
    const tx     = Math.round(320  * growth);
    return {
      period:        m,
      label:         labels[i],
      tc_fees:       tc,
      loan_fees:     loan,
      float_margin:  fm,
      total:         tc + loan + fm,
      transactions:  tx,
    };
  });
})();

// ─── Customer behaviour KPIs ──────────────────────────────────────────────
export const behaviourStats = {
  // Tier 1 — time to settle trade credit
  avg_payment_time_hours:     18.4,        // under 24h target ✓
  target_payment_time_hours:  24,
  payment_time_trend:         -2.1,        // -2.1h vs last month (improving)

  // Default rates
  default_rate_tier1:         0.062,       // 6.2% of Tier 1 orders defaulted (48h)
  default_rate_tier2:         0.019,       // 1.9% of Tier 2 loans went overdue
  default_trend_tier1:        -0.008,      // -0.8 pp vs last month
  default_trend_tier2:        -0.004,

  // Graduation funnel
  total_tier1_customers:      412,
  graduated_to_tier2:         87,
  graduation_rate:            0.211,       // 21.1% of Tier 1 graduate
  avg_days_to_graduate:       62,          // mean time from signup → Tier 2
  median_days_to_graduate:    55,

  // Retention
  retention_30d:              0.734,       // 73.4% of customers transact again in 30d
  retention_60d:              0.584,
  retention_90d:              0.492,
};

// ─── Monthly cohorts (12 months, with tx depth + graduation) ──────────────
// Each row: a cohort = all users who signed up that month.
// Columns = % of that cohort who completed N+ transactions, and % who graduated.
export const cohorts = (() => {
  // Raw data — hand-tuned so the narrative reads cleanly for investors.
  // Older cohorts have had more time to accumulate transactions + graduate.
  const raw = [
    // month,     new,  tx1,  tx3,  tx6,  grad, avg_days
    ['2025-05',   28,   27,   24,   19,    8,    58],
    ['2025-06',   34,   33,   29,   22,    9,    55],
    ['2025-07',   41,   39,   34,   26,   11,    60],
    ['2025-08',   48,   46,   40,   30,   13,    62],
    ['2025-09',   55,   52,   44,   33,   14,    58],
    ['2025-10',   62,   58,   49,   36,   14,    65],
    ['2025-11',   68,   64,   52,   38,   11,    63],
    ['2025-12',   74,   70,   55,   38,    7,    67],  // holiday dip
    ['2026-01',   85,   80,   62,   40,    4,   null], // too recent for 6 tx
    ['2026-02',   94,   87,   65,   28,    0,   null],
    ['2026-03',  108,   98,   60,    0,    0,   null],
    ['2026-04',   52,   38,    0,    0,    0,   null],
  ];
  const labels = ['May 25','Jun 25','Jul 25','Aug 25','Sep 25','Oct 25','Nov 25','Dec 25','Jan 26','Feb 26','Mar 26','Apr 26'];
  return raw.map(([month, newCount, tx1, tx3, tx6, grad, avgDays], i) => ({
    month,
    label:         labels[i],
    new_customers: newCount,
    tx_1:          tx1,
    tx_3:          tx3,
    tx_6:          tx6,
    graduated:     grad,
    tx_1_pct:      newCount ? Math.round((tx1  / newCount) * 1000) / 10 : 0,
    tx_3_pct:      newCount ? Math.round((tx3  / newCount) * 1000) / 10 : 0,
    tx_6_pct:      newCount ? Math.round((tx6  / newCount) * 1000) / 10 : 0,
    graduated_pct: newCount ? Math.round((grad / newCount) * 1000) / 10 : 0,
    avg_days_to_graduate: avgDays,
  }));
})();

// ─── Float economics ──────────────────────────────────────────────────────
// Average bulk cost vs retail price. Used by the float margin card.
export const floatEconomics = {
  avg_bulk_cost_per_kwh:    2.25,    // ZMW — wholesale rate from ZESCO
  avg_retail_price_per_kwh: 2.50,    // ZMW — retail rate customers pay
  margin_per_kwh:           0.25,    // 10% margin
  margin_pct:               0.10,
  total_units_sold_30d:     4200,    // kWh moved in last 30 days
  total_margin_30d:         4200 * 0.25,  // ZMW 1,050
};
