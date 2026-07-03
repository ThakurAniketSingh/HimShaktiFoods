// api/testimonials/[id].js — PUT /api/testimonials/:id and
// DELETE /api/testimonials/:id
//
// The [id] in the filename is Vercel's convention for a dynamic route
// segment — whatever value is in that part of the URL shows up as
// req.query.id. Both methods here are protected: only requests carrying
// the correct x-admin-key header are allowed through.

import { connectDB } from '../../lib/db.js';
import Testimonial from '../../lib/Testimonial.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClientReview } from '../../lib/toClientReview.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    await connectDB();

    const id = Number(req.query.id);
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
  } catch (err) {
    console.error('api/testimonials/[id] error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
