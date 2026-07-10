// api/testimonials/index.js — GET /api/testimonials and POST /api/testimonials
//
// GET is public, but what it returns depends on who's asking:
//   - Normal visitors (no valid admin session) only get reviews with
//     status "approved" — pending submissions stay invisible until an
//     admin approves them. They also never get the `phone` field.
//   - The admin panel (holds a valid session cookie — see lib/auth.js)
//     gets EVERY review, pending and approved, INCLUDING each reviewer's
//     phone number — so it can verify a submission is genuine before
//     approving.
//
// POST is protected: it's how the admin panel adds an already-approved
// review directly (visitor submissions go through /api/testimonials/submit
// instead, and land as "pending").

import { connectDB } from '../../lib/db.js';
import Testimonial from '../../lib/Testimonial.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClientReview } from '../../lib/toClientReview.js';
import { getNextId } from '../../lib/Counter.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    await connectDB();

    if (req.method === 'GET') {
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

    if (req.method === 'POST') {
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

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('api/testimonials/index error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
