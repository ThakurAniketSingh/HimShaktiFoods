// lib/session.js — creates and verifies signed, short-lived admin session
// tokens using Node's built-in `crypto` module (no extra dependency).
//
// WHY THIS EXISTS (replacing the old "send the password on every request"
// approach): previously the admin panel remembered the raw ADMIN_PASSWORD
// in localStorage and re-sent it as a header on every write. That meant
// the real password sat in the browser indefinitely, readable by any
// script that ever ran on the page (e.g. a future XSS bug) and never
// expired.
//
// Instead, on successful login we now hand back a SESSION TOKEN — not the
// password. The token:
//   - is opaque to the browser (just a random-looking string)
//   - is signed with a server-only secret, so the browser cannot forge one
//   - carries its own expiry, so it stops working after SESSION_TTL_MS
//   - is stored in an httpOnly cookie, so page JavaScript can never read
//     it (that's what actually blocks the XSS-steals-the-cookie scenario)
//
// Token shape: `${expiryTimestamp}.${signature}`
//   - expiryTimestamp: plain unix ms timestamp (not secret, just data)
//   - signature: HMAC-SHA256(expiryTimestamp, ADMIN_PASSWORD) as hex
// Because the signature can only be produced by someone who knows
// ADMIN_PASSWORD (the server), a forged or tampered token will simply fail
// verification.

import crypto from 'crypto';

const SESSION_TTL_MS = 1 * 60 * 1000; // 12 hours

function getSecret() {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error('ADMIN_PASSWORD environment variable is not set.');
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

// Builds a fresh token good for SESSION_TTL_MS from now.
export function createSessionToken() {
  const expiry = String(Date.now() + SESSION_TTL_MS);
  const signature = sign(expiry);
  return `${expiry}.${signature}`;
}

// Verifies a token string. Returns true only if it's well-formed, signed
// correctly with our secret, and not expired yet.
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expiry, signature] = parts;

  if (!/^\d+$/.test(expiry)) return false;
  if (Number(expiry) < Date.now()) return false; // expired

  const expectedSignature = sign(expiry);

  // Timing-safe comparison — a plain `===` here would let an attacker
  // guess the signature one byte at a time by measuring response time.
  const a = Buffer.from(signature, 'hex');
  const b = Buffer.from(expectedSignature, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// The cookie name shared between login (sets it) and every protected
// route (reads it).
export const SESSION_COOKIE_NAME = 'himshakti_admin_session';

// Parses `req.headers.cookie` (Vercel/Node doesn't do this for us) into
// { name: value } pairs. Minimal on purpose — we only ever need one cookie.
export function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

// Builds the `Set-Cookie` header value for a login response.
//   - httpOnly: page JavaScript cannot read this cookie at all (blocks
//     the exact "XSS steals the token" risk the old approach had)
//   - secure: only ever sent over HTTPS (Vercel is always HTTPS in prod)
//   - sameSite=Strict: the cookie is never sent on a request that
//     originated from another site, which blocks CSRF too
//   - path=/: sent on every route, including every /api/* endpoint
//   - Max-Age matches SESSION_TTL_MS so the browser forgets it at the
//     same time the signature itself would stop validating
export function buildSessionCookie(token) {
  const maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000);
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

// Builds a `Set-Cookie` header that immediately clears the session (used
// on logout).
export function buildClearedSessionCookie() {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
