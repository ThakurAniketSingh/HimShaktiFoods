// api/_handlers/products.js — all product-related route logic.
//
// This is a PLAIN module, not a Vercel serverless function by itself —
// it doesn't count against Vercel's function limit. The single catch-all
// router at api/[[...path]].js imports this and calls the right function
// depending on the URL. Splitting the logic out this way keeps each
// concern in its own readable file while still shipping as one function.
//
// Routes covered:
//   GET    /api/products            — public catalog list
//   GET    /api/products?meta=1     — public "has anything changed?" signal
//   POST   /api/products            — admin: add a product
//   PUT    /api/products/:id        — admin: edit a product
//   DELETE /api/products/:id        — admin: delete a product

import Product from '../../lib/Product.js';
import { isAuthorized } from '../../lib/auth.js';
import { toClient } from '../../lib/toClient.js';
import { getNextId } from '../../lib/Counter.js';

// GET /api/products and GET /api/products?meta=1
export async function listProducts(req, res) {
  if (req.query.meta !== undefined) {
    // A deliberately TINY response — never the actual products (no
    // images, no descriptions, nothing large), just a short "version"
    // string built from the most recently updated product's timestamp
    // plus the total product count. Together they catch every kind of
    // change — add, edit, or delete — with two small, indexed queries.
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

// POST /api/products
export async function createProduct(req, res) {
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

// PUT /api/products/:id and DELETE /api/products/:id
export async function updateOrDeleteProduct(req, res, id) {
  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Incorrect or missing admin key.' });
  }

  if (req.method === 'PUT') {
    const updates = { ...(req.body || {}) };
    delete updates.id; // id is never changed via an update

    const updated = await Product.findOneAndUpdate({ id }, updates, { new: true });
    if (!updated) return res.status(404).json({ error: 'Product not found.' });
    return res.status(200).json(toClient(updated));
  }

  if (req.method === 'DELETE') {
    const deleted = await Product.findOneAndDelete({ id });
    if (!deleted) return res.status(404).json({ error: 'Product not found.' });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).json({ error: `Method ${req.method} not allowed.` });
}

// POST /api/admin/products?op=reset
export async function resetProducts(req, res) {
  await Product.deleteMany({});
  return res.status(200).json([]);
}

// POST /api/admin/products?op=import
export async function importProducts(req, res) {
  const items = req.body?.products;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Send { products: [...] } with at least one product.' });
  }

  // One counter increment per item, awaited in order — each call is
  // itself atomic (see lib/Counter.js), so even if another request runs
  // at the exact same time, nobody ends up handed the same id twice.
  const toInsert = [];
  for (const p of items) {
    const id = await getNextId('Product');
    toInsert.push({ ...p, id });
  }

  const created = await Product.insertMany(toInsert);
  return res.status(201).json({ inserted: created.length });
}
