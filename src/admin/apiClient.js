// src/admin/apiClient.js — every call the frontend makes to our own
// backend (the /api/* serverless functions) goes through here. Centralizing
// it means: one place that knows the URL shape, one place that attaches
// the admin key header, and one place that turns a failed request into a
// readable error message for a toast.

const BASE = '/api';

async function request(path, { method = 'GET', body, adminKey } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminKey) headers['x-admin-key'] = adminKey;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Never serve a cached response — without this, some browsers will
      // show stale data for a moment (e.g. the old address) right after
      // a save, before a background revalidation catches up.
      cache: 'no-store',
    });
  } catch {
    throw new Error('Could not reach the server. Check your internet connection.');
  }

  // Only parse JSON if the server actually sent JSON back.
  // When running plain `vite` (without `vercel dev`), /api/* routes don't
  // exist and Vite returns the HTML index page (200 OK, text/html) as a
  // fallback. Trying to JSON.parse that HTML returns null, which then gets
  // stored in state and causes "Cannot read properties of null" crashes.
  // Checking Content-Type first means we throw a proper error instead.
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      // Malformed JSON — treat as empty
    }
  } else if (res.ok && res.status !== 204) {
    // Got a 2xx response but NOT JSON — almost certainly the Vite HTML
    // fallback. Throw so the context catch block runs and leaves the safe
    // default state in place rather than overwriting it with null.
    await res.text().catch(() => {});
    throw new Error('API not available. Run `vercel dev` instead of `vite` to use backend features.');
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getProducts: () => request('/products'),
  getProductsMeta: () => request('/products?meta=1'),
  createProduct: (product, adminKey) => request('/products', { method: 'POST', body: product, adminKey }),
  updateProduct: (id, updates, adminKey) => request(`/products/${id}`, { method: 'PUT', body: updates, adminKey }),
  deleteProduct: (id, adminKey) => request(`/products/${id}`, { method: 'DELETE', adminKey }),
  clearAllProducts: (adminKey) => request('/admin/products?op=reset', { method: 'POST', adminKey }),
  importProducts: (products, adminKey) =>
    request('/admin/products?op=import', { method: 'POST', body: { products }, adminKey }),
  login: (password) => request('/admin/login', { method: 'POST', body: { password } }),

  getTestimonials: () => request('/testimonials'),
  getAllTestimonials: (adminKey) => request('/testimonials', { adminKey }),
  getTestimonialsMeta: (adminKey) => request('/testimonials?meta=1', { adminKey }),
  createTestimonial: (testimonial, adminKey) => request('/testimonials', { method: 'POST', body: testimonial, adminKey }),
  updateTestimonial: (id, updates, adminKey) => request(`/testimonials/${id}`, { method: 'PUT', body: updates, adminKey }),
  deleteTestimonial: (id, adminKey) => request(`/testimonials/${id}`, { method: 'DELETE', adminKey }),
  clearAllTestimonials: (adminKey) => request('/admin/testimonials?op=reset', { method: 'POST', adminKey }),
  importTestimonials: (testimonials, adminKey) =>
    request('/admin/testimonials?op=import', { method: 'POST', body: { testimonials }, adminKey }),
  submitTestimonial: (review) => request('/testimonials/submit', { method: 'POST', body: review }),

  getContactInfo: () => request('/contact'),
  getContactMeta: () => request('/contact?meta=1'),
  updateContactInfo: (updates, adminKey) => request('/contact', { method: 'PUT', body: updates, adminKey }),
};