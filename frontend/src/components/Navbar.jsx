import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Menu, X, User, LogOut, LayoutDashboard, Wallet, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isStaff = !!user && (user.is_staff || user.is_superuser);
  const isPartner = user?.role === 'partner';
  const isCustomerView = !isStaff && !isPartner; // logged-out visitor or a customer

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <Sparkles size={24} className="brand-icon" />
          <span>CleanConnect</span>
        </Link>

        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {isCustomerView && (
            <Link to="/order" onClick={() => setMenuOpen(false)}>Book a Service</Link>
          )}
          <Link to="/ai-chat" onClick={() => setMenuOpen(false)}>AI Assistant</Link>
          {user ? (
            <>
              {isPartner && (
                <>
                  <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
                    <LayoutDashboard size={16} /> Dashboard
                  </Link>
                  <Link to="/partner/earnings" onClick={() => setMenuOpen(false)}>
                    <Wallet size={16} /> Earnings
                  </Link>
                </>
              )}
              {isStaff && (
                <Link to="/admin" onClick={() => setMenuOpen(false)}>
                  <ShieldCheck size={16} /> Admin
                </Link>
              )}
              {isCustomerView && (
                <Link to="/bookings" onClick={() => setMenuOpen(false)}>My Bookings</Link>
              )}
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
