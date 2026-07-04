// lib/ChatAttempt.js — records every message sent to the AI chat
// assistant (api/chat.js), by IP address, purely to rate-limit usage of
// that endpoint — it calls a paid, per-request AI API, so unbounded use
// (or abuse) has a real cost. Each document expires on its own after
// 1 hour (via the TTL index below), so this collection never grows
// unbounded — same pattern as lib/LoginAttempt.js.

import mongoose from 'mongoose';

const chatAttemptSchema = new mongoose.Schema(
  {
    ip: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 }, // TTL: auto-deleted after 1 hour
  },
  { timestamps: false }
);

export default mongoose.models.ChatAttempt || mongoose.model('ChatAttempt', chatAttemptSchema);
