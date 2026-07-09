// ProtectedRoute — guards admin pages, bouncing signed-out visitors to login.
//
// NOTE: this is a UI convenience only — it just checks a local "was I
// logged in?" flag so we don't flash the dashboard before redirecting.
// It is NOT what actually protects any data: every write request is
// independently re-checked server-side against the real httpOnly session
// cookie (see lib/auth.js). Someone could flip this flag in devtools and
// still wouldn't be able to add, edit, or delete anything.
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from './adminAuth';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return children;
}
