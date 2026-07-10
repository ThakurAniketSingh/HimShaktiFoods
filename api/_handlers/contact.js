// api/_handlers/contact.js — all contact-info route logic.
// See api/_handlers/products.js for why this is a plain module and not
// its own Vercel function.
//
// Routes covered:
//   GET /api/contact          — public: read contact info
//   GET /api/contact?meta=1   — public "has anything changed?" signal
//   PUT /api/contact          — admin: edit contact info
//
// Unlike products/testimonials, there's exactly one ContactInfo document
// and no "delete" action in the UI, so GET safely creates it with
// sensible defaults the very first time it's read if it doesn't exist yet.

import ContactInfo from '../../lib/ContactInfo.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClient } from '../../lib/toClient.js';

export async function getContact(req, res) {
  if (req.query.meta !== undefined) {
    const doc = await ContactInfo.findOne().select('updatedAt').lean();
    const version = doc ? String(new Date(doc.updatedAt).getTime()) : '0';
    return res.status(200).json({ version });
  }

  let doc = await ContactInfo.findOne();
  if (!doc) doc = await ContactInfo.create({});
  return res.status(200).json(toClient(doc));
}

export async function updateContact(req, res) {
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
