// ── PostgreSQL connection pool ──

import pg from 'pg';
import env from './env.js';

let pool;

// Only create a real pool if we have a DATABASE_URL and mocks are off,
// or if DATABASE_URL actually points to a running server.
// In serverless mock mode (Vercel) we skip the pool entirely.
if (!env.useMocks) {
  pool = new pg.Pool({ connectionString: env.databaseUrl });
  pool.on('error', (err) => {
    console.error('[db] Unexpected pool error:', err.message);
  });
}

/**
 * Run a parameterised query.
 * In mock mode returns a fake result based on the query.
 * @param {string}  text   SQL with $1, $2… placeholders
 * @param {any[]}   params Bind values
 * @returns {Promise<pg.QueryResult>}
 */
export function query(text, params) {
  if (env.useMocks) {
    return mockQuery(text, params);
  }
  return pool.query(text, params);
}

/**
 * Mock query handler — returns plausible rows for known queries.
 */
function mockQuery(text, params) {
  const sql = text.toLowerCase();

  // User upsert (auth flow)
  if (sql.includes('insert into users')) {
    const phone = params[0];
    return Promise.resolve({
      rows: [{
        id: 'mock-user-' + phone.slice(-4),
        phone_number: phone,
        full_name: params[1] || phone,
        kyc_status: 'verified',
        tier: 'trade_credit',
        tier_upgraded_at: null,
        trade_credit_transactions: 0,
        trade_credit_default_count: 0,
        account_frozen: false,
      }],
    });
  }

  // User profile lookup (GET /users/me)
  if (sql.includes('from users') && sql.includes('where') && sql.includes('id')) {
    return Promise.resolve({
      rows: [{
        id: params[0],
        phone_number: '+260912345678',
        full_name: 'Mock User',
        kyc_status: 'verified',
        tier: 'trade_credit',
        tier_upgraded_at: null,
        trade_credit_transactions: 3,
        trade_credit_default_count: 0,
        account_frozen: false,
        created_at: '2025-10-14T00:00:00Z',
      }],
    });
  }

  // User tier update (upgrade to loan_credit)
  if (sql.includes('update users') && sql.includes('tier')) {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  // User increment trade_credit_transactions or default count
  if (sql.includes('update users') && (sql.includes('trade_credit_transactions') || sql.includes('account_frozen'))) {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  // Trade credit order insert
  if (sql.includes('insert into trade_credit_orders')) {
    return Promise.resolve({
      rows: [{
        id: 'mock-tco-1',
        user_id: params[0],
        meter_id: params[1],
        electricity_amt: params[2],
        service_fee: params[3],
        total_due: params[4],
        token_delivered: params[5],
        units_kwh: params[6],
        status: 'pending_payment',
        payment_due_at: params[7],
        created_at: new Date().toISOString(),
      }],
    });
  }

  // Trade credit order lookup by id
  if (sql.includes('from trade_credit_orders') && sql.includes('where') && !sql.includes('count')) {
    return Promise.resolve({
      rows: [{
        id: params[0],
        user_id: '__mock_any__',
        meter_id: 'mock-meter-1',
        electricity_amt: 100,
        service_fee: 4,
        total_due: 104,
        token_delivered: '5738 2041 9637 1084 2956',
        units_kwh: 40,
        status: 'pending_payment',
        payment_due_at: new Date(Date.now() + 48 * 3600000).toISOString(),
        created_at: new Date().toISOString(),
        paid_at: null,
      }],
    });
  }

  // Trade credit order update (payment or freeze)
  if (sql.includes('update trade_credit_orders')) {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  // Trade credit orders list for user
  if (sql.includes('from trade_credit_orders') && sql.includes('count')) {
    return Promise.resolve({ rows: [{ total: 1 }] });
  }

  // ── Graduation queries ───────────────────────────────────────────────────

  // Graduation pending insert/upsert
  if (sql.includes('insert into graduation_pending')) {
    return Promise.resolve({
      rows: [{
        id: 'mock-grad-1',
        user_id: params[0],
        decision: params[1],
        initial_credit_limit: params[2],
        status: 'pending',
        evaluated_at: new Date().toISOString(),
      }],
    });
  }

  // Graduation pending lookup by id
  if (sql.includes('from graduation_pending') && sql.includes('where') && sql.includes('id =')) {
    return Promise.resolve({
      rows: [{
        id: params[0],
        user_id: 'mock-user-5678',
        decision: 'approved',
        initial_credit_limit: 75,
        criteria_snapshot: '{}',
        reasons: '[]',
        status: 'pending',
        evaluated_at: new Date().toISOString(),
        confirmed_at: null,
        rejected_at: null,
        rejection_reason: null,
      }],
    });
  }

  // Graduation pending — check existing pending for user
  if (sql.includes('from graduation_pending') && sql.includes('user_id') && sql.includes('pending')) {
    return Promise.resolve({ rows: [] }); // No existing pending
  }

  // Graduation pending update (confirm/reject)
  if (sql.includes('update graduation_pending')) {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  // Graduation pending list (admin view with JOIN)
  if (sql.includes('from graduation_pending') && sql.includes('join')) {
    return Promise.resolve({
      rows: [{
        id: 'mock-grad-1',
        user_id: 'mock-user-5678',
        decision: 'approved',
        initial_credit_limit: 75,
        status: 'pending',
        evaluated_at: new Date().toISOString(),
        full_name: 'Mock User',
        phone_number: '+260912345678',
        trade_credit_transactions: 8,
      }],
    });
  }

  // Graduation history for user (status endpoint)
  if (sql.includes('from graduation_pending') && sql.includes('order by') && sql.includes('limit')) {
    return Promise.resolve({
      rows: [{
        id: 'mock-grad-1',
        decision: 'approved',
        initial_credit_limit: 75,
        criteria_snapshot: '{}',
        reasons: '[]',
        status: 'pending',
        evaluated_at: new Date().toISOString(),
      }],
    });
  }

  // Credit limit insert (for graduation confirm)
  if (sql.includes('insert into credit_limits')) {
    return Promise.resolve({
      rows: [{ id: 'mock-cl-1' }],
    });
  }

  // ── Float inventory queries ──────────────────────────────────────────────

  // Float inventory insert (bulk purchase)
  if (sql.includes('insert into float_inventory')) {
    return Promise.resolve({
      rows: [{
        id: 'mock-float-1',
        purchase_date: params[0],
        units_purchased: params[1],
        amount_paid_zmw: params[2],
        unit_cost_zmw: params[3],
        units_remaining: params[4],
        purchase_reference: params[5],
        created_at: new Date().toISOString(),
      }],
    });
  }

  // Float inventory FIFO query (oldest batches with remaining stock)
  if (sql.includes('from float_inventory') && sql.includes('units_remaining > 0') && sql.includes('order by')) {
    return Promise.resolve({
      rows: [
        { id: 'mock-float-1', units_remaining: 8000, unit_cost_zmw: 2.50 },
        { id: 'mock-float-2', units_remaining: 5000, unit_cost_zmw: 2.55 },
      ],
    });
  }

  // Float inventory update (deduct units)
  if (sql.includes('update float_inventory') && sql.includes('units_remaining')) {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  // Float balance aggregate (SUM of remaining units + value)
  if (sql.includes('sum') && sql.includes('float_inventory') && sql.includes('units_remaining')) {
    return Promise.resolve({
      rows: [{ total_units: 13000, total_value_zmw: 32825, total: 13000 }],
    });
  }

  // Float inventory list
  if (sql.includes('from float_inventory') && sql.includes('order by')) {
    return Promise.resolve({
      rows: [
        { id: 'f1', purchase_date: '2026-04-01T08:00:00Z', units_purchased: 10000, amount_paid_zmw: 25000, unit_cost_zmw: 2.50, units_remaining: 8000, purchase_reference: 'ZESCO-INV-2026-042', created_at: '2026-04-01T08:00:00Z' },
        { id: 'f2', purchase_date: '2026-03-15T10:00:00Z', units_purchased: 8000,  amount_paid_zmw: 20400, unit_cost_zmw: 2.55, units_remaining: 5000, purchase_reference: 'ZESCO-INV-2026-035', created_at: '2026-03-15T10:00:00Z' },
      ],
    });
  }

  // Float inventory count
  if (sql.includes('count') && sql.includes('float_inventory')) {
    return Promise.resolve({ rows: [{ total: 2 }] });
  }

  // Float transaction insert
  if (sql.includes('insert into float_transactions')) {
    return Promise.resolve({
      rows: [{ id: 'mock-ft-1' }],
    });
  }

  // Float transactions — 30-day sales total
  if (sql.includes('sum') && sql.includes('float_transactions') && sql.includes('sale')) {
    return Promise.resolve({
      rows: [{ total_sold: 4200 }],
    });
  }

  // Float transactions list
  if (sql.includes('from float_transactions') && sql.includes('order by')) {
    return Promise.resolve({
      rows: [
        { id: 'ft1', float_id: 'f1', transaction_type: 'sale',     units: -40, amount_zmw: 100, user_id: 'mock-user-1', note: 'Trade credit order #1', created_at: '2026-04-07T14:30:00Z' },
        { id: 'ft2', float_id: 'f1', transaction_type: 'sale',     units: -80, amount_zmw: 200, user_id: 'mock-user-5', note: 'Loan borrow #9',        created_at: '2026-04-06T09:15:00Z' },
        { id: 'ft3', float_id: 'f1', transaction_type: 'purchase', units: 10000, amount_zmw: 25000, user_id: null,       note: 'Bulk ZESCO purchase',   created_at: '2026-04-01T08:00:00Z' },
      ],
    });
  }

  // Float transactions count
  if (sql.includes('count') && sql.includes('float_transactions')) {
    return Promise.resolve({ rows: [{ total: 3 }] });
  }

  // Meter existence check by meter_number (POST /meters/add duplicate check)
  // Matches: WHERE meter_number = $1 (not WHERE id = $1)
  if (sql.includes('from meters') && sql.includes('where meter_number')) {
    // Return empty — meter doesn't exist yet in mock, so add always succeeds
    return Promise.resolve({ rows: [] });
  }

  // Meter ownership lookup by id (SELECT ... FROM meters WHERE id = $1)
  // Returns a mock meter that passes ownership checks for any user.
  if (sql.includes('from meters') && sql.includes('where')) {
    return Promise.resolve({
      rows: [{
        id: params[0],
        meter_number: String(params[0]),
        user_id: '__mock_any__',
        zesco_verified: true,
      }],
    });
  }

  // Meter insert
  if (sql.includes('insert into meters')) {
    return Promise.resolve({
      rows: [{
        id: 'mock-meter-1',
        user_id: params[0],
        meter_number: params[1],
        zesco_verified: true,
      }],
    });
  }

  // Credit limit lookup
  if (sql.includes('credit_limits')) {
    return Promise.resolve({
      rows: [{
        limit_amount: 250,
        calculated_at: new Date().toISOString(),
      }],
    });
  }

  // Loans outstanding sum
  if (sql.includes('sum') && sql.includes('loans')) {
    return Promise.resolve({
      rows: [{ total_outstanding: 0 }],
    });
  }

  // Loan insert
  if (sql.includes('insert into loans')) {
    return Promise.resolve({
      rows: [{
        id: 'mock-loan-1',
        meter_id: params[0],
        amount_borrowed: params[1],
        token_delivered: params[2],
        status: 'active',
        due_date: params[3],
        created_at: new Date().toISOString(),
      }],
    });
  }

  // Loan lookup (includes JOIN with meters for ownership)
  if (sql.includes('from loans') && sql.includes('where')) {
    return Promise.resolve({
      rows: [{
        id: params[0],
        meter_id: 'mock-meter-1',
        meter_number: '12345678',
        user_id: '__mock_any__',
        amount_borrowed: 100,
        token_delivered: '5738 2041 9637 1084 2956',
        status: 'active',
        created_at: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
        repaid_at: null,
      }],
    });
  }

  // Transactions
  if (sql.includes('from transactions')) {
    return Promise.resolve({
      rows: [
        { id: 't1', meter_id: 'mock-meter-1', amount_zmw: 150, units_purchased: 60, purchased_at: '2026-03-15T10:00:00Z', source: 'zesco_history' },
        { id: 't2', meter_id: 'mock-meter-1', amount_zmw: 200, units_purchased: 80, purchased_at: '2026-02-12T14:30:00Z', source: 'zesco_history' },
        { id: 't3', meter_id: 'mock-meter-1', amount_zmw: 100, units_purchased: 40, purchased_at: '2026-01-20T09:15:00Z', source: 'redbrick' },
      ],
    });
  }

  // Transaction count
  if (sql.includes('count') && sql.includes('transactions')) {
    return Promise.resolve({
      rows: [{ total: 3 }],
    });
  }

  // Repayment sum (for remaining balance calc)
  if (sql.includes('sum') && sql.includes('repayments')) {
    return Promise.resolve({
      rows: [{ total: 0 }],
    });
  }

  // Loan update (status change)
  if (sql.includes('update loans')) {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  // Transaction insert
  if (sql.includes('insert into transactions')) {
    return Promise.resolve({
      rows: [{ id: 'mock-tx-1' }],
    });
  }

  // Max limit subquery (for borrow flow)
  if (sql.includes('max_limit') || (sql.includes('coalesce') && sql.includes('credit_limits'))) {
    return Promise.resolve({
      rows: [{ max_limit: 250 }],
    });
  }

  // Repayment insert
  if (sql.includes('insert into repayments')) {
    return Promise.resolve({
      rows: [{
        id: 'mock-repayment-1',
        loan_id: params[0],
        amount_paid: params[1],
        payment_method: params[2],
        paid_at: new Date().toISOString(),
      }],
    });
  }

  // Default fallback
  return Promise.resolve({ rows: [] });
}

export default pool;
