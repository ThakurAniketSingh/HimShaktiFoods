// useVisibleInterval — runs `callback` on a fixed interval, but ONLY while
// (and immediately when) this browser tab is visible. A backgrounded tab
// does nothing — zero timers firing, zero network requests — until the
// user switches back to it, at which point `callback` runs right away
// (so the check feels instant) and then resumes its normal interval.
//
// Used across the app's Contexts for lightweight "did anything change on
// the server?" background checks — see SYNC_INTERVAL_MS and the
// version-comparison logic in each Context file. This is what keeps the
// site feeling real-time without hammering the server: an idle/backgrounded
// tab costs nothing, and even an active tab only ever sends a tiny request
// every interval — the expensive full data fetch only happens when that
// tiny check actually finds something new.

import { useEffect, useRef } from 'react';

// Shared across every Context that uses this hook, so there's one place
// to tune "how real-time does the site feel vs. how much background
// traffic does it generate" — a lower number feels more live but sends
// more requests; a higher number is gentler on the server.
export const SYNC_INTERVAL_MS = 30_000;

export function useVisibleInterval(callback, intervalMs) {
  // Stashing the latest callback in a ref (rather than putting it in the
  // effect's dependency array) means the interval/listeners are set up
  // once and never torn down/rebuilt just because the calling Context
  // re-rendered — only `intervalMs` changing would do that, and that
  // never happens in practice here.
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const tick = () => {
      if (document.visibilityState === 'visible') callbackRef.current();
    };

    const id = setInterval(tick, intervalMs);

    // Also check immediately when the tab regains focus/visibility after
    // being backgrounded — so coming back to an already-open tab feels
    // current right away instead of waiting for the next scheduled tick.
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);
}
