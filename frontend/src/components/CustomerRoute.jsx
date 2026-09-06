import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Guards customer-only pages (booking a service, viewing your bookings).
 * Logged-out visitors pass through (the pages prompt for login where needed);
 * partners and admins are redirected to their own home.
 */
export default function CustomerRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user && (user.is_staff || user.is_superuser)) return <Navigate to="/admin" replace />;
  if (user && user.role === 'partner') return <Navigate to="/dashboard" replace />;
  return children;
}
