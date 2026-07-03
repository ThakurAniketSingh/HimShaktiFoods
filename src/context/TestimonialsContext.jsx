// TestimonialsContext — single source of truth for customer reviews shown
// on the Home page. Mirrors ProductsContext: talks to the /api/testimonials
// serverless functions (backed by MongoDB Atlas), and every page reads
// reviews only through this context (`useTestimonials()`).
//
// Moderation: the Reviews tab (route /admin/reviews) fetches EVERY review
// — pending and approved — so it can be moderated. Every other page
// (Home, and anywhere else this hook is used) always sees only "approved"
// reviews — even in a browser where the site owner is *also* logged into
// the admin panel. This is deliberately based on the CURRENT ROUTE, not
// merely "is there an admin key saved in this browser somewhere" — an
// admin key persists across sessions until logout, so gating on the key
// alone would mean the public Home page kept showing unapproved reviews
// (and skipping the cache below) for as long as the site owner stayed
// logged in anywhere on that device, even while just browsing their own
// site as a visitor would.
//
// HOW THE CACHING + REAL-TIME SYNC WORKS
// ───────────────────────────────────────
// Only the PUBLIC (approved-only) review list is ever cached in
// localStorage (key: hs_testimonials_public_v1, with its version at
// hs_testimonials_public_version_v1) — pending/unapproved reviews are
// never written to it, so moderation queue contents can't leak into a
// cache that's meant purely to speed up the public Home page.
//
// On any public page, the cache paints instantly on repeat visits, then
// a tiny /api/testimonials?meta=1 check (no review text/photos, just a
// short version string) runs in the background — the full review list is
// only re-fetched if that check finds something actually changed. The
// same cheap check re-runs every 30 seconds while the tab is visible
// (see useVisibleInterval), and immediately again when the tab regains
// focus, so an admin approving a review shows up for open visitor tabs
// within moments — without those tabs ever re-downloading the full
// review list unless it's actually different.
//
// On the /admin/reviews route specifically, caching is skipped: that
// page always starts from a real loading state and fetches the complete
// moderation queue fresh on first load, since correctness matters more
// than speed there. It still gets the same efficient background
// sync afterwards (scoped to the full pending+approved queue instead of
// the public one), so a second admin device / tab making a change is
// reflected there too, just as cheaply.
//
// Like products, deleting a review is permanent — there's no automatic
// reseed. The admin panel's Reviews tab has its own explicit
// "Clear All" button for wiping every review, and an "Import" button for
// loading your own from a JSON file.

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../admin/apiClient';
import { getAdminKey } from '../admin/adminAuth';
import { useVisibleInterval, SYNC_INTERVAL_MS } from '../hooks/useVisibleInterval';

// True only when the browser is actually sitting on an /admin/* URL.
// Checked at the moment of each fetch — matches "reload the Reviews tab"
// vs. "reload the Home page" exactly, without needing react-router's
// useLocation (this context is mounted above the router — see App.jsx —
// so that hook isn't available here anyway).
function isAdminSection() {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
}

// ── localStorage helpers (public/approved reviews only) ────────────
const CACHE_KEY = 'hs_testimonials_public_v1';
const VERSION_KEY = 'hs_testimonials_public_version_v1';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or blocked — silently skip.
  }
}

function readVersionCache() {
  try {
    return localStorage.getItem(VERSION_KEY);
  } catch {
    return null;
  }
}

function writeVersionCache(version) {
  try {
    if (version) localStorage.setItem(VERSION_KEY, version);
  } catch {
    // Storage quota exceeded or blocked — silently skip.
  }
}

const TestimonialsContext = createContext(null);

export function TestimonialsProvider({ children }) {
  // Only hydrate from cache when we're NOT on the admin Reviews route.
  const cached = useMemo(() => (isAdminSection() ? null : readCache()), []);
  const cachedVersion = useMemo(() => (isAdminSection() ? null : readVersionCache()), []);

  const [testimonials, setTestimonials] = useState(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  // Version this data corresponds to. For the admin/moderation scope this
  // is intentionally never written to localStorage (see file header) —
  // it just lives in memory for this one session's background sync.
  const versionRef = useRef(cachedVersion);
  const hasSyncedRef = useRef(cached !== null);

  const refresh = useCallback(async () => {
    setError('');
    const adminKey = getAdminKey();
    const isAdmin = Boolean(adminKey) && isAdminSection();

    try {
      const data = isAdmin ? await api.getAllTestimonials(adminKey) : await api.getTestimonials();
      const resolved = Array.isArray(data) ? data : [];
      setTestimonials(resolved);
      if (!isAdmin) writeCache(resolved);
      hasSyncedRef.current = true;
    } catch (err) {
      setError(err.message || 'Could not load reviews from the server.');
      setLoading(false);
      return;
    }
    setLoading(false);

    // Best-effort version bookkeeping — see ProductsContext for why this
    // is wrapped separately from the main fetch above.
    try {
      const meta = isAdmin ? await api.getTestimonialsMeta(adminKey) : await api.getTestimonialsMeta();
      versionRef.current = meta?.version ?? null;
      if (!isAdmin) writeVersionCache(versionRef.current);
    } catch {
      versionRef.current = null;
    }
  }, []);

  const syncIfChanged = useCallback(async () => {
    const adminKey = getAdminKey();
    const isAdmin = Boolean(adminKey) && isAdminSection();

    try {
      const meta = isAdmin ? await api.getTestimonialsMeta(adminKey) : await api.getTestimonialsMeta();
      if (meta?.version !== versionRef.current) {
        await refresh();
      } else {
        hasSyncedRef.current = true;
      }
    } catch {
      if (!hasSyncedRef.current) {
        await refresh();
      }
    }
  }, [refresh]);

  useEffect(() => {
    syncIfChanged();
  }, [syncIfChanged]);

  useVisibleInterval(syncIfChanged, SYNC_INTERVAL_MS);

  const addTestimonial = useCallback(async (testimonial) => {
    const created = await api.createTestimonial(testimonial, getAdminKey());
    setTestimonials((prev) => [...prev, created]);
    return created;
  }, []);

  const updateTestimonial = useCallback(async (id, updates) => {
    const updated = await api.updateTestimonial(id, updates, getAdminKey());
    setTestimonials((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }, []);

  const deleteTestimonial = useCallback(async (id) => {
    await api.deleteTestimonial(id, getAdminKey());
    setTestimonials((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllTestimonials = useCallback(async () => {
    const data = await api.clearAllTestimonials(getAdminKey());
    setTestimonials(data);
  }, []);

  const importTestimonials = useCallback(
    async (items) => {
      await api.importTestimonials(items, getAdminKey());
      await refresh();
    },
    [refresh]
  );

  // Public — anyone can call this, no admin key needed. Always lands as
  // "pending" on the server, so it never shows up anywhere until an
  // admin approves it, and never touches the public cache.
  const submitTestimonial = useCallback(async (review) => {
    return api.submitTestimonial(review);
  }, []);

  const value = useMemo(
    () => ({
      testimonials,
      loading,
      error,
      addTestimonial,
      updateTestimonial,
      deleteTestimonial,
      clearAllTestimonials,
      importTestimonials,
      submitTestimonial,
      refresh,
    }),
    [
      testimonials,
      loading,
      error,
      addTestimonial,
      updateTestimonial,
      deleteTestimonial,
      clearAllTestimonials,
      importTestimonials,
      submitTestimonial,
      refresh,
    ]
  );

  return <TestimonialsContext.Provider value={value}>{children}</TestimonialsContext.Provider>;
}

export function useTestimonials() {
  const ctx = useContext(TestimonialsContext);
  if (!ctx) throw new Error('useTestimonials must be used inside <TestimonialsProvider>');
  return ctx;
}
