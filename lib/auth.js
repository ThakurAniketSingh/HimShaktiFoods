// lib/auth.js — checks whether a request is allowed to change the catalog.
//
// The admin panel sends the admin password on every write request, in an
// `x-admin-key` header. This function just compares it to the real
// password (stored server-side as an environment variable, never shipped
// to the browser). This is intentionally simple — good enough for a single
// small-business admin — not a full user/session system.

export function isAuthorized(req) {
  const key = req.headers['x-admin-key'];
  return Boolean(process.env.ADMIN_PASSWORD) && key === process.env.ADMIN_PASSWORD;
}
