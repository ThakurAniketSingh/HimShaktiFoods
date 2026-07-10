// api/admin/logout.js — POST /api/admin/logout
//
// Clears the admin session cookie. Since the cookie is httpOnly, the
// frontend can't just delete it with JavaScript — it has to ask the
// server to overwrite it with an already-expired one (Max-Age=0), which
// is exactly what buildClearedSessionCookie() returns.

import { buildClearedSessionCookie } from '../../lib/session.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  res.setHeader('Set-Cookie', buildClearedSessionCookie());
  return res.status(200).json({ success: true });
}
