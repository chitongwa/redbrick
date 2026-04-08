// ── JWT authentication middleware ──

import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Verify the Bearer token on protected routes.
 * Populates req.user = { userId, phone } on success.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { userId: payload.sub, phone: payload.phone };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
