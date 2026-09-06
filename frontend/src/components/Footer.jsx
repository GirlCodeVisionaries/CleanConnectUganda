import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo size={22} text="CleanConnect Uganda" />
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
            <p><Mail size={14} /> <a href="mailto:hello@cleanconnect.ug">hello@cleanconnect.ug</a></p>
            <p><Phone size={14} /> <a href="tel:+256752640121">+256 752 640 121</a></p>
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
