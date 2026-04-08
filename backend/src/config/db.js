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
        units_kwh: params[5],
        status: 'pending_payment',
        payment_due_at: params[6],
        created_at: new Date().toISOString(),
      }],
    });
  }

  // Outstanding unpaid trade credit orders check
  if (sql.includes('from trade_credit_orders') && sql.includes('pending_payment') && sql.includes('token_delivered')) {
    return Promise.resolve({ rows: [] }); // No outstanding — allow purchase
  }

  // Trade credit orders — countdown JOIN query (overdue with user info)
  if (sql.includes('from trade_credit_orders') && sql.includes('join') && sql.includes('reminder')) {
    return Promise.resolve({ rows: [] }); // No overdue orders in mock
  }

  // Trade credit order lookup by id (pay flow)
  if (sql.includes('from trade_credit_orders') && sql.includes('where') && sql.includes('id =') && !sql.includes('count')) {
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
        status: 'token_delivered',
        float_reservation_id: 'mock-reservation-1',
        payment_due_at: new Date(Date.now() + 48 * 3600000).toISOString(),
        created_at: new Date(Date.now() - 6 * 3600000).toISOString(), // 6 hours ago
        paid_at: null,
      }],
    });
  }

  // Trade credit order list for user (with ORDER BY)
  if (sql.includes('from trade_credit_orders') && sql.includes('order by') && !sql.includes('count') && !sql.includes('join')) {
    return Promise.resolve({
      rows: [{
        id: 'mock-tco-1',
        user_id: '__mock_any__',
        meter_id: 'mock-meter-1',
        electricity_amt: 100,
        service_fee: 4,
        total_due: 104,
        token_delivered: '5738 2041 9637 1084 2956',
        units_kwh: 40,
        status: 'paid',
        payment_method: 'mtn',
        payment_due_at: new Date(Date.now() + 48 * 3600000).toISOString(),
        created_at: new Date().toISOString(),
        paid_at: new Date().toISOString(),
        hours_to_pay: 6.5,
      }],
    });
  }

  // Trade credit order update (payment, freeze, status changes)
  if (sql.includes('update trade_credit_orders')) {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  // Trade credit orders count for user
  if (sql.includes('from trade_credit_orders') && sql.includes('count')) {
    return Promise.resolve({ rows: [{ total: 1 }] });
  }

  // ── Float reservation queries ────────────────────────────────────────────

  // Float reservation insert
  if (sql.includes('insert into float_reservations')) {
    return Promise.resolve({
      rows: [{ id: 'mock-reservation-' + Date.now() }],
    });
  }

  // Float reservation batches insert
  if (sql.includes('insert into float_reservation_batches')) {
    return Promise.resolve({ rows: [{ id: 1 }] });
  }

  // Float reservation batches lookup (for confirm/release)
  if (sql.includes('from float_reservation_batches') && sql.includes('where')) {
    return Promise.resolve({
      rows: [
        { float_id: 'mock-float-1', units_held: 40, unit_cost_zmw: 2.50 },
      ],
    });
  }

  // Float reservation update (confirm/release)
  if (sql.includes('update float_reservations')) {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  // Fee revenue insert
  if (sql.includes('insert into fee_revenue')) {
    return Promise.resolve({ rows: [{ id: 'mock-fee-1' }] });
  }

  // ── Settings queries ──────────────────────────────────────────────────────

  // ── Notification templates queries ───────────────────────────────────────

  // Notification templates — list all
  if (sql.includes('from notification_templates') && (sql.includes('order by') || !sql.includes('where'))) {
    return Promise.resolve({ rows: _mockNotificationTemplates() });
  }

  // Notification templates — get by key
  if (sql.includes('from notification_templates') && sql.includes('where') && sql.includes('key')) {
    const key = params[0];
    const all = _mockNotificationTemplates();
    const found = all.find((t) => t.key === key);
    return Promise.resolve({ rows: found ? [found] : [] });
  }

  // Notification templates — update
  if (sql.includes('update notification_templates')) {
    return Promise.resolve({
      rows: [{
        key: params[params.length - 1],
        updated_at: new Date().toISOString(),
        updated_by: 'admin',
      }],
      rowCount: 1,
    });
  }

  // Notification templates — reset to default (no-op in mock)
  if (sql.includes('insert into notification_templates')) {
    return Promise.resolve({ rows: [], rowCount: 1 });
  }

  // Notification log — insert
  if (sql.includes('insert into notification_log')) {
    return Promise.resolve({
      rows: [{ id: 'mock-log-' + Date.now() }],
      rowCount: 1,
    });
  }

  // Notification log — list
  if (sql.includes('from notification_log')) {
    return Promise.resolve({ rows: [] });
  }

  // Settings — list all
  if (sql.includes('from settings') && sql.includes('order by')) {
    return Promise.resolve({
      rows: [
        { key: 'pricing.early_repayment_days',     value: '7',          description: 'Days threshold for early repayment discount',     updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.early_repayment_discount', value: '0.01',       description: 'Early repayment discount as decimal (1%)',         updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.kwh_per_zmw',              value: '0.4',        description: 'kWh per ZMW conversion rate (1/2.50)',             updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.loan_fee_rate',            value: '0.05',       description: 'Tier 2 loan fee as decimal per 30-day period (5%)', updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.loan_fee_type',            value: 'percentage', description: 'Loan fee type: "percentage" or "flat"',            updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.loan_flat_fee_zmw',        value: '10',         description: 'Flat fee in ZMW if loan_fee_type is "flat"',       updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.loan_period_days',         value: '30',         description: 'Standard loan period in days',                     updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.max_credit_limit_zmw',     value: '500',        description: 'Maximum credit limit for Tier 2 (ZMW)',            updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.min_purchase_zmw',         value: '10',         description: 'Minimum trade credit purchase amount (ZMW)',       updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.retail_rate_per_kwh',      value: '2.50',       description: 'ZESCO standard retail rate per kWh (ZMW)',         updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
        { key: 'pricing.service_fee_rate',         value: '0.04',       description: 'Tier 1 trade credit service fee as decimal (4%)',  updated_at: '2026-04-01T00:00:00Z', updated_by: 'system' },
      ],
    });
  }

  // Settings — update
  if (sql.includes('update settings')) {
    return Promise.resolve({
      rows: [{
        key: params[2],
        value: params[0],
        description: 'Updated setting',
        updated_at: new Date().toISOString(),
        updated_by: params[1],
      }],
    });
  }

  // Settings — insert (new key)
  if (sql.includes('insert into settings')) {
    return Promise.resolve({
      rows: [{
        key: params[0],
        value: params[1],
        description: null,
        updated_at: new Date().toISOString(),
        updated_by: params[2],
      }],
    });
  }

  // Fee revenue — aggregate for margin report
  if (sql.includes('from fee_revenue') && sql.includes('sum')) {
    return Promise.resolve({
      rows: [{ total_fees: 156.80, fee_count: 38 }],
    });
  }

  // Float transactions — aggregate for margin report (all-time sales)
  if (sql.includes('from float_transactions') && sql.includes('sum') && sql.includes('abs') && sql.includes('sale')) {
    return Promise.resolve({
      rows: [{ total_units_sold: 4200, total_cost_zmw: 10584, sale_count: 95 }],
    });
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
  // Used by getFloatBalance() (aliases: total_units, total_value_zmw)
  // and getWeightedFloatCost() (aliases: total_units, total_cost)
  if (sql.includes('sum') && sql.includes('float_inventory') && sql.includes('units_remaining')) {
    return Promise.resolve({
      rows: [{ total_units: 13000, total_value_zmw: 32825, total_cost: 32825, total: 13000 }],
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

// ── Mock notification template dataset ──
// Mirrors migration 007 so the admin Settings → Notifications page has rows
// to render even when running in USE_MOCKS=true mode.
function _mockNotificationTemplates() {
  return [
    {
      key: 'tc_token_delivered', tier: 'tier1',
      label: 'Token Delivered',
      description: 'Sent immediately after ZESCO token is purchased on trade credit (Tier 1).',
      sms_body:   'Your ZESCO token is: {{token}}. Pay ZMW {{amount}} by {{due_time}} via MTN MoMo *321# or Airtel *778#. Ref: RB{{order_id}}',
      push_title: 'ZESCO token ready',
      push_body:  'Your token: {{token}} — ZMW {{amount}} due by {{due_time}}',
      variables:  ['first_name','token','units','amount','due_time','order_id'],
      sms_enabled: true, push_enabled: true, is_default: true,
      updated_at: '2026-04-01T00:00:00Z', updated_by: 'system',
    },
    {
      key: 'tc_reminder_20h', tier: 'tier1',
      label: '20-Hour Reminder',
      description: 'Sent 20 hours after the trade credit order was created — 4 hours before default.',
      sms_body:   'Reminder: ZMW {{amount}} due in 4 hours. Pay now to keep your account active. MTN *321# or Airtel *778#',
      push_title: 'Payment due in 4 hours',
      push_body:  'ZMW {{amount}} due soon — tap to pay now',
      variables:  ['first_name','amount','order_id','hours_remaining'],
      sms_enabled: true, push_enabled: true, is_default: true,
      updated_at: '2026-04-01T00:00:00Z', updated_by: 'system',
    },
    {
      key: 'tc_account_frozen', tier: 'tier1',
      label: 'Account Frozen (48h)',
      description: 'Sent when the account is frozen due to non-payment at the 48-hour mark.',
      sms_body:   'Your Redbrick account is frozen. Pay ZMW {{amount}} to reactivate. MTN *321# or Airtel *778#',
      push_title: 'Account frozen',
      push_body:  'Pay ZMW {{amount}} to reactivate your account',
      variables:  ['first_name','amount','order_id'],
      sms_enabled: true, push_enabled: true, is_default: true,
      updated_at: '2026-04-01T00:00:00Z', updated_by: 'system',
    },
    {
      key: 'tc_payment_received', tier: 'tier1',
      label: 'Payment Received',
      description: 'Sent after a successful trade credit payment.',
      sms_body:   'Payment of ZMW {{amount}} received. Thank you! Your account is active. {{graduation_hint}}',
      push_title: 'Payment received',
      push_body:  'ZMW {{amount}} — thanks! Account active.',
      variables:  ['first_name','amount','order_id','graduation_hint'],
      sms_enabled: true, push_enabled: true, is_default: true,
      updated_at: '2026-04-01T00:00:00Z', updated_by: 'system',
    },
    {
      key: 'loan_disbursed', tier: 'tier2',
      label: 'Loan Disbursed',
      description: 'Sent when a Tier 2 customer borrows on credit — ZESCO token delivered.',
      sms_body:   'Your ZESCO token is: {{token}}. Repay ZMW {{amount}} by {{due_date}}. MTN *321# or Airtel *778#',
      push_title: 'Loan approved',
      push_body:  'Token: {{token}} — repay ZMW {{amount}} by {{due_date}}',
      variables:  ['first_name','token','amount','due_date','loan_id'],
      sms_enabled: true, push_enabled: true, is_default: true,
      updated_at: '2026-04-01T00:00:00Z', updated_by: 'system',
    },
    {
      key: 'loan_due_3d', tier: 'tier2',
      label: 'Loan Due in 3 Days',
      description: 'Sent 3 days before the loan due date.',
      sms_body:   'Your Redbrick loan of ZMW {{amount}} is due in 3 days',
      push_title: 'Loan due in 3 days',
      push_body:  'ZMW {{amount}} — due {{due_date}}',
      variables:  ['first_name','amount','loan_id','due_date'],
      sms_enabled: true, push_enabled: true, is_default: true,
      updated_at: '2026-04-01T00:00:00Z', updated_by: 'system',
    },
    {
      key: 'loan_repaid', tier: 'tier2',
      label: 'Loan Repaid',
      description: 'Sent when a loan is fully repaid — credit is restored.',
      sms_body:   'Loan repaid. Thank you! Your credit limit of ZMW {{credit_limit}} is restored.',
      push_title: 'Loan repaid',
      push_body:  'Credit limit of ZMW {{credit_limit}} restored',
      variables:  ['first_name','amount','loan_id','credit_limit'],
      sms_enabled: true, push_enabled: true, is_default: true,
      updated_at: '2026-04-01T00:00:00Z', updated_by: 'system',
    },
    {
      key: 'milestone_graduation', tier: 'milestone',
      label: 'Graduation to Credit Member',
      description: 'Sent when a Tier 1 customer graduates to Tier 2 (Credit Member).',
      sms_body:   'Congratulations! You have been upgraded to Redbrick Credit Member. You now have a ZMW {{credit_limit}} credit line. Thank you for being a trusted customer.',
      push_title: "You're a Credit Member!",
      push_body:  'ZMW {{credit_limit}} credit line unlocked',
      variables:  ['first_name','credit_limit'],
      sms_enabled: true, push_enabled: true, is_default: true,
      updated_at: '2026-04-01T00:00:00Z', updated_by: 'system',
    },
    {
      key: 'milestone_limit_increase', tier: 'milestone',
      label: 'Credit Limit Increase',
      description: "Sent when a Tier 2 customer's credit limit is raised.",
      sms_body:   'Great news! Your credit limit has increased to ZMW {{new_limit}} based on your excellent repayment history.',
      push_title: 'Credit limit increased',
      push_body:  'New limit: ZMW {{new_limit}}',
      variables:  ['first_name','new_limit','old_limit'],
      sms_enabled: true, push_enabled: true, is_default: true,
      updated_at: '2026-04-01T00:00:00Z', updated_by: 'system',
    },
  ];
}

export default pool;
