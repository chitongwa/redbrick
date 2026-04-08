// ── Programmable query stub for Jest E2E tests ──
// The backend's db.js is mocked at module-load time and re-routed through
// this stub. Each test scenario can override pieces of the default state
// (user tier, float batches, order list, loan list, etc.) so the HTTP
// handlers exercise real business logic against controlled data.

/**
 * Build a query-handler function that pattern-matches on SQL strings.
 * All state lives in a single mutable object so individual tests can
 * tweak fields between requests (e.g. flip account_frozen to TRUE).
 *
 * @param {object} [overrides]  Partial state overrides
 * @returns {{ handler: Function, state: object, calls: Array }}
 */
export function makeQueryStub(overrides = {}) {
  const state = {
    user: {
      id: 'user-test-1',
      phone_number: '+260977123456',
      full_name: 'Grace Mwamba',
      kyc_status: 'verified',
      tier: 'trade_credit',
      tier_upgraded_at: null,
      trade_credit_transactions: 3,
      trade_credit_default_count: 0,
      account_frozen: false,
      created_at: '2025-08-01T00:00:00Z',
    },
    floatBatches: [
      { id: 'f1', units_remaining: 10000, unit_cost_zmw: 2.25, purchase_date: '2026-04-01T00:00:00Z' },
    ],
    tradeCreditOrders: [],          // Used for graduation evaluate + outstanding check
    outstandingOrders: [],          // Rows for the "outstanding unpaid" query
    overdueOrdersForReminder: [],   // Rows for processPaymentCountdown 20h query
    overdueOrdersForFreeze: [],     // Rows for processPaymentCountdown 48h query
    overdueLoansForReminder: [],    // Rows for processLoanReminders
    mockOrderRow: null,             // Optional override for "fetch order by id" in /pay
    mockLoanRow: null,              // Optional override for loan lookup
    meters: [{ id: 1 }],            // Meters owned by the user (for graduation)
    creditLimit: 250,
    ...overrides,
  };

  const calls = [];                 // Every (sql, params) pair — lets tests assert flow

  async function handler(text, params = []) {
    const sql = text.toLowerCase();
    calls.push({ sql: text.trim().split(/\s+/).slice(0, 8).join(' '), params });

    // ── USERS ─────────────────────────────────────────────────────────────
    // User upsert (auth verify-otp)
    if (sql.includes('insert into users')) {
      const phone = params[0];
      return {
        rows: [{
          ...state.user,
          id: state.user.id,
          phone_number: phone,
          full_name: params[1] || phone,
        }],
      };
    }

    // User tier update
    if (sql.includes('update users') && sql.includes('tier')) {
      state.user.tier = 'loan_credit';
      state.user.tier_upgraded_at = new Date().toISOString();
      return { rows: [], rowCount: 1 };
    }

    // User counter / frozen updates — check the SET clause specifically so
    // an unfreeze query like "SET account_frozen = FALSE WHERE … = TRUE"
    // doesn't accidentally match the freeze branch.
    if (sql.includes('update users') && sql.includes('account_frozen')) {
      if (sql.includes('set account_frozen = false')) state.user.account_frozen = false;
      else if (sql.includes('set account_frozen = true')) state.user.account_frozen = true;
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('update users') && sql.includes('trade_credit_transactions')) {
      state.user.trade_credit_transactions += 1;
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('update users') && sql.includes('trade_credit_default_count')) {
      state.user.trade_credit_default_count += 1;
      return { rows: [], rowCount: 1 };
    }

    // User lookup by id (SELECT ... FROM users WHERE id = $1)
    if (sql.includes('from users') && sql.includes('where') && sql.includes('id')) {
      return { rows: [state.user] };
    }

    // ── TRADE CREDIT ORDERS ───────────────────────────────────────────────
    // Outstanding unpaid check (purchase flow)
    if (sql.includes('from trade_credit_orders') && sql.includes('pending_payment') && sql.includes('token_delivered') && !sql.includes('join')) {
      return { rows: state.outstandingOrders };
    }

    // Order insert
    if (sql.includes('insert into trade_credit_orders')) {
      const order = {
        id: 101,                             // numeric so JSON assertions are stable
        user_id: params[0],
        meter_id: params[1],
        electricity_amt: params[2],
        service_fee: params[3],
        total_due: params[4],
        units_kwh: params[5],
        status: 'pending_payment',
        payment_due_at: params[6],
        created_at: new Date().toISOString(),
      };
      state.tradeCreditOrders.push(order);
      return { rows: [order] };
    }

    // Countdown 20h reminder query
    if (sql.includes('from trade_credit_orders') && sql.includes('join users') && sql.includes('reminder_20h_sent')) {
      return { rows: state.overdueOrdersForReminder };
    }

    // Countdown 24h reminder query
    if (sql.includes('from trade_credit_orders') && sql.includes('join users') && sql.includes('reminder_24h_sent')) {
      return { rows: [] };
    }

    // Countdown 48h freeze query
    if (sql.includes('from trade_credit_orders') && sql.includes('join users') && sql.includes('freeze_processed')) {
      return { rows: state.overdueOrdersForFreeze };
    }

    // Overdue list (GET /countdown/overdue)
    if (sql.includes('from trade_credit_orders') && sql.includes('join users') && sql.includes('token_delivered') && sql.includes('defaulted')) {
      return { rows: [...state.overdueOrdersForReminder, ...state.overdueOrdersForFreeze] };
    }

    // Order lookup by id (the /pay route) — must NOT match `where user_id = …`,
    // which is used by the graduation evaluator.
    if (sql.includes('from trade_credit_orders') && /where\s+id\s*=/.test(sql) && !sql.includes('count')) {
      if (state.mockOrderRow) return { rows: [state.mockOrderRow] };
      return {
        rows: [{
          id: params[0],
          user_id: '__mock_any__',
          meter_id: 1,
          electricity_amt: 50,
          service_fee: 2,
          total_due: 52,
          token_delivered: '5738 2041 9637 1084 2956',
          units_kwh: 20,
          status: 'token_delivered',
          float_reservation_id: 'res-1',
          payment_due_at: new Date(Date.now() + 48 * 3600000).toISOString(),
          created_at: new Date(Date.now() - 10 * 3600000).toISOString(), // 10h ago (within 24h)
          paid_at: null,
        }],
      };
    }

    // Trade credit orders for graduation evaluation (list by user ORDER BY)
    if (sql.includes('from trade_credit_orders') && sql.includes('where') && sql.includes('order by') && !sql.includes('join')) {
      return { rows: state.tradeCreditOrders };
    }

    // Order update (status changes)
    if (sql.includes('update trade_credit_orders')) {
      return { rows: [], rowCount: 1 };
    }

    // Order count
    if (sql.includes('from trade_credit_orders') && sql.includes('count')) {
      return { rows: [{ total: state.tradeCreditOrders.length }] };
    }

    // ── FLOAT ─────────────────────────────────────────────────────────────
    // Float reservation insert
    if (sql.includes('insert into float_reservations')) {
      return { rows: [{ id: 'res-' + Date.now() }] };
    }

    // Float reservation batches insert
    if (sql.includes('insert into float_reservation_batches')) {
      return { rows: [{ id: 1 }] };
    }

    // Float reservation batches lookup (confirm/release)
    if (sql.includes('from float_reservation_batches')) {
      return {
        rows: [{ float_id: state.floatBatches[0]?.id ?? 'f1', units_held: 20, unit_cost_zmw: 2.25 }],
      };
    }

    // Float reservation update
    if (sql.includes('update float_reservations')) {
      return { rows: [], rowCount: 1 };
    }

    // Float balance / availability SUM
    if (sql.includes('sum') && sql.includes('float_inventory') && sql.includes('units_remaining')) {
      const total = state.floatBatches.reduce((s, b) => s + (b.units_remaining || 0), 0);
      const value = state.floatBatches.reduce((s, b) => s + (b.units_remaining || 0) * (b.unit_cost_zmw || 2.5), 0);
      return {
        rows: [{
          total_units: total,
          total_value_zmw: value,
          total_cost: value,
          total,
        }],
      };
    }

    // Float inventory FIFO fetch
    if (sql.includes('from float_inventory') && sql.includes('units_remaining > 0') && sql.includes('order by')) {
      return { rows: state.floatBatches.filter((b) => b.units_remaining > 0) };
    }

    // Float inventory update (deduct)
    if (sql.includes('update float_inventory')) {
      return { rows: [], rowCount: 1 };
    }

    // Float inventory list
    if (sql.includes('from float_inventory') && sql.includes('order by')) {
      return { rows: state.floatBatches };
    }

    // Float inventory count
    if (sql.includes('count') && sql.includes('float_inventory')) {
      return { rows: [{ total: state.floatBatches.length }] };
    }

    // Float inventory insert
    if (sql.includes('insert into float_inventory')) {
      return { rows: [{ id: 'f-new', purchase_date: params[0], units_purchased: params[1] }] };
    }

    // Float transactions insert
    if (sql.includes('insert into float_transactions')) {
      return { rows: [{ id: 'ft-new' }] };
    }

    // Float transactions 30-day sales
    if (sql.includes('sum') && sql.includes('float_transactions') && sql.includes('sale')) {
      return { rows: [{ total_sold: 0 }] };
    }

    // Float transactions list
    if (sql.includes('from float_transactions') && sql.includes('order by')) {
      return { rows: [] };
    }

    // Float transactions count
    if (sql.includes('count') && sql.includes('float_transactions')) {
      return { rows: [{ total: 0 }] };
    }

    // ── METERS ────────────────────────────────────────────────────────────
    // Duplicate check for POST /meters/add
    if (sql.includes('from meters') && sql.includes('where meter_number')) {
      return { rows: [] };
    }

    // Meters for user (graduation)
    if (sql.includes('from meters') && sql.includes('where user_id')) {
      return { rows: state.meters };
    }

    // Meter by id
    if (sql.includes('from meters') && sql.includes('where')) {
      return {
        rows: [{
          id: params[0],
          meter_number: String(params[0]),
          user_id: '__mock_any__',
          zesco_verified: true,
        }],
      };
    }

    // ── LOANS ─────────────────────────────────────────────────────────────
    // Credit limit lookup
    if (sql.includes('from credit_limits') || (sql.includes('coalesce') && sql.includes('credit_limits'))) {
      return { rows: [{ max_limit: state.creditLimit, credit_limit: state.creditLimit, limit_amount: state.creditLimit }] };
    }

    // Outstanding loans sum
    if (sql.includes('sum') && sql.includes('loans') && sql.includes('amount_borrowed')) {
      return { rows: [{ total: 0, total_outstanding: 0 }] };
    }

    // Loan insert
    if (sql.includes('insert into loans')) {
      const loan = {
        id: 202,
        meter_id: params[0],
        amount_borrowed: params[1],
        token_delivered: params[2],
        status: 'active',
        created_at: new Date().toISOString(),
        due_date: params[3],
      };
      state.mockLoanRow = loan;
      return { rows: [loan] };
    }

    // Loan reminder worker query — check first because it ALSO joins meters
    if (sql.includes('from loans') && sql.includes('reminder_3d_sent')) {
      return { rows: state.overdueLoansForReminder };
    }

    // Loan lookup with JOIN meters
    if (sql.includes('from loans') && sql.includes('join') && sql.includes('meters')) {
      return {
        rows: [{
          ...(state.mockLoanRow || {
            id: params[0],
            meter_id: 1,
            amount_borrowed: 150,
            token_delivered: '5738 2041 9637 1084 2956',
            status: 'active',
            created_at: new Date().toISOString(),
            due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
          }),
          meter_number: '12345678',
          user_id: '__mock_any__',
        }],
      };
    }

    // Loan update (status → repaid, reminder flag, etc)
    if (sql.includes('update loans')) {
      if (sql.includes("status = 'repaid'") && state.mockLoanRow) {
        state.mockLoanRow.status = 'repaid';
        state.mockLoanRow.repaid_at = new Date().toISOString();
      }
      return { rows: [], rowCount: 1 };
    }

    // Repayment sum
    if (sql.includes('sum') && sql.includes('repayments')) {
      return { rows: [{ total: state.totalRepaid ?? 0 }] };
    }

    // Repayment insert
    if (sql.includes('insert into repayments')) {
      return {
        rows: [{
          id: 'rep-1',
          loan_id: params[0],
          amount_paid: params[1],
          payment_method: params[2],
          paid_at: new Date().toISOString(),
        }],
      };
    }

    // Credit limit insert
    if (sql.includes('insert into credit_limits')) {
      return { rows: [{ id: 'cl-new' }] };
    }

    // ── FEE REVENUE ──────────────────────────────────────────────────────
    if (sql.includes('insert into fee_revenue')) {
      return { rows: [{ id: 'fee-1' }] };
    }
    if (sql.includes('from fee_revenue') && sql.includes('sum')) {
      return { rows: [{ total_fees: 0, fee_count: 0 }] };
    }

    // ── TRANSACTIONS ─────────────────────────────────────────────────────
    if (sql.includes('insert into transactions')) {
      return { rows: [{ id: 'tx-new' }] };
    }
    if (sql.includes('from transactions')) {
      return { rows: state.zescoTransactions ?? [] };
    }
    if (sql.includes('count') && sql.includes('transactions')) {
      return { rows: [{ total: 0 }] };
    }

    // ── GRADUATION ───────────────────────────────────────────────────────
    // "Existing pending for this user" check (uses user_id, not id) — fire
    // BEFORE the by-id rule because `user_id =` contains `id =` as substring.
    if (sql.includes('from graduation_pending') && sql.includes('user_id') && !/where\s+id\s*=/.test(sql)) {
      return { rows: state.existingPending ?? [] };
    }
    // Fetch graduation_pending by id (admin /confirm and /reject)
    if (sql.includes('from graduation_pending') && /where\s+id\s*=/.test(sql)) {
      return {
        rows: [state.graduationRecord || {
          id: params[0],
          user_id: state.user.id,
          decision: 'approved',
          initial_credit_limit: 75,
          status: 'pending',
          evaluated_at: new Date().toISOString(),
        }],
      };
    }
    if (sql.includes('insert into graduation_pending')) {
      return {
        rows: [{
          id: 301,
          user_id: params[0],
          decision: params[1],
          initial_credit_limit: params[2],
          status: 'pending',
          evaluated_at: new Date().toISOString(),
        }],
      };
    }
    if (sql.includes('update graduation_pending')) {
      if (state.graduationRecord) state.graduationRecord.status = 'confirmed';
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes('from graduation_pending') && sql.includes('join')) {
      return { rows: state.pendingGraduations ?? [] };
    }
    if (sql.includes('from graduation_pending')) {
      return { rows: [] };
    }

    // ── NOTIFICATION TEMPLATES (cache-backed) ────────────────────────────
    if (sql.includes('from notification_templates')) {
      return { rows: _notificationTemplates() };
    }
    if (sql.includes('insert into notification_log')) {
      return { rows: [{ id: 'log-1' }] };
    }
    if (sql.includes('insert into notification_templates') || sql.includes('update notification_templates')) {
      return { rows: [{ key: params[params.length - 1] }] };
    }

    // ── SETTINGS ─────────────────────────────────────────────────────────
    if (sql.includes('from settings')) {
      return { rows: [] };
    }

    // ── DEFAULT ──────────────────────────────────────────────────────────
    return { rows: [] };
  }

  return { handler, state, calls };
}

// Minimal subset of notification templates so sms-notify.js doesn't blow up
// when the unified dispatcher loads them during tests.
function _notificationTemplates() {
  const base = {
    tier: 'tier1',
    label: '',
    description: '',
    variables: [],
    sms_enabled: true,
    push_enabled: true,
    is_default: true,
    updated_at: '2026-04-01T00:00:00Z',
    updated_by: 'test',
  };
  return [
    { ...base, key: 'tc_token_delivered',   sms_body: 'Token {{token}} for ZMW {{amount}}',          push_title: 'Token',   push_body: '{{amount}}' },
    { ...base, key: 'tc_reminder_20h',      sms_body: 'Reminder: ZMW {{amount}} due soon',           push_title: 'Reminder', push_body: '{{amount}}' },
    { ...base, key: 'tc_account_frozen',    sms_body: 'Account frozen — pay ZMW {{amount}}',         push_title: 'Frozen',   push_body: '{{amount}}' },
    { ...base, key: 'tc_payment_received',  sms_body: 'Payment ZMW {{amount}} received {{graduation_hint}}', push_title: 'Paid', push_body: '{{amount}}' },
    { ...base, key: 'loan_disbursed',       sms_body: 'Loan token {{token}} ZMW {{amount}} due {{due_date}}', push_title: 'Loan', push_body: '{{amount}}', tier: 'tier2' },
    { ...base, key: 'loan_due_3d',          sms_body: 'Loan ZMW {{amount}} due in 3 days',           push_title: 'Due soon', push_body: '{{amount}}', tier: 'tier2' },
    { ...base, key: 'loan_repaid',          sms_body: 'Loan repaid. Credit ZMW {{credit_limit}} restored.', push_title: 'Repaid', push_body: '{{credit_limit}}', tier: 'tier2' },
    { ...base, key: 'milestone_graduation', sms_body: 'Congratulations! ZMW {{credit_limit}} credit line', push_title: 'Upgrade', push_body: '{{credit_limit}}', tier: 'milestone' },
    { ...base, key: 'milestone_limit_increase', sms_body: 'New limit ZMW {{new_limit}}',             push_title: 'Limit up', push_body: '{{new_limit}}', tier: 'milestone' },
  ];
}
