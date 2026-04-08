// ── RedBrick API Server ──

import express from 'express';
import env from './config/env.js';

// Route modules
import authRoutes         from './routes/auth.js';
import meterRoutes        from './routes/meters.js';
import creditRoutes       from './routes/credit.js';
import loanRoutes         from './routes/loans.js';
import repaymentRoutes    from './routes/repayments.js';
import transactionRoutes  from './routes/transactions.js';

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
app.use('/meters',       meterRoutes);          // POST /meters/add, GET /meters/:id/balance
app.use('/meters',       creditRoutes);         // GET  /meters/:id/credit-limit
app.use('/meters',       transactionRoutes);    // GET  /meters/:id/transactions
app.use('/loans',        loanRoutes);           // POST /loans/borrow, GET /loans/:id
app.use('/repayments',   repaymentRoutes);      // POST /repayments/pay

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
    POST /meters/add
    GET  /meters/:id/balance
    GET  /meters/:id/credit-limit
    GET  /meters/:id/transactions
    POST /loans/borrow
    GET  /loans/:id
    POST /repayments/pay
    `);
  });
}

export default app;
