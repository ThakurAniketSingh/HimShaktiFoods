// Navbar — fixed top header shown on every page.
// Includes an announcement bar, the logo, desktop nav links, and a
// collapsible mobile hamburger menu.  All open/close state is handled
// with React hooks — no document.getElementById anywhere.

import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import WhatsAppIcon from './WhatsAppIcon';
import ThemeToggle from './ThemeToggle';
import { useContactInfo } from '../context/ContactContext';

// All nav links in one place — easy to update
const LINKS = [
  { to: '/',             label: 'Home',         end: true  },
  { to: '/products',     label: 'Products',     end: false },
  { to: '/about',        label: 'About',        end: false },
  { to: '/how-to-order', label: 'How to Order', end: false },
  { to: '/contact',      label: 'Contact',      end: false },
];

export default function Navbar() {
  const { contact, loading } = useContactInfo();
  const WA_HREF = `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent('Namaste HimShakti!')}`;
  const [open,     setOpen]     = useState(false); // mobile menu open?
  const [scrolled, setScrolled] = useState(false); // page scrolled down?
  const location = useLocation();

  // Close mobile menu whenever the user navigates to a new page
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Add a shadow to the navbar once the user scrolls past 10px
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock the page scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* Announcement bar — thin strip at the very top */}
      <div className="bg-forest text-gold text-[11px] sm:text-xs font-semibold tracking-wide text-center py-2 px-4">
        🚚&nbsp; Free shipping on orders above ₹499 &nbsp;·&nbsp; Pan India delivery &nbsp;
        
      </div>

      {/* Main navbar — sticky so it stays at top while scrolling */}
      <header className={`sticky top-0 z-40 bg-forest transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_2px_24px_rgba(0,0,0,0.35)]' : ''
      }`}>
        <div className="wrap flex items-center justify-between h-[64px]">

          {/* Logo — clicking goes home */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-amber flex items-center justify-center shrink-0
              group-hover:bg-amber-lt transition-colors duration-200">
              <svg viewBox="0 0 28 28" fill="none" className="w-5 h-5">
                <path d="M14 3L4 20h5v5h10v-5h5z" fill="white" fillOpacity=".95"/>
                <path d="M18 11l-5 9h3v3h4v-3h3z" fill="white" fillOpacity=".35"/>
              </svg>
            </div>
            <div className="leading-none">
              <p className="font-serif text-white text-[1.15rem] leading-none">HimShakti</p>
              <p className="text-gold/70 text-[9.5px] font-medium tracking-[0.2em] uppercase mt-[3px]">Foods</p>
            </div>
          </Link>

          {/* Desktop navigation — hidden below lg breakpoint */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary navigation">
            {LINKS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `px-3.5 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-white/14 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/8'
                  }`
                }>
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop WhatsApp CTA — skeleton on first load, real button once data is ready */}
          <div className="hidden lg:flex items-center gap-2.5">
            <ThemeToggle />
            {loading ? (
              <div className="animate-pulse bg-white/20 rounded-full h-9 w-28" />
            ) : (
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-2 bg-wa hover:bg-wa-dk text-white text-[13px] font-bold
                 px-4 py-2.5 rounded-full transition-all duration-200
                 hover:shadow-lg hover:shadow-green-400/30 hover:-translate-y-0.5 active:translate-y-0">
                <WhatsAppIcon size={15} />
                Order Now
              </a>
            )}
          </div>

          {/* Mobile: theme toggle + hamburger, both reachable without opening the menu */}
          <div className="lg:hidden flex items-center gap-1">
            <ThemeToggle />
            <button onClick={() => setOpen(!open)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="w-10 h-10 flex flex-col items-center justify-center gap-[5px]
              rounded-xl hover:bg-white/10 transition-colors">
              {/* Three lines animate into an X when menu is open. Always
                  white — this sits on the navbar's permanently dark-green
                  background in both themes, never on an adaptive surface. */}
              <span className={`block w-[22px] h-[2px] bg-white rounded-full origin-center
                transition-all duration-300 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block w-[22px] h-[2px] bg-white rounded-full
                transition-all duration-300 ${open ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`block w-[22px] h-[2px] bg-white rounded-full origin-center
                transition-all duration-300 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu — max-h trick gives smooth open/close animation */}
        <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out
          ${open ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="border-t border-white/10 px-4 py-3 flex flex-col gap-1">
            {LINKS.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end}
                className={({ isActive }) =>
                  `px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/16 text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/8'
                  }`
                }>
                {label}
              </NavLink>
            ))}
            {/* Mobile WA button — skeleton on first load */}
            {loading ? (
              <div className="animate-pulse bg-white/20 rounded-xl h-11 w-full mt-2" />
            ) : (
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
                 className="mt-2 flex items-center justify-center gap-2 bg-wa text-white
                 text-sm font-bold py-3 rounded-xl">
                <WhatsAppIcon size={16} /> Order on WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
