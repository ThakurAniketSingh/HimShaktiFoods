// api/contact/index.js — GET /api/contact, GET /api/contact?meta=1, and
// PUT /api/contact
//
// GET is public (the storefront's Contact page needs to read this on
// every visit). GET with ?meta=1 returns a tiny "has anything changed?"
// version signal instead of the full document (used to be its own
// /api/contact/meta file — merged in here purely to stay under Vercel's
// serverless function count limit; the behavior is byte-for-byte
// identical, just reached via a query parameter instead of a second
// file/route). Since ContactInfo is a singleton (there's only ever one
// document), the version is just that document's own updatedAt
// timestamp — no count needed, because there's nothing to add or
// delete, only ever something to edit.
//
// PUT is protected (only someone with a valid admin session cookie —
// the admin panel's Contact Page tab — can change it).
//
// Unlike products/testimonials, there's exactly one ContactInfo document
// and no "delete" action in the UI, so GET safely creates it with sensible
// defaults the very first time it's read if it doesn't exist yet. That's
// not the same "auto-refill" problem we removed from /api/products —
// there, deleting an item should stay deleted; here, there is nothing to
// delete, only ever something to edit.

import { connectDB } from '../../lib/db.js';
import ContactInfo from '../../lib/ContactInfo.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClient } from '../../lib/toClient.js';

export default async function handler(req, res) {
  // Always fetch fresh — never let a CDN, proxy, or browser cache this,
  // so a save is reflected immediately on the very next read.
  res.setHeader('Cache-Control', 'no-store');

  try {
    await connectDB();

    if (req.method === 'GET' && req.query.meta !== undefined) {
      const doc = await ContactInfo.findOne().select('updatedAt').lean();
      const version = doc ? String(new Date(doc.updatedAt).getTime()) : '0';
      return res.status(200).json({ version });
    }

    if (req.method === 'GET') {
      let doc = await ContactInfo.findOne();
      if (!doc) doc = await ContactInfo.create({});
      return res.status(200).json(toClient(doc));
    }

    if (req.method === 'PUT') {
      if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Incorrect or missing admin key.' });
      }

      const updates = { ...(req.body || {}) };
      delete updates._id;
      delete updates.id;
      delete updates.createdAt;
      delete updates.updatedAt;

      let doc = await ContactInfo.findOne();
      if (!doc) {
        doc = await ContactInfo.create(updates);
      } else {
        Object.assign(doc, updates);
        await doc.save();
      }
      return res.status(200).json(toClient(doc));
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('api/contact error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
