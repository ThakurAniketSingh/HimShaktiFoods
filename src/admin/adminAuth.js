// adminAuth — now backed by a real server-side session (see
// api/admin/login.js and lib/session.js) instead of remembering the raw
// admin password in the browser.
//
// After a correct login, the SERVER sets an httpOnly session cookie —
// one that page JavaScript can never read. This file only remembers a
// small, non-secret "was I logged in?" flag in localStorage, purely so
// the UI knows whether to show the login form or the dashboard on the
// next visit. That flag proves nothing by itself — every admin API call
// is still checked server-side against the real cookie
// (see lib/auth.js) — so even if someone edited this flag directly in
// devtools, they still couldn't add/edit/delete anything without the
// actual cookie.

const LOGGED_IN_FLAG_KEY = 'himshakti_admin_logged_in';

export function markLoggedIn() {
  try {
    localStorage.setItem(LOGGED_IN_FLAG_KEY, '1');
  } catch {
    // Login still works for this page load even if it can't be remembered.
  }
}

function clearLoggedInFlag() {
  try {
    localStorage.removeItem(LOGGED_IN_FLAG_KEY);
  } catch {
    // Nothing to clean up if storage isn't available.
  }
}

// NOTE: this is only a UI hint, not real authentication. The actual gate
// is the httpOnly cookie, checked server-side on every write request.
export function isAuthenticated() {
  try {
    return localStorage.getItem(LOGGED_IN_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

// Tells the server to clear the session cookie, then clears our local
// UI flag too. Fire-and-forget on the network call — even if it fails
// (e.g. offline), we still clear the local flag so the UI logs out.
export async function logout() {
  try {
    await fetch('/api/admin/logout', { method: 'POST' });
  } catch {
    // Ignore network errors — still clear the local flag below.
  }
  clearLoggedInFlag();
}
