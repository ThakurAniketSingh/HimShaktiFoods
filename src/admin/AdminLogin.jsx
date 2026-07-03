// AdminLogin — a simple password gate, styled like the site's hero banners
// (forest backdrop, mountain watermark, the same logo mark from the Navbar).
import { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { setAdminKey, isAuthenticated } from './adminAuth';
import { api } from './apiClient';

function MtnWatermark() {
  return (
    <svg
      viewBox="0 0 900 220"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
      aria-hidden="true"
    >
      <path d="M0,220 L0,140 L100,60 L200,110 L330,20 L460,90 L590,10 L720,75 L850,35 L900,60 L900,220Z" fill="white" />
      <path d="M0,220 L0,175 L150,125 L300,160 L480,100 L660,148 L840,110 L900,130 L900,220Z" fill="white" />
    </svg>
  );
}

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (isAuthenticated()) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.login(password);
      setAdminKey(password);
      const dest = location.state?.from?.pathname ?? '/admin';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Incorrect password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-forest flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <MtnWatermark />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div
          className="w-[420px] h-[420px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #f5c842 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 w-fit mx-auto group">
          <div className="w-10 h-10 rounded-xl bg-amber flex items-center justify-center shrink-0 group-hover:bg-amber-lt transition-colors duration-200">
            <svg viewBox="0 0 28 28" fill="none" className="w-5 h-5">
              <path d="M14 3L4 20h5v5h10v-5h5z" fill="white" fillOpacity=".95" />
              <path d="M18 11l-5 9h3v3h4v-3h3z" fill="white" fillOpacity=".35" />
            </svg>
          </div>
          <div className="leading-none text-left">
            <p className="font-serif text-white text-[1.2rem] leading-none">HimShakti</p>
            <p className="text-gold/70 text-[9.5px] font-medium tracking-[0.2em] uppercase mt-[3px]">Foods</p>
          </div>
        </Link>

        <div className="bg-white rounded-xl2 p-8 shadow-2xl">
          <div className="eyebrow justify-center mb-3">Admin Panel</div>
          <h1 className="font-serif text-forest text-2xl text-center mb-2">Welcome back</h1>
          <p className="text-ink-3 text-sm text-center mb-7">Sign in to manage your product catalog.</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="password" className="block text-[11px] font-bold text-ink-2 uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Enter admin password"
                className={`w-full px-4 py-3 rounded-xl border text-sm text-ink bg-mist
                  focus:outline-none focus:ring-2 focus:ring-amber/30 transition-shadow
                  ${error ? 'border-red-400' : 'border-forest/15 focus:border-amber'}`}
              />
              {error && <p className="text-red-600 text-xs mt-2 font-medium">⚠️ {error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="bg-amber hover:bg-amber-lt text-white font-bold py-3.5 rounded-full
                transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber/30
                disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 text-sm mt-1"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <Link to="/" className="block text-center text-white/50 hover:text-white/80 text-xs mt-6 transition-colors">
          ← Back to website
        </Link>
      </div>
    </div>
  );
}
