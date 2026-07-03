// useMediaQuery — tells you if a CSS media query matches right now.
// Pass a query string like "(max-width: 767px)".
// Returns true/false and updates automatically when the window is resized.
import { useState, useEffect } from 'react';

export function useMediaQuery(query) {
  // Start with the current match state so first render is already correct
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);

    // 'change' event fires whenever the query result flips
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
