import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, User, LogOut, LayoutDashboard, Wallet, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import Logo from './Logo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <Logo size={24} />
        </Link>

        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/order" onClick={() => setMenuOpen(false)}>Order a Service</Link>
          <Link to="/ai-chat" onClick={() => setMenuOpen(false)}>AI Assistant</Link>
          {user ? (
            <>
              {user.role === 'partner' && (
                <>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  <Link to="/partner/earnings" onClick={() => setMenuOpen(false)}>
                    <Wallet size={16} /> Earnings
                  </Link>
                </>
              )}
              {(user.is_staff || user.is_superuser) && (
                <Link to="/admin" onClick={() => setMenuOpen(false)}>
                  <ShieldCheck size={16} /> Admin
                </Link>
              )}
              <Link to="/bookings" onClick={() => setMenuOpen(false)}>My Bookings</Link>
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={() => setMenuOpen(false)}>
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
