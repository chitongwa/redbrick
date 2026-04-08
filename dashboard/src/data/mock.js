// ── Mock data for the RedBrick admin dashboard ──
// 10 Zambian users, 15 loans, full ZESCO transaction histories

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
