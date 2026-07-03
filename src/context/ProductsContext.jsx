// ProductsContext — single source of truth for the product catalog.
//
// This talks to a real backend (the /api/products serverless functions,
// backed by MongoDB Atlas). Every page still reads products only through
// this context (`useProducts()`).
//
// HOW THE CACHING + REAL-TIME SYNC WORKS
// ───────────────────────────────────────
// The full catalog is cached in localStorage (key: hs_products_v1) after
// every successful fetch, alongside a short "version" string
// (hs_products_version_v1) from the tiny /api/products?meta=1 endpoint.
//
//   1. First-ever visit: nothing cached yet → skeleton cards show while
//      the first real fetch completes.
//   2. Every visit after that: the cached catalog paints INSTANTLY
//      (loading=false from the very first render) — then, in the
//      background, we ask the tiny /meta endpoint "has anything
//      changed?" If not, we stop right there — no catalog re-download,
//      no re-render, essentially zero extra load on the server. If it
//      HAS changed, only then do we fetch the full catalog and update
//      both the screen and the cache.
//   3. While the tab stays open, the same cheap check repeats every
//      30 seconds (see useVisibleInterval) — but only while the tab is
//      actually visible, and immediately again the moment the user
//      switches back to it. A backgrounded tab sends nothing at all.
//
// This is what makes the storefront feel "live" (an admin's product
// edit shows up for open visitor tabs within moments) without hammering
// MongoDB with full-catalog reads on every tick — only the /meta check
// (two tiny indexed queries, no images) runs on a timer; the expensive
// full fetch only happens when something actually changed.
//
// Admin write actions (add/edit/delete/import/reset) still update the
// local state + cache immediately for instant feedback in the admin
// panel — the next background check elsewhere will naturally pick up
// the same change moments later.
//
// Admin write actions send the saved admin key (see adminAuth.js) to the
// server on every call; the server checks it independently, so this is
// enforced on the backend, not just hidden in the UI.

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../admin/apiClient';
import { getAdminKey } from '../admin/adminAuth';
import { useVisibleInterval, SYNC_INTERVAL_MS } from '../hooks/useVisibleInterval';

// The "house" order categories have always appeared in across the site.
// Anything outside this list (a brand-new category created from the admin
// panel) is appended afterwards, alphabetically.
const CANONICAL_CATEGORY_ORDER = ['snacks', 'juices', 'pickles', 'sweets', 'superfoods'];

// ── localStorage helpers ──────────────────────────────────────────
// Versioned keys so we can invalidate old cached shapes if the product
// schema (or the sync mechanism itself) ever changes.
const CACHE_KEY = 'hs_products_v1';
const VERSION_KEY = 'hs_products_version_v1';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    // localStorage is blocked (some private-browsing modes) or the JSON
    // is malformed — treat as no cache, fall back to the loading state.
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

const ProductsContext = createContext(null);

export function ProductsProvider({ children }) {
  // Read the cache synchronously so the very first render already has
  // real products — no skeleton flash on repeat visits.
  const cached = useMemo(() => readCache(), []);
  const cachedVersion = useMemo(() => readVersionCache(), []);

  const [products, setProducts] = useState(cached ?? []);
  // loading = false immediately when we have a valid cache.
  // Only true on a user's very first-ever visit (nothing cached yet).
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  // The version string the currently-displayed data corresponds to.
  // A ref (not state) because updating it should never itself trigger a
  // re-render — only setProducts/setLoading/setError should.
  const versionRef = useRef(cachedVersion);
  // Have we EVER successfully loaded real data (from cache or network)?
  // Used so a failed background check never leaves a first-time visitor
  // stuck looking at an empty/loading page forever.
  const hasSyncedRef = useRef(cached !== null);

  // The expensive path: fetch the whole catalog and replace everything.
  const refresh = useCallback(async () => {
    setError('');
    try {
      const data = await api.getProducts();
      const resolved = Array.isArray(data) ? data : [];
      setProducts(resolved);
      writeCache(resolved);
      hasSyncedRef.current = true;
    } catch (err) {
      setError(err.message || 'Could not load products from the server.');
      setLoading(false);
      return;
    }
    setLoading(false);

    // Best-effort: record which version this data corresponds to, so
    // future background checks can tell whether anything has changed
    // without re-fetching the whole catalog. If this one call fails, the
    // next check just treats the version as "unknown → different" and
    // safely re-fetches — self-correcting, never breaks anything.
    try {
      const meta = await api.getProductsMeta();
      versionRef.current = meta?.version ?? null;
      writeVersionCache(versionRef.current);
    } catch {
      versionRef.current = null;
    }
  }, []);

  // The cheap path: ask "has anything changed?" and only call the
  // expensive refresh() above if the answer is yes.
  const syncIfChanged = useCallback(async () => {
    try {
      const meta = await api.getProductsMeta();
      if (meta?.version !== versionRef.current) {
        await refresh();
      } else {
        hasSyncedRef.current = true;
      }
    } catch {
      if (!hasSyncedRef.current) {
        // Never successfully loaded anything yet AND the lightweight
        // check itself failed — fall back to a full fetch so the page
        // doesn't get stuck empty.
        await refresh();
      }
      // Otherwise: we already have good data on screen. A single failed
      // background check isn't worth surfacing — just retry next tick.
    }
  }, [refresh]);

  // Check once on mount (cheap either way — instant if cached, a real
  // fetch if this is a first visit), then keep checking on a timer while
  // the tab is visible, and immediately again whenever it regains focus.
  useEffect(() => {
    syncIfChanged();
  }, [syncIfChanged]);

  useVisibleInterval(syncIfChanged, SYNC_INTERVAL_MS);

  const addProduct = useCallback(async (product) => {
    const created = await api.createProduct(product, getAdminKey());
    setProducts((prev) => {
      const next = [created, ...prev];
      writeCache(next); // cache reflects the new product immediately
      return next;
    });
    return created;
  }, []);

  const updateProduct = useCallback(async (id, updates) => {
    const updated = await api.updateProduct(id, updates, getAdminKey());
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? updated : p));
      writeCache(next);
      return next;
    });
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id) => {
    await api.deleteProduct(id, getAdminKey());
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writeCache(next);
      return next;
    });
  }, []);

  const clearAllProducts = useCallback(async () => {
    const data = await api.clearAllProducts(getAdminKey());
    setProducts(data);
    writeCache(data);
  }, []);

  const importProducts = useCallback(
    async (items) => {
      await api.importProducts(items, getAdminKey());
      await refresh(); // refresh() already writes the cache + version on success
    },
    [refresh]
  );

  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category).filter(Boolean));
    const ordered = CANONICAL_CATEGORY_ORDER.filter((c) => present.has(c));
    const extra = Array.from(present)
      .filter((c) => !CANONICAL_CATEGORY_ORDER.includes(c))
      .sort();
    return [...ordered, ...extra];
  }, [products]);

  const value = useMemo(
    () => ({
      products,
      categories,
      loading,
      error,
      addProduct,
      updateProduct,
      deleteProduct,
      clearAllProducts,
      importProducts,
      refresh,
    }),
    [products, categories, loading, error, addProduct, updateProduct, deleteProduct, clearAllProducts, importProducts, refresh]
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used inside <ProductsProvider>');
  return ctx;
}
