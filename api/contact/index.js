// api/contact/index.js — GET /api/contact and PUT /api/contact
//
// GET is public: it returns the site's current contact/address info
// shown on the Contact page. With ?meta=1 it instead returns a tiny
// "version" signal, same idea as the products/testimonials meta routes.
// PUT is protected (only someone with a valid admin session cookie —
// see lib/auth.js — can update contact info).
//
// Unlike products/testimonials, there's exactly one ContactInfo document
// and no "delete" action in the UI, so GET safely creates it with
// sensible defaults the very first time it's read if it doesn't exist yet.

import { connectDB } from '../../lib/db.js';
import ContactInfo from '../../lib/ContactInfo.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClient } from '../../lib/toClient.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    await connectDB();

    if (req.method === 'GET') {
      if (req.query.meta !== undefined) {
        const doc = await ContactInfo.findOne().select('updatedAt').lean();
        const version = doc ? String(new Date(doc.updatedAt).getTime()) : '0';
        return res.status(200).json({ version });
      }

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
    console.error('api/contact/index error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
