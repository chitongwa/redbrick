// ── Vercel Serverless Entry Point ──
// Wraps the Express app as a single serverless function.
// All requests are routed here via vercel.json rewrites.

import app from '../src/index.js';

export default app;
