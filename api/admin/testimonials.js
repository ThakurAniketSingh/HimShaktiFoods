// api/admin/testimonials.js — POST /api/admin/testimonials?op=reset and
// POST /api/admin/testimonials?op=import
//
// Two bulk review actions merged into one file (reachable via the ?op=
// query parameter) purely to stay under Vercel's serverless function
// count limit — each one's behavior is byte-for-byte identical to what
// used to be two separate files (api/admin/reset-testimonials.js and
// api/admin/import-testimonials.js). Both require the correct
// admin session cookie (see lib/auth.js).
//
// ?op=reset — deletes EVERY review from the database, leaving the
// Reviews section completely empty. This is what the Reviews admin
// panel's "Clear All" button calls — meant for when you want to wipe the
// sample reviews and manually re-import your own reviews from a JSON
// file instead. This does NOT bring back the original sample reviews —
// there is no automatic reseed.
//
// ?op=import — bulk-adds an array of reviews (sent as
// { testimonials: [...] } in the request body) on top of whatever's
// already in the database, assigning each one the next free numeric id.

import { connectDB } from '../../lib/db.js';
import Testimonial from '../../lib/Testimonial.js';
import { isAuthorized } from '../../lib/auth.js';
import { getNextId } from '../../lib/Counter.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Incorrect or missing admin key.' });
  }

  const op = req.query.op;

  try {
    await connectDB();

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
