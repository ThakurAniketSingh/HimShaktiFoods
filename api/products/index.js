// api/products/index.js — GET /api/products and POST /api/products
//
// GET is public and returns the full product catalog (or, with
// ?meta=1, a tiny "version" signal used to detect changes without
// re-downloading everything — see listProducts below).
// POST is protected (only someone with a valid admin session cookie can
// add a product — see lib/auth.js).

import { connectDB } from '../../lib/db.js';
import Product from '../../lib/Product.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClient } from '../../lib/toClient.js';
import { getNextId } from '../../lib/Counter.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  try {
    await connectDB();

    if (req.method === 'GET') {
      if (req.query.meta !== undefined) {
        // A deliberately TINY response — never the actual products (no
        // images, no descriptions, nothing large), just a short
        // "version" string built from the most recently updated
        // product's timestamp plus the total product count. Together
        // they catch every kind of change — add, edit, or delete — with
        // two small, indexed queries.
        const [latest, count] = await Promise.all([
          Product.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
          Product.estimatedDocumentCount(),
        ]);
        const version = `${latest ? new Date(latest.updatedAt).getTime() : 0}-${count}`;
        return res.status(200).json({ version });
      }

      const docs = await Product.find().sort({ id: 1 });
      return res.status(200).json(docs.map(toClient));
    }

    if (req.method === 'POST') {
      if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Incorrect or missing admin key.' });
      }

      const body = req.body || {};
      const priceNum = Number(body.price);
      if (!body.name || !body.category || !Number.isFinite(priceNum) || priceNum < 0) {
        return res.status(400).json({ error: 'name, category, and a valid non-negative price are required.' });
      }

      const nextId = await getNextId('Product');
      const created = await Product.create({ ...body, id: nextId });
      return res.status(201).json(toClient(created));
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('api/products/index error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
