// api/admin/products.js — POST /api/admin/products?op=reset
//                          POST /api/admin/products?op=import
//
// Both operations here are bulk, destructive-ish admin tools used by the
// admin panel's Import/Export page (see src/admin/productIO.js). Both
// require a valid admin session cookie (see lib/auth.js).

import { connectDB } from '../../lib/db.js';
import Product from '../../lib/Product.js';
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
      await Product.deleteMany({});
      return res.status(200).json([]);
    }

    if (op === 'import') {
      const items = req.body?.products;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Send { products: [...] } with at least one product.' });
      }

      // One counter increment per item, awaited in order — each call is
      // itself atomic (see lib/Counter.js), so even if another request
      // (a single POST, or another import) runs at the exact same time,
      // nobody ends up handed the same id twice.
      const toInsert = [];
      for (const p of items) {
        const id = await getNextId('Product');
        toInsert.push({ ...p, id });
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
