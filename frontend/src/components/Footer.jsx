import { Link } from 'react-router-dom';
import { Sparkles, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Sparkles size={20} className="brand-icon" />
          <span>CleanConnect Uganda</span>
          <p>The on-demand marketplace for trusted cleaning services</p>
        </div>
        <div className="footer-links">
          <div>
            <h4>Platform</h4>
            <Link to="/order">Order a Service</Link>
            <Link to="/ai-chat">AI Assistant</Link>
            <Link to="/register">Become a Partner</Link>
          </div>
          <div>
            <h4>Support</h4>
            <Link to="/ai-chat">Help Center</Link>
            <a href="#">Service Guarantee</a>
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
          </div>
          <div>
            <h4>Contact</h4>
            <p><Mail size={14} /> hello@cleanconnect.ug</p>
            <p><Phone size={14} /> +256 7XX XXX XXX</p>
            <p><MapPin size={14} /> Kampala, Uganda</p>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 CleanConnect Uganda. All rights reserved.</p>
      </div>
    </footer>
  );
}
