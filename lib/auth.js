// lib/auth.js — checks whether a request is allowed to change the catalog.
//
// UPDATED: previously this compared a raw `x-admin-key` header directly
// against ADMIN_PASSWORD on every single write request — meaning the
// browser had to remember and resend the actual password forever.
//
// Now the frontend logs in once (POST /api/admin/login), receives a
// short-lived signed SESSION TOKEN in an httpOnly cookie (see
// lib/session.js), and the browser automatically resends that cookie on
// every request — page JavaScript never touches the real password again,
// and the session naturally expires after 12 hours.

import { verifySessionToken, parseCookies, SESSION_COOKIE_NAME } from './session.js';

export function isAuthorized(req) {
  if (!process.env.ADMIN_PASSWORD) return false;

  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE_NAME];
  return verifySessionToken(token);
}
