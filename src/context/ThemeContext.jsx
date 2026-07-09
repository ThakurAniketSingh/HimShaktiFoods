// ThemeContext — site-wide light/dark theme switch.
//
// DEFAULT IS ALWAYS LIGHT. This deliberately does NOT read the OS/browser
// "prefers-color-scheme" setting — the site should look exactly like it
// always has for a first-time visitor, and only switch to dark mode if
// someone explicitly taps the toggle. Once they do, that choice is
// remembered (localStorage) for their next visit.
//
// How it applies: a "dark" class is added to <html> when dark mode is on.
// Every adaptive color token (mist, earth, surface, heading, edge, ink)
// is defined as a CSS variable in src/index.css that changes value the
// moment that class is present — see that file for the two palettes.

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'hs_theme';
const ThemeContext = createContext(null);

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light'; // anything else (including nothing) → light
  } catch {
    return 'light';
  }
}

function applyThemeClass(theme) {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function ThemeProvider({ children }) {
  // Read synchronously so the correct theme is already applied on the
  // very first render — no flash of the wrong mode.
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    applyThemeClass(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Theme still works for this page load even if it can't be remembered.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme, setTheme }),
    [theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
