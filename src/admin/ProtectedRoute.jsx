// ProtectedRoute — guards admin pages, bouncing signed-out visitors to login.
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from './adminAuth';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!isAuthenticated()) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return children;
}
