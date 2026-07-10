// api/[[...path]].js — THE catch-all API router.
//
// WHY THIS FILE EXISTS: Vercel's free (Hobby) plan caps a project at 12
// serverless functions. Each separate file under /api used to count as
// its own function — products, testimonials, contact, admin login,
// admin logout, admin bulk products, admin bulk testimonials, and the
// two [id].js dynamic routes added up fast. This single file replaces
// all of those. Vercel's `[[...path]]` filename is a special "catch-all"
// pattern: it matches ANY url under /api/* (except api/chat.js, which
// stays separate since it's already its own big, self-contained thing)
// and hands us the matched segments as `req.query.path` — an array like
// ['products'] for /api/products, or ['products', '42'] for
// /api/products/42.
//
// Below, we just look at `req.query.path` and `req.method` and call the
// matching function from api/_handlers/*.js. Each handler file still
// only knows about its own concern (products, testimonials, contact,
// admin) — this file's only job is routing, not business logic.
//
// End result: the same URLs work exactly as before (/api/products,
// /api/products/42, /api/testimonials/submit, /api/admin/login, etc.) —
// nothing on the frontend needed to change — but Vercel now only counts
// TWO functions total for the whole API: this file, and api/chat.js.

import { connectDB } from '../lib/db.js';

import { listProducts, createProduct, updateOrDeleteProduct, resetProducts, importProducts } from './_handlers/products.js';
import {
  listTestimonials,
  createTestimonial,
  updateOrDeleteTestimonial,
  resetTestimonials,
  importTestimonials,
  submitTestimonial,
} from './_handlers/testimonials.js';
import { getContact, updateContact } from './_handlers/contact.js';
import { adminLogin, adminLogout, adminSessionCheck } from './_handlers/admin.js';

export default async function handler(req, res) {
  // Always fetch fresh — never let a CDN, proxy, or browser cache any
  // API response, so an admin save is reflected immediately on the very
  // next read.
  res.setHeader('Cache-Control', 'no-store');

  const segments = Array.isArray(req.query.path) ? req.query.path : [];
  const [first, second] = segments;

  try {
    await connectDB();

    // ── /api/products, /api/products/:id ─────────────────────────────
    if (first === 'products') {
      if (second === undefined) {
        if (req.method === 'GET') return await listProducts(req, res);
        if (req.method === 'POST') return await createProduct(req, res);
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed.` });
      }
      // /api/products/:id
      const id = Number(second);
      return await updateOrDeleteProduct(req, res, id);
    }

    // ── /api/testimonials, /api/testimonials/:id, /api/testimonials/submit ──
    if (first === 'testimonials') {
      if (second === undefined) {
        if (req.method === 'GET') return await listTestimonials(req, res);
        if (req.method === 'POST') return await createTestimonial(req, res);
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed.` });
      }
      if (second === 'submit') {
        if (req.method !== 'POST') {
          res.setHeader('Allow', ['POST']);
          return res.status(405).json({ error: 'Method not allowed.' });
        }
        return await submitTestimonial(req, res);
      }
      // /api/testimonials/:id
      const id = Number(second);
      return await updateOrDeleteTestimonial(req, res, id);
    }

    // ── /api/contact ──────────────────────────────────────────────────
    if (first === 'contact' && second === undefined) {
      if (req.method === 'GET') return await getContact(req, res);
      if (req.method === 'PUT') return await updateContact(req, res);
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ error: `Method ${req.method} not allowed.` });
    }

    // ── /api/admin/login, /api/admin/logout ─────────────────────────
    if (first === 'admin' && second === 'login') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed.' });
      }
      return await adminLogin(req, res);
    }
    if (first === 'admin' && second === 'logout') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed.' });
      }
      return await adminLogout(req, res);
    }
    if (first === 'admin' && second === 'session') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: 'Method not allowed.' });
      }
      return await adminSessionCheck(req, res);
    }

    // ── /api/admin/products?op=reset|import ─────────────────────────
    if (first === 'admin' && second === 'products') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed.' });
      }
      const { isAuthorized } = await import('../lib/auth.js');
      if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Incorrect or missing admin key.' });
      }
      if (req.query.op === 'reset') return await resetProducts(req, res);
      if (req.query.op === 'import') return await importProducts(req, res);
      return res.status(400).json({ error: 'Unknown or missing ?op= — expected "reset" or "import".' });
    }

    // ── /api/admin/testimonials?op=reset|import ─────────────────────
    if (first === 'admin' && second === 'testimonials') {
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method not allowed.' });
      }
      const { isAuthorized } = await import('../lib/auth.js');
      if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'Incorrect or missing admin key.' });
      }
      if (req.query.op === 'reset') return await resetTestimonials(req, res);
      if (req.query.op === 'import') return await importTestimonials(req, res);
      return res.status(400).json({ error: 'Unknown or missing ?op= — expected "reset" or "import".' });
    }

    return res.status(404).json({ error: 'Not found.' });
  } catch (err) {
    console.error(`api router error [${req.method} /api/${segments.join('/')}]:`, err);
    return res.status(500).json({ error: 'Something went wrong on the server.' });
  }
}
