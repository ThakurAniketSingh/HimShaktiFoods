// ThemeToggle — a single sun/moon button that flips the site between
// light and dark mode. Reused in both the public Navbar and the admin
// panel's header, so the icon/behavior stays consistent everywhere.
//
// Self-contained styling: the button always sits on the site's fixed
// dark-green chrome (Navbar bar, AdminLayout header) in every current
// usage, so its own resting/hover look (translucent white circle, white
// icon) is baked in here rather than repeated by every caller. Callers
// only need to pass layout-specific classes (e.g. extra margin) via
// `className` if ever needed.
import { useTheme } from '../context/ThemeContext';

function SunIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.55 1.55M18.25 18.25l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.55-1.55M18.25 5.75l1.55-1.55" />
      </g>
    </svg>
  );
}
function MoonIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z" fill="currentColor" />
    </svg>
  );
}
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`flex items-center justify-center shrink-0 aspect-square w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors ${className}`}
    >
      {isDark ? (
        <SunIcon className="w-5 h-5 md:w-[22px] md:h-[22px]" />
      ) : (
        <MoonIcon className="w-5 h-5 md:w-[22px] md:h-[22px]" />
      )}
    </button>
  );
}
