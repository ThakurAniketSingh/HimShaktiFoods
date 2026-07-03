// lib/toClientReview.js — like toClient, but for reviews specifically.
//
// - `ip` is stripped ALWAYS, for everyone (including admins) — it only
//   ever exists server-side, to check "has this address submitted too
//   many reviews recently".
// - `phone` is stripped UNLESS the caller says this response is going to
//   an authenticated admin request. The whole point of collecting it is
//   so an admin can verify a reviewer is a genuine customer — it should
//   never reach the public site.

import { toClient } from './toClient.js';

export function toClientReview(doc, { includePhone = false } = {}) {
  const obj = toClient(doc);
  delete obj.ip;
  if (!includePhone) delete obj.phone;
  return obj;
}
