// api/_handlers/admin.js — admin login/logout route logic.
// See api/_handlers/products.js for why this is a plain module and not
// its own Vercel function.
//
// Routes covered:
//   POST /api/admin/login   — checks password, issues a session cookie
//   POST /api/admin/logout  — clears the session cookie
//   GET  /api/admin/session — checks whether the current cookie is still valid

import LoginAttempt from '../../lib/LoginAttempt.js';
import { createSessionToken, buildSessionCookie, buildClearedSessionCookie } from '../../lib/session.js';
import { isAuthorized } from '../../lib/auth.js';

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

// POST /api/admin/login
//
// Checks the password against ADMIN_PASSWORD (an environment variable,
// never sent to the browser as code). On success, issues a short-lived
// signed session token in an httpOnly cookie (see lib/session.js) — the
// real password is never sent back to the browser, and the browser can't
// read the cookie's contents even with JavaScript.
//
// Brute-force protection: failed attempts from the same IP are counted
// (see lib/LoginAttempt.js). After too many failures in a short window,
// further attempts are rejected for a while, even with the correct
// password — this is checked against MongoDB rather than kept in memory,
// since a serverless function's memory isn't shared or guaranteed to
// persist between requests.
export async function adminLogin(req, res) {
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server.' });
  }

  const ip = getClientIp(req);
  const windowStart = new Date(Date.now() - WINDOW_MS);
  const recentFailures = await LoginAttempt.countDocuments({ ip, createdAt: { $gte: windowStart } });

  if (recentFailures >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many incorrect attempts. Please try again in a few minutes.' });
  }

  const { password } = req.body || {};
  if (password && password === process.env.ADMIN_PASSWORD) {
    const token = createSessionToken();
    res.setHeader('Set-Cookie', buildSessionCookie(token));
    return res.status(200).json({ success: true });
  }

  await LoginAttempt.create({ ip });
  return res.status(401).json({ error: 'Incorrect password.' });
}

// POST /api/admin/logout
//
// Clears the admin session cookie. Since the cookie is httpOnly, the
// frontend can't just delete it with JavaScript — it has to ask the
// server to overwrite it with an already-expired one (Max-Age=0).
export async function adminLogout(req, res) {
  res.setHeader('Set-Cookie', buildClearedSessionCookie());
  return res.status(200).json({ success: true });
}

// GET /api/admin/session
//
// Answers one question: "is the session cookie I'm currently holding
// still valid right now?" Returns { valid: true } or { valid: false } —
// never a 401, since an invalid/expired session here isn't an error,
// it's just a normal "no" answer. The admin panel calls this the moment
// /admin loads (see ProtectedRoute.jsx) so an expired session shows the
// login screen immediately, instead of only failing once the person
// tries to actually change something.
export async function adminSessionCheck(req, res) {
  return res.status(200).json({ valid: isAuthorized(req) });
}
