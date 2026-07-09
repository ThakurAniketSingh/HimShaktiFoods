// adminAuth — now backed by the real /api/admin/login endpoint instead of
// a hardcoded password baked into the frontend bundle.
//
// The password itself is checked SERVER-SIDE (see api/admin/login.js)
// against the ADMIN_PASSWORD environment variable, which never ships to
// the browser. After a correct login, the browser remembers that same
// password locally so it can resend it as the x-admin-key header on every
// future write request (add/edit/delete/import/reset) — the backend
// checks that header on every one of those calls independently, so this
// is genuinely enforced server-side, not just a UI gate.

const STORAGE_KEY = 'himshakti_admin_key';

export function setAdminKey(password) {
  try {
    localStorage.setItem(STORAGE_KEY, password);
  } catch {
    // Login still works for this page load even if it can't be remembered.
  }
}

export function getAdminKey() {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function clearAdminKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage isn't available.
  }
}

export function isAuthenticated() {
  return Boolean(getAdminKey());
}

// Kept as a friendly alias so existing imports (e.g. in AdminLayout) don't
// need to change.
export function logout() {
  clearAdminKey();
}
