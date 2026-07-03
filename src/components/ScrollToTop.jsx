// ScrollToTop.js
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Agar Products page hai aur category filter laga hai → skip top scroll
    if (pathname === '/products' && new URLSearchParams(search).has('category')) {
      return;
    }
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}