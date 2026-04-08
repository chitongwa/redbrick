// ── RedBrick API Server ──

import express from 'express';
import env from './config/env.js';

// Route modules
import authRoutes         from './routes/auth.js';
import userRoutes         from './routes/users.js';
import meterRoutes        from './routes/meters.js';
import creditRoutes       from './routes/credit.js';
import loanRoutes         from './routes/loans.js';
import tradeCreditRoutes  from './routes/trade-credit.js';
import floatRoutes        from './routes/float.js';
import graduationRoutes   from './routes/graduation.js';
import repaymentRoutes    from './routes/repayments.js';
import transactionRoutes  from './routes/transactions.js';
import countdownRoutes    from './routes/countdown.js';
import pricingRoutes      from './routes/pricing.js';
import notificationRoutes from './routes/notifications.js';

const app = express();

// ── Global middleware ───────────────────────────────────────────────────────
app.use(express.json());

// ── Health check ────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'redbrick-backend',
    mocks: env.useMocks,
    timestamp: new Date().toISOString(),
  });
});

// ── API routes ──────────────────────────────────────────────────────────────
app.use('/auth',         authRoutes);           // POST /auth/request-otp, /auth/verify-otp
app.use('/users',        userRoutes);           // GET  /users/me
app.use('/meters',       meterRoutes);          // POST /meters/add, GET /meters/:id/balance
app.use('/meters',       creditRoutes);         // GET  /meters/:id/credit-limit
app.use('/meters',       transactionRoutes);    // GET  /meters/:id/transactions
app.use('/trade-credit', tradeCreditRoutes);    // POST /trade-credit/purchase, /trade-credit/pay, GET /trade-credit/orders
app.use('/float',        floatRoutes);          // GET /float/balance, POST /float/purchase, GET /float/inventory, GET /float/transactions
app.use('/graduation',   graduationRoutes);     // POST /graduation/evaluate, /confirm, /reject, GET /pending, /status/:userId
app.use('/loans',        loanRoutes);           // POST /loans/borrow (Tier 2 only), GET /loans/:id
app.use('/repayments',   repaymentRoutes);      // POST /repayments/pay
app.use('/countdown',    countdownRoutes);      // POST /countdown/process, GET /countdown/overdue
app.use('/pricing',      pricingRoutes);        // POST /pricing/calculate, GET /pricing/preview, /margin, /settings
app.use('/notifications', notificationRoutes);  // GET/PUT /templates, POST /preview, /test, GET /log

// ── 404 catch-all ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start (local dev only — skipped on Vercel) ─────────────────────────────
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
  app.listen(env.port, () => {
    console.log(`
  ⚡ RedBrick API
  ────────────────────────────
  Port:   ${env.port}
  Mocks:  ${env.useMocks ? 'ON' : 'OFF'}
  ────────────────────────────
  Endpoints:
    POST /auth/request-otp
    POST /auth/verify-otp
    GET  /users/me
    POST /meters/add
    GET  /meters/:id/balance
    GET  /meters/:id/credit-limit
    GET  /meters/:id/transactions
    POST /trade-credit/purchase    (Tier 1)
    POST /trade-credit/pay         (Tier 1)
    GET  /trade-credit/orders      (Tier 1)
    GET  /float/balance            (Float mgmt)
    POST /float/purchase           (Float mgmt)
    GET  /float/inventory          (Float mgmt)
    GET  /float/transactions       (Float mgmt)
    POST /graduation/evaluate      (Graduation)
    POST /graduation/confirm       (Admin)
    POST /graduation/reject        (Admin)
    GET  /graduation/pending       (Admin)
    GET  /graduation/status/:userId
    POST /loans/borrow             (Tier 2 only)
    GET  /loans/:id
    POST /repayments/pay
    POST /countdown/process           (Cron)
    GET  /countdown/overdue           (Admin)
    POST /pricing/calculate           (Pricing)
    GET  /pricing/preview/:amount     (Pricing)
    GET  /pricing/preview/:amount/:id (Pricing)
    GET  /pricing/margin              (Admin)
    GET  /pricing/settings            (Admin)
    PUT  /pricing/settings/:key       (Admin)
    GET  /notifications/templates               (Admin)
    PUT  /notifications/templates/:key          (Admin)
    POST /notifications/templates/:key/preview  (Admin)
    POST /notifications/templates/:key/test     (Admin)
    GET  /notifications/log                     (Admin)
    POST /meters/:id/credit-limit               (Admin — raise limit)
    `);
  });
}

export default app;
