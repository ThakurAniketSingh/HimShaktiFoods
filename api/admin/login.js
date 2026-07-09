// api/admin/login.js — POST /api/admin/login
//
// Checks the password against ADMIN_PASSWORD (an environment variable,
// never sent to the browser as code). On success, issues a short-lived
// signed session token in an httpOnly cookie (see lib/session.js) — the
// real password is never sent back to the browser, and the browser can't
// read the cookie's contents even with JavaScript. Every future write
// request is authorized by the browser automatically resending that
// cookie, checked server-side in lib/auth.js.
//
// Brute-force protection: failed attempts from the same IP are counted
// (see lib/LoginAttempt.js). After too many failures in a short window,
// further attempts are rejected for a while, even with the correct
// password — this is checked against MongoDB rather than kept in memory,
// since a serverless function's memory isn't shared or guaranteed to
// persist between requests.

import { connectDB } from '../../lib/db.js';
import LoginAttempt from '../../lib/LoginAttempt.js';
import { createSessionToken, buildSessionCookie } from '../../lib/session.js';

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD is not configured on the server.' });
  }

  try {
    await connectDB();

    const ip = getClientIp(req);
    const windowStart = new Date(Date.now() - WINDOW_MS);
    const recentFailures = await LoginAttempt.countDocuments({ ip, createdAt: { $gte: windowStart } });

    if (recentFailures >= MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Please try again in a few minutes.' });
    }

    const { password } = req.body || {};
    if (password && password === process.env.ADMIN_PASSWORD) {
      // Correct password: issue a signed session token instead of ever
      // sending the password itself back to the browser. It's set as an
      // httpOnly cookie, so page JavaScript can't read it, and it expires
      // on its own after 12 hours (see lib/session.js).
      const token = createSessionToken();
      res.setHeader('Set-Cookie', buildSessionCookie(token));
      return res.status(200).json({ success: true });
    }

    await LoginAttempt.create({ ip });
    return res.status(401).json({ error: 'Incorrect password.' });
  } catch (err) {
    console.error('api/admin/login error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
