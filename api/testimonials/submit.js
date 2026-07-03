// api/testimonials/submit.js — POST /api/testimonials/submit
//
// The public "leave a review" form on the Contact page calls this.
// Unlike every other write to /api/testimonials, this one needs NO admin
// key — anyone visiting the site can submit a review. To keep that safe,
// whatever comes in always lands with status "pending": it's saved to
// the database, but stays invisible on the Home page until an admin
// reviews it in the admin panel and explicitly approves it.
//
// Anti-spam measures (kept deliberately simple — no external services or
// API keys to set up):
//   1. Rate limit by IP — at most RATE_LIMIT_MAX submissions per address
//      per RATE_LIMIT_WINDOW_MS. Stops a script from flooding the form.
//   2. Rate limit by phone number — same idea, but keyed on the phone
//      number instead. Catches the same person submitting repeatedly
//      from different networks/devices (phone numbers are stored as
//      digits-only so "+91 98765-43210" and "9876543210" match).
//   3. Honeypot field — the form has an invisible "company" field real
//      visitors never see or fill in. If it arrives non-empty, the
//      request is from a bot autofilling every field; we pretend to
//      succeed but never write to the database (no point telling a bot
//      it got caught — that just teaches it to adapt).
//   4. Phone number is required — collected so an admin can verify a
//      submission is a real customer before approving it. It's never
//      shown on the public site (see lib/toClientReview.js).

import { connectDB } from '../../lib/db.js';
import Testimonial from '../../lib/Testimonial.js';
import { toClientReview } from '../../lib/toClientReview.js';

const MAX_NAME_LEN = 30;
const MAX_LOCATION_LEN = 30;
const MAX_TEXT_LEN = 150;
const MAX_PHONE_LEN = 15;

const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_MAX = 2; // at most 2 reviews per IP, AND at most 2 per phone number, per day

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

  try {
    await connectDB();

    const body = req.body || {};

    // Honeypot — a real visitor never fills this in, since it's hidden by
    // CSS. If it has a value, silently "succeed" without saving anything.
    if (String(body.company || '').trim() !== '') {
      return res.status(201).json({ success: true });
    }

    const name = String(body.name || '').trim().slice(0, MAX_NAME_LEN);
    const text = String(body.text || '').trim().slice(0, MAX_TEXT_LEN);
    const location = String(body.location || '').trim().slice(0, MAX_LOCATION_LEN);
    const avatar = body.avatar ? String(body.avatar).slice(0, 4) : '👤';
    const rating = Number(body.rating);
    // Digits only — so "+91 98765-43210" and "9876543210" are treated as
    // the same number for the duplicate-block check below.
    const phone = String(body.phone || '').replace(/\D/g, '').slice(0, MAX_PHONE_LEN);

    if (!name) return res.status(400).json({ error: 'Please add your name.' });
    if (!text) return res.status(400).json({ error: 'Please write a review.' });
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    if (phone.length < 7) {
      return res.status(400).json({ error: 'Please add a valid phone number — we use it only to verify genuine reviews.' });
    }

    const ip = getClientIp(req);
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

    const [recentByIp, recentByPhone] = await Promise.all([
      Testimonial.countDocuments({ ip, createdAt: { $gte: windowStart } }),
      Testimonial.countDocuments({ phone, createdAt: { $gte: windowStart } }),
    ]);

    if (recentByIp >= RATE_LIMIT_MAX || recentByPhone >= RATE_LIMIT_MAX) {
      return res
        .status(429)
        .json({ error: "You've already submitted a review recently. Please try again tomorrow." });
    }

    const last = await Testimonial.findOne().sort({ id: -1 });
    const nextId = last ? last.id + 1 : 1;

    const created = await Testimonial.create({
      id: nextId,
      name,
      location,
      rating,
      text,
      avatar,
      phone,
      ip,
      status: 'pending',
    });

    // Never includePhone here — this response goes straight back to the
    // public visitor who just submitted it. Also tell the frontend
    // whether they've now used up their submissions for today, so it
    // knows whether to offer a "leave another review" option — using the
    // HIGHER of the two counts (IP or phone), since whichever ceiling
    // gets hit first is what would block the next attempt.
    const submissionsUsed = Math.max(recentByIp, recentByPhone) + 1; // +1 for the one just created
    const canSubmitAgain = submissionsUsed < RATE_LIMIT_MAX;

    return res.status(201).json({
      ...toClientReview(created, { includePhone: false }),
      canSubmitAgain,
    });
  } catch (err) {
    console.error('api/testimonials/submit error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
