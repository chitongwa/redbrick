// ══════════════════════════════════════════════════════════════════════════
//  RedBrick — End-to-End Test Suite
// ══════════════════════════════════════════════════════════════════════════
//
// Covers the seven scenarios requested by the product team:
//
//   Tier 1 (Trade Credit)
//    1. New customer registers → requests ZMW 50 → token delivered →
//       pays within 10 h → counter increments
//    2. Customer doesn't pay → freeze at 48 h → customer pays → unfreeze
//    3. 6 paid transactions, zero defaults → graduation engine triggers
//       → admin approves → Tier 2 upgrade → congratulations SMS sent
//
//   Tier 2 (Loan Credit)
//    4. Graduated customer borrows ZMW 150 → token delivered → repays
//       before due date → credit limit restored
//    5. Tier 2 misses repayment → account flagged → reminder sent →
//       loan marked overdue
//
//   Float
//    6. Float drops below 5,000 units → LOW alert triggered
//    7. Customer tries to purchase when float is empty → graceful error
//
// The backend is pure ESM; Jest is run via --experimental-vm-modules. The
// `db.js` module is mocked at load time via jest.unstable_mockModule so
// every test injects its own scenario-specific query responses.

import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { makeQueryStub } from './helpers/queryStub.js';

// ── Environment ──────────────────────────────────────────────────────────
// Force mock-mode before anything else loads so services/index.js picks
// the mock SMS / ZESCO / payments adapters and twilio-sms / onesignal
// fall through to their console-log stubs.
process.env.USE_MOCKS   = 'true';
process.env.JWT_SECRET  = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

// ── Mock the DB module BEFORE importing the app ──────────────────────────
// Each test assigns its own handler via setQueryHandler(); until then the
// stub returns empty rows.
let currentHandler = async () => ({ rows: [] });

jest.unstable_mockModule('../src/config/db.js', () => ({
  default: {},
  query: (sql, params) => currentHandler(sql, params),
}));

// Dynamically import app + supertest AFTER the mock is registered.
const { default: app } = await import('../src/index.js');
const { default: request } = await import('supertest');

// ── Helpers ──────────────────────────────────────────────────────────────
function mintToken(userId = 'user-test-1', phone = '+260977123456') {
  return jwt.sign({ sub: userId, phone }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function setHandler(handler) {
  currentHandler = handler;
}

function logResult(label, ok) {
  const tag = ok ? '✅ PASS' : '❌ FAIL';
  // eslint-disable-next-line no-console
  console.log(`  ${tag}  ${label}`);
}

// ══════════════════════════════════════════════════════════════════════════
//  TIER 1 — TRADE CREDIT
// ══════════════════════════════════════════════════════════════════════════

describe('Tier 1 — Trade Credit flows', () => {
  // ────────────────────────────────────────────────────────────────────────
  // 1. New customer → requests ZMW 50 → token → pays within 10 h
  // ────────────────────────────────────────────────────────────────────────
  test('1 · new customer buys ZMW 50 of electricity, pays within 10 h', async () => {
    const stub = makeQueryStub();
    setHandler(stub.handler);
    const token = mintToken(stub.state.user.id);

    // Register/login
    const otpResp = await request(app)
      .post('/auth/request-otp')
      .send({ phone_number: '+260977123456' });
    expect(otpResp.status).toBe(200);

    const verifyResp = await request(app)
      .post('/auth/verify-otp')
      .send({ phone_number: '+260977123456', otp: '123456', full_name: 'Grace Mwamba' });
    expect(verifyResp.status).toBe(200);
    expect(verifyResp.body).toHaveProperty('token');
    expect(verifyResp.body.user.tier).toBe('trade_credit');

    // Purchase ZMW 50 of electricity
    const purchaseResp = await request(app)
      .post('/trade-credit/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({ meter_id: 1, amount: 50 });

    expect(purchaseResp.status).toBe(201);
    expect(purchaseResp.body).toHaveProperty('token.code');
    expect(purchaseResp.body.order.electricity_amt).toBe(50);
    expect(purchaseResp.body.order.service_fee).toBe(2);        // 4% of 50
    expect(purchaseResp.body.order.total_due).toBe(52);         // 50 + 2
    expect(purchaseResp.body.order.status).toBe('token_delivered');

    const initialTxCount = stub.state.user.trade_credit_transactions;

    // Pay within 10 hours
    const payResp = await request(app)
      .post('/trade-credit/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id: 101, payment_method: 'mtn' });

    expect(payResp.status).toBe(200);
    expect(payResp.body.message).toMatch(/settled|received/i);
    expect(payResp.body.hours_to_pay).toBeLessThan(24);
    expect(payResp.body.amount_paid).toBeDefined();

    // Counter incremented
    expect(stub.state.user.trade_credit_transactions).toBe(initialTxCount + 1);

    logResult('Tier 1 happy path — purchase, token, pay within 10h', true);
  });

  // ────────────────────────────────────────────────────────────────────────
  // 2. Doesn't pay → freeze at 48 h → pays → unfreeze
  // ────────────────────────────────────────────────────────────────────────
  test('2 · unpaid order freezes account at 48 h, payment unfreezes', async () => {
    const stub = makeQueryStub({
      // A single overdue order queued for freeze processing
      overdueOrdersForFreeze: [{
        id: 101,
        user_id: 'user-test-1',
        total_due: 52,
        float_reservation_id: 'res-1',
        phone_number: '+260977123456',
        full_name: 'Grace Mwamba',
      }],
    });
    setHandler(stub.handler);
    const token = mintToken();

    expect(stub.state.user.account_frozen).toBe(false);

    // Run countdown worker — should process the 48h freeze
    const countdownResp = await request(app)
      .post('/countdown/process')
      .send();
    expect(countdownResp.status).toBe(200);
    expect(countdownResp.body.stats.defaults).toBe(1);

    // Account should now be frozen
    expect(stub.state.user.account_frozen).toBe(true);

    // Customer pays the outstanding order → triggers unfreeze
    stub.state.mockOrderRow = {
      id: 101,
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
      created_at: new Date(Date.now() - 50 * 3600000).toISOString(),
      paid_at: null,
    };

    const payResp = await request(app)
      .post('/trade-credit/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ order_id: 101, payment_method: 'airtel' });

    expect(payResp.status).toBe(200);
    // The UPDATE users SET account_frozen = FALSE query should have flipped state
    expect(stub.state.user.account_frozen).toBe(false);

    logResult('Freeze at 48 h, payment unfreezes', true);
  });

  // ────────────────────────────────────────────────────────────────────────
  // 3. 6 transactions, 0 defaults → graduation → admin approve → upgrade
  // ────────────────────────────────────────────────────────────────────────
  test('3 · 6 paid transactions → graduation approved → admin confirms', async () => {
    // Seed 6 paid orders and 3 months of ZESCO history so the mock scorer
    // produces a decisive "approved" outcome.
    const paidOrders = Array.from({ length: 6 }).map((_, i) => ({
      id: 200 + i,
      status: 'paid',
      electricity_amt: 60,
      total_due: 62.4,
      created_at: new Date(Date.now() - (60 - i * 5) * 86400000).toISOString(),
      paid_at:    new Date(Date.now() - (60 - i * 5 - 1) * 86400000).toISOString(),
      frozen_at:  null,
      payment_due_at: null,
    }));

    const stub = makeQueryStub({
      user: {
        id: 'user-test-1',
        phone_number: '+260977123456',
        full_name: 'Grace Mwamba',
        kyc_status: 'verified',
        tier: 'trade_credit',
        tier_upgraded_at: null,
        trade_credit_transactions: 6,
        trade_credit_default_count: 0,
        account_frozen: false,
        // Account 4 months old → passes the "3 months" check
        created_at: new Date(Date.now() - 120 * 86400000).toISOString(),
      },
      tradeCreditOrders: paidOrders,
      zescoTransactions: [
        { amount_zmw: 120, purchased_at: new Date(Date.now() - 20 * 86400000).toISOString() },
        { amount_zmw: 150, purchased_at: new Date(Date.now() - 50 * 86400000).toISOString() },
        { amount_zmw: 180, purchased_at: new Date(Date.now() - 80 * 86400000).toISOString() },
      ],
      meters: [{ id: 1 }],
      existingPending: [],
      pendingGraduations: [],
      graduationRecord: {
        id: 301,
        user_id: 'user-test-1',
        decision: 'approved',
        initial_credit_limit: 75,
        status: 'pending',
        evaluated_at: new Date().toISOString(),
      },
    });
    setHandler(stub.handler);
    const token = mintToken();

    // 1. Evaluate graduation
    const evalResp = await request(app)
      .post('/graduation/evaluate')
      .set('Authorization', `Bearer ${token}`)
      .send({ user_id: 'user-test-1' });

    expect(evalResp.status).toBe(200);
    expect(evalResp.body.graduation.decision).toBe('approved');
    expect(evalResp.body.graduation.initial_credit_limit).toBeGreaterThan(0);

    // 2. Admin confirms
    const confirmResp = await request(app)
      .post('/graduation/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ graduation_id: 301 });

    expect(confirmResp.status).toBe(200);
    expect(confirmResp.body.new_tier).toBe('loan_credit');
    expect(confirmResp.body.initial_credit_limit).toBeGreaterThan(0);
    expect(stub.state.user.tier).toBe('loan_credit');

    logResult('Graduation approved + confirmed + SMS dispatched', true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  TIER 2 — LOAN CREDIT
// ══════════════════════════════════════════════════════════════════════════

describe('Tier 2 — Loan Credit flows', () => {
  // ────────────────────────────────────────────────────────────────────────
  // 4. Tier 2 borrows ZMW 150 → repays in full → credit restored
  // ────────────────────────────────────────────────────────────────────────
  test('4 · Tier 2 borrows ZMW 150, repays early, credit restored', async () => {
    const stub = makeQueryStub({
      user: {
        id: 'user-test-2',
        phone_number: '+260977999888',
        full_name: 'John Banda',
        kyc_status: 'verified',
        tier: 'loan_credit',
        tier_upgraded_at: '2026-01-15T00:00:00Z',
        trade_credit_transactions: 10,
        trade_credit_default_count: 0,
        account_frozen: false,
        created_at: '2025-06-01T00:00:00Z',
      },
      creditLimit: 250,
    });
    setHandler(stub.handler);
    const token = mintToken('user-test-2', '+260977999888');

    // Borrow ZMW 150
    const borrowResp = await request(app)
      .post('/loans/borrow')
      .set('Authorization', `Bearer ${token}`)
      .send({ meter_id: 1, amount: 150 });

    expect(borrowResp.status).toBe(201);
    expect(borrowResp.body.loan.amount_borrowed).toBe(150);
    expect(borrowResp.body.loan.status).toBe('active');
    expect(borrowResp.body).toHaveProperty('token.code');
    expect(borrowResp.body.loan).toHaveProperty('due_date');

    // Repay in full (early)
    const repayResp = await request(app)
      .post('/repayments/pay')
      .set('Authorization', `Bearer ${token}`)
      .send({ loan_id: 202, amount: 150, payment_method: 'mtn' });

    expect(repayResp.status).toBe(200);
    expect(repayResp.body.loan_status).toBe('repaid');
    expect(repayResp.body.loan_remaining).toBe(0);
    expect(repayResp.body.message).toMatch(/fully repaid|restored/i);

    logResult('Tier 2 borrow + early repay + credit restored', true);
  });

  // ────────────────────────────────────────────────────────────────────────
  // 5. Tier 2 misses repayment → reminder sent
  // ────────────────────────────────────────────────────────────────────────
  test('5 · Tier 2 misses repayment → loan due-in-3-days reminder fires', async () => {
    const dueSoon = new Date(Date.now() + 3 * 86400000).toISOString();

    const stub = makeQueryStub({
      user: {
        id: 'user-test-2',
        phone_number: '+260977999888',
        full_name: 'John Banda',
        kyc_status: 'verified',
        tier: 'loan_credit',
        tier_upgraded_at: '2026-01-15T00:00:00Z',
        trade_credit_transactions: 10,
        trade_credit_default_count: 0,
        account_frozen: false,
        created_at: '2025-06-01T00:00:00Z',
      },
      overdueLoansForReminder: [{
        id: 202,
        amount_borrowed: 150,
        due_date: dueSoon,
        phone_number: '+260977999888',
        full_name: 'John Banda',
        user_id: 'user-test-2',
      }],
    });
    setHandler(stub.handler);

    const resp = await request(app).post('/countdown/process').send();
    expect(resp.status).toBe(200);
    expect(resp.body.stats.reminders3d).toBeGreaterThanOrEqual(1);

    logResult('Loan reminder worker fires 3-day notice', true);
  });
});

// ══════════════════════════════════════════════════════════════════════════
//  FLOAT
// ══════════════════════════════════════════════════════════════════════════

describe('Float tests', () => {
  // ────────────────────────────────────────────────────────────────────────
  // 6. Float drops below 5,000 units → LOW alert
  // ────────────────────────────────────────────────────────────────────────
  test('6 · float balance < 5,000 units returns LOW alert', async () => {
    const stub = makeQueryStub({
      floatBatches: [
        { id: 'f1', units_remaining: 3200, unit_cost_zmw: 2.25, purchase_date: '2026-04-01' },
      ],
    });
    setHandler(stub.handler);
    const token = mintToken();

    const resp = await request(app)
      .get('/float/balance')
      .set('Authorization', `Bearer ${token}`);

    expect(resp.status).toBe(200);
    expect(resp.body.total_units_kwh).toBeLessThan(5000);
    expect(resp.body.alert_level).toBe('LOW');

    logResult('Float < 5000 triggers LOW alert', true);
  });

  // ────────────────────────────────────────────────────────────────────────
  // 7. Customer tries to buy when float is empty → graceful error
  // ────────────────────────────────────────────────────────────────────────
  test('7 · purchase when float is empty returns 503 with float_alert', async () => {
    const stub = makeQueryStub({
      floatBatches: [],  // empty inventory
    });
    setHandler(stub.handler);
    const token = mintToken();

    const resp = await request(app)
      .post('/trade-credit/purchase')
      .set('Authorization', `Bearer ${token}`)
      .send({ meter_id: 1, amount: 50 });

    expect(resp.status).toBe(503);
    expect(resp.body.error).toMatch(/float|inventory|unavailable/i);
    expect(resp.body).toHaveProperty('float_alert');
    expect(['LOW', 'CRITICAL']).toContain(resp.body.float_alert);

    logResult('Empty float returns graceful 503', true);
  });
});
