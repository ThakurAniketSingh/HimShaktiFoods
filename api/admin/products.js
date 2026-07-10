// api/admin/products.js — POST /api/admin/products?op=reset and
// POST /api/admin/products?op=import
//
// Two bulk product actions merged into one file (reachable via the ?op=
// query parameter) purely to stay under Vercel's serverless function
// count limit — each one's behavior is byte-for-byte identical to what
// used to be two separate files (api/admin/reset.js and
// api/admin/import.js). Both require a valid admin session cookie (see lib/auth.js).
//
// ?op=reset — deletes EVERY product from the database, leaving the
// catalog completely empty. This is what the Products admin panel's
// "Clear All" button calls — it's meant for when you want to wipe the
// sample catalog and manually re-import your own product list from a
// JSON file instead. This does NOT bring back the original sample
// products — there is no automatic reseed (see api/products/index.js
// for why).
//
// ?op=import — bulk-adds an array of products (sent as
// { products: [...] } in the request body) on top of whatever's already
// in the database, assigning each one the next free numeric id.

import { connectDB } from '../../lib/db.js';
import Product from '../../lib/Product.js';
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
      await Product.deleteMany({});
      return res.status(200).json([]);
    }

    if (op === 'import') {
      const items = req.body?.products;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Send { products: [...] } with at least one product.' });
      }

      // Validate every item BEFORE writing anything — same rules already
      // enforced on the single-product POST route (see
      // api/products/index.js). Catching a bad row here means one typo'd
      // JSON file can't silently insert a nameless or negative-price
      // product; the whole import is rejected with a precise pointer to
      // which item (and which field) was the problem, so it's easy to fix
      // and re-upload rather than ending up with a half-imported catalog.
      for (let i = 0; i < items.length; i++) {
        const p = items[i];
        const priceNum = Number(p?.price);
        if (!p || typeof p !== 'object') {
          return res.status(400).json({ error: `Item ${i + 1}: expected a product object.` });
        }
        if (!p.name || typeof p.name !== 'string') {
          return res.status(400).json({ error: `Item ${i + 1} ("${p.name || 'unnamed'}"): name is required.` });
        }
        if (!p.category || typeof p.category !== 'string') {
          return res.status(400).json({ error: `Item ${i + 1} ("${p.name}"): category is required.` });
        }
        if (!Number.isFinite(priceNum) || priceNum < 0) {
          return res.status(400).json({ error: `Item ${i + 1} ("${p.name}"): a valid non-negative price is required.` });
        }
      }

      // One counter increment per item, awaited in order — each call is
      // itself atomic (see lib/Counter.js), so even if another request
      // (a single POST, or another import) runs at the exact same time,
      // nobody ends up handed the same id twice.
      const toInsert = [];
      for (const p of items) {
        const id = await getNextId('Product');
        toInsert.push({ ...p, price: Number(p.price), id });
      }

      const created = await Product.insertMany(toInsert);
      return res.status(201).json({ inserted: created.length });
    }

    return res.status(400).json({ error: 'Unknown or missing ?op= — expected "reset" or "import".' });
  } catch (err) {
    console.error('api/admin/products error:', err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
