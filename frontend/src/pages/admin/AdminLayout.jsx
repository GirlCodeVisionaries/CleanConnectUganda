import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Building2, FileCheck2, CalendarCheck, CreditCard,
  Banknote, Users, Tags, ScrollText, ShieldAlert,
} from 'lucide-react';

const NAV = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/partners', icon: Building2, label: 'Partners' },
  { to: '/admin/documents', icon: FileCheck2, label: 'Documents' },
  { to: '/admin/bookings', icon: CalendarCheck, label: 'Bookings' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { to: '/admin/payouts', icon: Banknote, label: 'Payouts' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/categories', icon: Tags, label: 'Categories' },
  { to: '/admin/activity', icon: ScrollText, label: 'Activity log' },
];

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  const isAdmin = user && (user.is_staff || user.is_superuser);
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!isAdmin) {
    return (
      <div className="empty-state">
        <ShieldAlert size={48} />
        <h2>Staff access only</h2>
        <p>Your account doesn't have permission to view the admin portal.</p>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">Platform Admin</div>
        <nav>
          {NAV.map(({ to, end, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
