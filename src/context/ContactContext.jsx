// ContactContext — single source of truth for the Contact page's content
// (address, phone, email, delivery note, WhatsApp details, map embed).
// Talks to the /api/contact serverless function (backed by MongoDB Atlas).
// The public Contact page reads from this; the admin panel's Contact Page
// tab reads AND writes through `updateContact`. Every WhatsApp button
// across the whole site (Navbar, Footer, product cards, Home, Contact)
// also reads the number from here.
//
// HOW THE CACHING + REAL-TIME SYNC WORKS
// ───────────────────────────────────────
// DEFAULT_CONTACT is the hardcoded fallback used ONLY on a user's very
// first-ever visit before any real data has been fetched.
//
// After the first successful fetch, the real data is cached in
// localStorage (hs_contact_v1) alongside a short "version" string
// (hs_contact_version_v1) from the tiny /api/contact?meta=1 endpoint. Every
// later page load reads that cache synchronously on the initial render,
// so the correct WhatsApp number (and every other field) is present from
// the very first paint — no flash of the hardcoded default.
//
// In the background, a tiny /meta check (just a timestamp, not the whole
// document) runs once on mount and again every 30 seconds while the tab
// is visible (see useVisibleInterval) — the full contact document is
// only re-fetched if that check finds something actually changed. This
// means an admin updating the WhatsApp number is picked up by every open
// visitor tab within moments, without those tabs re-fetching the document
// on every check — only when it's genuinely different.
//
// `updateContact` (called by the admin panel) writes straight through to
// both the cache and the version, so even the admin sees their own
// change reflected instantly, with nothing to wait for.

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../admin/apiClient';

import { useVisibleInterval, SYNC_INTERVAL_MS } from '../hooks/useVisibleInterval';

// ── localStorage helpers ──────────────────────────────────────────
const CACHE_KEY = 'hs_contact_v1';
const VERSION_KEY = 'hs_contact_version_v1';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
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

// ── Hardcoded fallback ─────────────────────────────────────────────
const DEFAULT_CONTACT = {
  address: 'Rural Industrial Cluster, Near Haldwani,\nNainital District, Uttarakhand — 263139',
  phone: '+91 89234 29380',
  hours: 'Mon–Sat · 9 AM – 7 PM',
  email: 'orders@himshakti.in',
  delivery: 'Pan India · 3–6 working days\nFree shipping above ₹499',
  whatsappNumber: '918923429380',
  whatsappMessage: 'Namaste! I would like to visit or pickup an order.',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d27860.52405115781!2d79.47060204430429!3d29.206916343992823!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39a09addbd0c86d1%3A0x6793e360cb3d930f!2sHaldwani%2C%20Uttarakhand%20263139!5e0!3m2!1sen!2sin!4v1781445052713!5m2!1sen!2sin',
};

const ContactContext = createContext(null);

export function ContactProvider({ children }) {
  // Read the cache synchronously so the very first render already has
  // the correct data — no waiting for the API, no flash of the default.
  const cached = useMemo(() => readCache(), []);
  const cachedVersion = useMemo(() => readVersionCache(), []);

  const [contact, setContact] = useState(cached ?? DEFAULT_CONTACT);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  const versionRef = useRef(cachedVersion);
  const hasSyncedRef = useRef(cached !== null);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const data = await api.getContactInfo();
      // Guard: if the API returned null/undefined (e.g. wrong server, HTML
      // fallback instead of JSON) keep the safe DEFAULT_CONTACT in place
      // rather than overwriting state with null and crashing every component
      // that reads contact.whatsappNumber / contact.phone etc.
      const resolved = data ?? DEFAULT_CONTACT;
      setContact(resolved);
      writeCache(resolved);
      hasSyncedRef.current = true;
    } catch (err) {
      setError(err.message || 'Could not load contact info from the server.');
      setLoading(false);
      return;
    }
    setLoading(false);

    // Best-effort version bookkeeping — see ProductsContext for why this
    // is wrapped separately from the main fetch above.
    try {
      const meta = await api.getContactMeta();
      versionRef.current = meta?.version ?? null;
      writeVersionCache(versionRef.current);
    } catch {
      versionRef.current = null;
    }
  }, []);

  const syncIfChanged = useCallback(async () => {
    try {
      const meta = await api.getContactMeta();
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

  const updateContact = useCallback(async (updates) => {
    const updated = await api.updateContactInfo(updates);
    setContact(updated);
    writeCache(updated);
    // Contact changes (especially the WhatsApp number) are rare but
    // important, so it's worth one extra cheap call to resync the
    // version baseline immediately, rather than waiting for the next
    // 30-second tick to notice the admin's own save.
    try {
      const meta = await api.getContactMeta();
      versionRef.current = meta?.version ?? null;
      writeVersionCache(versionRef.current);
    } catch {
      versionRef.current = null;
    }
    return updated;
  }, []);

  const value = useMemo(
    () => ({ contact, loading, error, updateContact, refresh }),
    [contact, loading, error, updateContact, refresh]
  );

  return <ContactContext.Provider value={value}>{children}</ContactContext.Provider>;
}

export function useContactInfo() {
  const ctx = useContext(ContactContext);
  if (!ctx) throw new Error('useContactInfo must be used inside <ContactProvider>');
  return ctx;
}
