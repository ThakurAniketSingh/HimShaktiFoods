// api/testimonials/index.js — GET /api/testimonials,
// GET /api/testimonials?meta=1, and POST /api/testimonials
//
// GET is public, but what it returns depends on who's asking:
//   - Normal visitors (no admin key) only get reviews with status
//     "approved" — pending submissions stay invisible until an admin
//     approves them. They also never get the `phone` field.
//   - The admin panel (sends the correct x-admin-key header) gets EVERY
//     review, pending and approved, INCLUDING each reviewer's phone
//     number — so it can verify a submission is genuine before approving.
//
// GET with ?meta=1 returns a tiny "has anything changed?" version signal
// instead of the full list (used to be its own /api/testimonials/meta
// file — merged in here purely to stay under Vercel's serverless
// function count limit; the behavior is byte-for-byte identical, just
// reached via a query parameter instead of a second file/route). It's
// scoped exactly the same way as the main GET above — approved-only
// version for regular visitors, full version for the admin key — because
// these are genuinely different datasets that can change independently:
// a new pending submission changes the admin version but NOT the public
// one (a visitor can't see it yet either way, so there's no reason for
// their browser to do anything).
//
// POST here is the admin-only "add a review" flow (used by the Reviews
// tab's "+ Add Review" button) — it always creates an already-approved
// review, since an admin is curating it directly. Visitor-submitted
// reviews go through the separate public endpoint at
// /api/testimonials/submit instead, and come in as "pending".
//
// Note: like /api/products, this does NOT auto-reseed when the collection
// is empty — deleting every review from the admin panel (or directly in
// MongoDB) is permanent. Use the "Clear All" + Import buttons in the
// admin panel's Reviews tab if you want to start over with your own data.

import { connectDB } from '../../lib/db.js';
import Testimonial from '../../lib/Testimonial.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClientReview } from '../../lib/toClientReview.js';

export default async function handler(req, res) {
  // Always fetch fresh — never let a CDN, proxy, or browser cache this,
  // so a save is reflected immediately on the very next read.
  res.setHeader('Cache-Control', 'no-store');

  try {
    await connectDB();

    if (req.method === 'GET' && req.query.meta !== undefined) {
      const query = isAuthorized(req) ? {} : { status: 'approved' };
      const [latest, count] = await Promise.all([
        Testimonial.findOne(query).sort({ updatedAt: -1 }).select('updatedAt').lean(),
        Testimonial.countDocuments(query),
      ]);
      const version = `${latest ? new Date(latest.updatedAt).getTime() : 0}-${count}`;
      return res.status(200).json({ version });
    }

    if (req.method === 'GET') {
      const authorized = isAuthorized(req);
      const query = authorized ? {} : { status: 'approved' };
      const docs = await Testimonial.find(query).sort({ id: 1 });
      return res.status(200).json(docs.map((d) => toClientReview(d, { includePhone: authorized })));
    }

    if (req.method === 'POST') {
      if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Incorrect or missing admin key.' });
      }

      const body = req.body || {};
      if (!body.name || !body.text) {
        return res.status(400).json({ error: 'name and text are required.' });
      }

      const last = await Testimonial.findOne().sort({ id: -1 });
      const nextId = last ? last.id + 1 : 1;

      const created = await Testimonial.create({ ...body, id: nextId, status: 'approved' });
      return res.status(201).json(toClientReview(created, { includePhone: true }));
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('api/testimonials error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
