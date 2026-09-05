import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps a page and redirects to /login if not authenticated.
 * Optionally restrict to a list of allowed roles - if the user's role
 * isn't in the list, they're redirected to /unauthorized.
 *
 * Note: this is a UX convenience only. The backend's requireRole()
 * middleware is the real enforcement layer - never trust this alone.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
