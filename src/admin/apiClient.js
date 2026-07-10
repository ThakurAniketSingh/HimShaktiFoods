// src/admin/apiClient.js — every call the frontend makes to our own
// backend (the /api/* serverless functions) goes through here. Centralizing
// it means: one place that knows the URL shape and one place that turns a
// failed request into a readable error message for a toast.
//
// Admin authentication used to mean attaching an `x-admin-key` header
// with the raw password on every call. Now the server issues an httpOnly
// session cookie on login (see api/admin/login.js), and the browser
// attaches that cookie automatically on every request as long as we set
// `credentials: 'include'` — there's no longer anything for this file to
// read or attach by hand.

import { clearLoggedInFlag } from './adminAuth';

const BASE = '/api';

async function request(path, { method = 'GET', body, skipAuthRedirect = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // Send the httpOnly session cookie with every request (needed for
      // same-site fetch calls in some browsers' default cookie policies).
      credentials: 'include',
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
    // 401 on an admin-only route means the session cookie is missing or
    // expired (sessions last 12 hours — see lib/session.js). Without this,
    // the dashboard stays visible (the local "logged in" flag has no
    // expiry of its own) while every action silently fails underneath it.
    // Clearing the flag and bouncing to /admin/login makes the expiry
    // visible instead of confusing.
    if (res.status === 401 && !skipAuthRedirect) {
      clearLoggedInFlag();
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  getProducts: () => request('/products'),
  getProductsMeta: () => request('/products?meta=1'),
  createProduct: (product) => request('/products', { method: 'POST', body: product }),
  updateProduct: (id, updates) => request(`/products/${id}`, { method: 'PUT', body: updates }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  clearAllProducts: () => request('/admin/products?op=reset', { method: 'POST' }),
  importProducts: (products) =>
    request('/admin/products?op=import', { method: 'POST', body: { products } }),
  login: (password) => request('/admin/login', { method: 'POST', body: { password }, skipAuthRedirect: true }),
  logout: () => request('/admin/logout', { method: 'POST', skipAuthRedirect: true }),

  getTestimonials: () => request('/testimonials'),
  getAllTestimonials: () => request('/testimonials'),
  getTestimonialsMeta: () => request('/testimonials?meta=1'),
  createTestimonial: (testimonial) => request('/testimonials', { method: 'POST', body: testimonial }),
  updateTestimonial: (id, updates) => request(`/testimonials/${id}`, { method: 'PUT', body: updates }),
  deleteTestimonial: (id) => request(`/testimonials/${id}`, { method: 'DELETE' }),
  clearAllTestimonials: () => request('/admin/testimonials?op=reset', { method: 'POST' }),
  importTestimonials: (testimonials) =>
    request('/admin/testimonials?op=import', { method: 'POST', body: { testimonials } }),
  submitTestimonial: (review) => request('/testimonials/submit', { method: 'POST', body: review, skipAuthRedirect: true }),

  getContactInfo: () => request('/contact'),
  getContactMeta: () => request('/contact?meta=1'),
  updateContactInfo: (updates) => request('/contact', { method: 'PUT', body: updates }),

  sendChatMessage: (messages) => request('/chat', { method: 'POST', body: { messages } }),
};