// NotFound — shown for any URL that doesn't match a real page (a typo'd
// link, an old bookmark, etc). Without this, React Router would render
// nothing at all for an unknown path — a blank white screen.
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-mist px-4 py-20 text-center">
      <div>
        <p className="font-serif text-forest text-[5rem] sm:text-[6rem] leading-none mb-2">404</p>
        <h1 className="font-serif text-forest text-2xl sm:text-3xl mb-3">Page not found</h1>
        <p className="text-ink-3 text-sm max-w-sm mx-auto mb-8">
          The page you're looking for doesn't exist, or may have moved. Let's get you back on track.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            to="/"
            className="bg-forest hover:bg-grove text-white font-bold px-7 py-3.5 rounded-full
              transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-forest/20 text-sm"
          >
            ← Back to Home
          </Link>
          <Link
            to="/products"
            className="bg-amber hover:bg-amber-lt text-white font-bold px-7 py-3.5 rounded-full
              transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber/30 text-sm"
          >
            🛒 Browse Products
          </Link>
        </div>
      </div>
    </div>
  );
}
