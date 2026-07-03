// api/products/index.js — GET /api/products, GET /api/products?meta=1,
// and POST /api/products
//
// GET is public (anyone visiting the site needs to read the catalog).
// GET with ?meta=1 returns a tiny "has anything changed?" version signal
// instead of the full catalog (used to be its own /api/products/meta
// file — merged in here purely to stay under Vercel's serverless
// function count limit; the behavior is byte-for-byte identical, just
// reached via a query parameter instead of a second file/route).
// POST is protected (only someone with the correct x-admin-key header can
// add a product).
//
// Note: this used to auto-reseed the catalog from src/data.js whenever the
// database was empty. That was removed — deleting products (from the admin
// panel or directly in MongoDB) is now permanent. The admin panel's
// "Clear All" button (calls /api/admin/products?op=reset) only empties the
// catalog — it does not bring the sample products back. Use the Import
// button with a JSON file if you want products back.

import { connectDB } from '../../lib/db.js';
import Product from '../../lib/Product.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClient } from '../../lib/toClient.js';

export default async function handler(req, res) {
  // Always fetch fresh — never let a CDN, proxy, or browser cache this,
  // so a save is reflected immediately on the very next read.
  res.setHeader('Cache-Control', 'no-store');

  try {
    await connectDB();

    if (req.method === 'GET' && req.query.meta !== undefined) {
      // ── Meta: "has the catalog changed since I last checked?" ──────
      // A deliberately TINY response — never the actual products (no
      // images, no descriptions, nothing large), just a short "version"
      // string built from the most recently updated product's timestamp
      // plus the total product count:
      //
      //   "<latest updatedAt in ms>-<total count>"
      //
      // Why both pieces: updatedAt alone would miss a DELETE (removing a
      // product doesn't change any *other* product's updatedAt), and
      // count alone would miss an EDIT (changing a product's price
      // doesn't change how many products exist). Together they catch
      // every kind of change — add, edit, or delete — with two small,
      // indexed queries.
      //
      // The frontend (see src/context/ProductsContext.jsx) polls this on
      // a timer and only fetches the full catalog when this version
      // string actually differs from the one it already has cached.
      const [latest, count] = await Promise.all([
        Product.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean(),
        // estimatedDocumentCount() reads collection metadata instead of
        // scanning documents — the cheapest possible way to get a count.
        Product.estimatedDocumentCount(),
      ]);
      const version = `${latest ? new Date(latest.updatedAt).getTime() : 0}-${count}`;
      return res.status(200).json({ version });
    }

    if (req.method === 'GET') {
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

      const last = await Product.findOne().sort({ id: -1 });
      const nextId = last ? last.id + 1 : 1;

      const created = await Product.create({ ...body, id: nextId });
      return res.status(201).json(toClient(created));
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  } catch (err) {
    console.error('api/products error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
