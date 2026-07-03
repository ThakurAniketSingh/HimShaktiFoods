// lib/LoginAttempt.js — records FAILED admin login attempts by IP address,
// purely so api/admin/login.js can rate-limit brute-force password
// guessing. Successful logins are never recorded here — only failures
// count against the limit. Each document expires on its own after 1 hour
// (via the TTL index below), so this collection never grows unbounded.

import mongoose from 'mongoose';

const loginAttemptSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 }, // TTL: auto-deleted after 1 hour
  },
  { timestamps: false }
);

export default mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', loginAttemptSchema);
