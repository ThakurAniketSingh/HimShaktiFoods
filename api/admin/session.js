// api/admin/session.js — GET /api/admin/session
//
// Answers one question: "is the session cookie I'm currently holding
// still valid right now?" Returns { valid: true } or { valid: false } —
// never a 401, since an invalid/expired session here isn't an error,
// it's just a normal "no" answer. The admin panel calls this the moment
// /admin loads (see src/admin/ProtectedRoute.jsx) so an expired session
// (sessions last 12 hours — see lib/session.js) shows the login screen
// immediately, instead of only failing once the person tries to
// actually change something.

import { isAuthorized } from '../../lib/auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  return res.status(200).json({ valid: isAuthorized(req) });
}
