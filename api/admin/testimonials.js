// api/admin/testimonials.js — POST /api/admin/testimonials?op=reset
//                              POST /api/admin/testimonials?op=import
//
// Both operations require a valid admin session cookie (see lib/auth.js).

import { connectDB } from '../../lib/db.js';
import Testimonial from '../../lib/Testimonial.js';
import { isAuthorized } from '../../lib/auth.js';
import { getNextId } from '../../lib/Counter.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    await connectDB();

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: 'Method not allowed.' });
    }

    if (!isAuthorized(req)) {
      return res.status(401).json({ error: 'Incorrect or missing admin key.' });
    }

    const { op } = req.query;

    if (op === 'reset') {
      await Testimonial.deleteMany({});
      return res.status(200).json([]);
    }

    if (op === 'import') {
      const items = req.body?.testimonials;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Send { testimonials: [...] } with at least one review.' });
      }

      // One counter increment per item, awaited in order — see
      // lib/Counter.js for why this avoids duplicate ids under
      // concurrent requests.
      const toInsert = [];
      for (const t of items) {
        const id = await getNextId('Testimonial');
        toInsert.push({ ...t, id });
      }

      const created = await Testimonial.insertMany(toInsert);
      return res.status(201).json({ inserted: created.length });
    }

    return res.status(400).json({ error: 'Unknown or missing ?op= — expected "reset" or "import".' });
  } catch (err) {
    console.error('api/admin/testimonials error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
