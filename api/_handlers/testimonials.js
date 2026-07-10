// api/_handlers/testimonials.js — all review/testimonial route logic.
// See api/_handlers/products.js for why this is a plain module and not
// its own Vercel function.
//
// Routes covered:
//   GET    /api/testimonials         — public: approved reviews only
//                                       admin (valid session): every review
//   GET    /api/testimonials?meta=1  — "has anything changed?" signal,
//                                       scoped the same way as above
//   POST   /api/testimonials         — admin: add an already-approved review
//   PUT    /api/testimonials/:id     — admin: edit a review
//   DELETE /api/testimonials/:id     — admin: delete a review
//   POST   /api/testimonials/submit  — public: submit a review (goes in
//                                       as "pending" until an admin approves)

import Testimonial from '../../lib/Testimonial.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClientReview } from '../../lib/toClientReview.js';
import { getNextId } from '../../lib/Counter.js';

// GET /api/testimonials and GET /api/testimonials?meta=1
//
// What this returns depends on who's asking:
//   - Normal visitors (no valid admin session) only get reviews with
//     status "approved" — pending submissions stay invisible until an
//     admin approves them. They also never get the `phone` field.
//   - The admin panel (holds a valid session cookie) gets EVERY review,
//     pending and approved, INCLUDING each reviewer's phone number — so
//     it can verify a submission is genuine before approving.
export async function listTestimonials(req, res) {
  const authorized = isAuthorized(req);
  const query = authorized ? {} : { status: 'approved' };

  if (req.query.meta !== undefined) {
    const [latest, count] = await Promise.all([
      Testimonial.findOne(query).sort({ updatedAt: -1 }).select('updatedAt').lean(),
      Testimonial.countDocuments(query),
    ]);
    const version = `${latest ? new Date(latest.updatedAt).getTime() : 0}-${count}`;
    return res.status(200).json({ version });
  }

  const docs = await Testimonial.find(query).sort({ id: 1 });
  return res.status(200).json(docs.map((d) => toClientReview(d, { includePhone: authorized })));
}

// POST /api/testimonials — admin-curated review, added already-approved
// (visitor submissions go through submitTestimonial below instead, and
// land as "pending").
export async function createTestimonial(req, res) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Incorrect or missing admin key.' });
  }

  const body = req.body || {};
  if (!body.name || !body.text) {
    return res.status(400).json({ error: 'name and text are required.' });
  }

  const nextId = await getNextId('Testimonial');
  const created = await Testimonial.create({ ...body, id: nextId, status: 'approved' });
  return res.status(201).json(toClientReview(created, { includePhone: true }));
}

// PUT /api/testimonials/:id and DELETE /api/testimonials/:id
export async function updateOrDeleteTestimonial(req, res, id) {
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid review id.' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Incorrect or missing admin key.' });
  }

  if (req.method === 'PUT') {
    const updates = { ...(req.body || {}) };
    delete updates.id; // id is never changed via an update

    const updated = await Testimonial.findOneAndUpdate({ id }, updates, { new: true });
    if (!updated) return res.status(404).json({ error: 'Review not found.' });
    return res.status(200).json(toClientReview(updated, { includePhone: true }));
  }

  if (req.method === 'DELETE') {
    const deleted = await Testimonial.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Review not found.' });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} not allowed.` });
}

// POST /api/admin/testimonials?op=reset
export async function resetTestimonials(req, res) {
  await Testimonial.deleteMany({});
  return res.status(200).json([]);
}

// POST /api/admin/testimonials?op=import
export async function importTestimonials(req, res) {
  const items = req.body?.testimonials;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Send { testimonials: [...] } with at least one review.' });
  }

  const toInsert = [];
  for (const t of items) {
    const id = await getNextId('Testimonial');
    toInsert.push({ ...t, id });
  }

  const created = await Testimonial.insertMany(toInsert);
  return res.status(201).json({ inserted: created.length });
}

// ── Public submission (no admin auth needed) ───────────────────────────
//
// The public "leave a review" form on the Contact page calls this.
// Whatever comes in always lands with status "pending": it's saved to
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
//      succeed but never write to the database.
//   4. Phone number is required — collected so an admin can verify a
//      submission is a real customer before approving it. It's never
//      shown on the public site.

const MAX_NAME_LEN = 30;
const MAX_LOCATION_LEN = 30;
const MAX_TEXT_LEN = 150;
const MAX_PHONE_LEN = 15;

const SUBMIT_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const SUBMIT_RATE_LIMIT_MAX = 2; // at most 2 reviews per IP, AND at most 2 per phone number, per day

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export async function submitTestimonial(req, res) {
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
  const windowStart = new Date(Date.now() - SUBMIT_RATE_LIMIT_WINDOW_MS);

  const [recentByIp, recentByPhone] = await Promise.all([
    Testimonial.countDocuments({ ip, createdAt: { $gte: windowStart } }),
    Testimonial.countDocuments({ phone, createdAt: { $gte: windowStart } }),
  ]);

  if (recentByIp >= SUBMIT_RATE_LIMIT_MAX || recentByPhone >= SUBMIT_RATE_LIMIT_MAX) {
    return res
      .status(429)
      .json({ error: "You've already submitted a review recently. Please try again tomorrow." });
  }

  const nextId = await getNextId('Testimonial');

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

  const submissionsUsed = Math.max(recentByIp, recentByPhone) + 1;
  const canSubmitAgain = submissionsUsed < SUBMIT_RATE_LIMIT_MAX;

  return res.status(201).json({
    ...toClientReview(created, { includePhone: false }),
    canSubmitAgain,
  });
}
