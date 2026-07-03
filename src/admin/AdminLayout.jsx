// AdminLayout — the shell every admin page sits inside: a forest-green
// header carrying the same logo mark as the public Navbar, quick links
// back to the live site and to log out, plus a tab bar for switching
// between the three things the admin panel manages: Products, Reviews
// and the Contact page.
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { logout } from './adminAuth';

const TABS = [
  { to: '/admin', label: '🛒 Products' },
  { to: '/admin/reviews', label: '⭐ Reviews' },
  { to: '/admin/contact', label: '📍 Contact Page' },
];

export default function AdminLayout({ children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-mist flex flex-col">
      <header className="bg-forest sticky top-0 z-40 shadow-[0_2px_24px_rgba(0,0,0,0.18)]">
        <div className="wrap flex items-center justify-between h-[64px]">
          <Link to="/admin" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-amber flex items-center justify-center shrink-0 group-hover:bg-amber-lt transition-colors duration-200">
              <svg viewBox="0 0 28 28" fill="none" className="w-5 h-5">
                <path d="M14 3L4 20h5v5h10v-5h5z" fill="white" fillOpacity=".95" />
                <path d="M18 11l-5 9h3v3h4v-3h3z" fill="white" fillOpacity=".35" />
              </svg>
            </div>
            <div className="leading-none">
              <p className="font-serif text-white text-[1.05rem] leading-none">HimShakti</p>
              <p className="text-gold/70 text-[9px] font-medium tracking-[0.2em] uppercase mt-[3px]">Admin Panel</p>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-white/70 hover:text-white text-[13px] font-medium px-3.5 py-2 rounded-lg hover:bg-white/8 transition-all duration-200"
            >
              🌐 View Site
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-[13px] font-medium px-3.5 py-2 rounded-lg hover:bg-white/8 transition-all duration-200"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      {/* Section tabs — switch between Products, Reviews and Contact Page */}
      <nav className="bg-white border-b border-forest/10 sticky top-[64px] z-30">
        <div className="wrap flex flex-wrap justify-center items-center gap-2 py-2.5">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 border
                ${isActive ? 'bg-forest text-white border-forest' : 'bg-white text-ink-2 border-forest/15 hover:border-forest/40 hover:text-forest'}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="flex-1">{children}</main>
    </div>
  );
}
