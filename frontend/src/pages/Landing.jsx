import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Shield, Clock, CreditCard, Sparkles, Star, MapPin, ArrowRight, CheckCircle, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import heroImg from '../assets/towfiqu-barbhuiya-ho-p7qLBewk-unsplash.jpg';

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [location, setLocation] = useState('');
  const [serviceType, setServiceType] = useState('home_deep_clean');

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/order?location=${encodeURIComponent(location)}&service=${serviceType}`);
  };

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-content">
          <h1>Clean spaces, <span className="text-accent">zero stress.</span></h1>
          <p className="hero-sub">
            Instant quotes. Verified companies and cleaners. Secure mobile payment.
            Guaranteed quality — one tap away, anywhere in Uganda.
          </p>

          <form className="hero-search" onSubmit={handleSearch}>
            <div className="search-field">
              <MapPin size={18} />
              <input
                type="text"
                placeholder="Your location (e.g. Nakawa, Kampala)"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="search-field">
              <Sparkles size={18} />
              <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                <option value="home_deep_clean">Home Deep Clean</option>
                <option value="regular_clean">Regular Clean</option>
                <option value="office_cleaning">Office Cleaning</option>
                <option value="move_in_clean">Move-in Clean</option>
                <option value="move_out_clean">Move-out Clean</option>
                <option value="window_cleaning">Window Cleaning</option>
                <option value="fumigation">Fumigation</option>
                <option value="laundry">Laundry</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-lg">
              <Search size={18} /> Get Instant Quotes
            </button>
          </form>

          <div className="hero-trust">
            <span><CheckCircle size={16} /> Verified partners</span>
            <span><Shield size={16} /> Service guarantee</span>
            <span><CreditCard size={16} /> Secure MoMo payment</span>
          </div>
          </div>

          <div className="hero-media">
            <img
              src={heroImg}
              alt="Professional cleaning with CleanConnect"
              className="hero-image"
            />
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How it works</h2>
        <p className="section-sub">From search to a spotless space, in five steps</p>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <Search size={28} />
            <h3>Search</h3>
            <p>Enter your location and the type of cleaning service you need</p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <Zap size={28} />
            <h3>Compare</h3>
            <p>See instant quotes from nearby verified partners with real prices</p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <Clock size={28} />
            <h3>Book</h3>
            <p>Pick a partner and choose an available time slot that works for you</p>
          </div>
          <div className="step-card">
            <div className="step-num">4</div>
            <CreditCard size={28} />
            <h3>Pay</h3>
            <p>Secure in-app payment via MTN MoMo, Airtel Money, or card</p>
          </div>
          <div className="step-card">
            <div className="step-num">5</div>
            <Star size={28} />
            <h3>Rate & Relax</h3>
            <p>Job done right, backed by the CleanConnect Assurance Guarantee</p>
          </div>
        </div>
      </section>

      <section className="ai-section">
        <div className="ai-content">
          <h2>Powered by AI</h2>
          <p>
            Our AI engine predicts fair pricing from property size, service type, location, and urgency.
            Smart matching ranks partners by proximity, availability, rating, and price to find you the best fit.
          </p>
          <ul className="ai-features">
            <li><Zap size={18} /> Instant Quote Engine — real-time pricing from every eligible partner</li>
            <li><MapPin size={18} /> Smart Matching — auto-suggests the best partner for each job</li>
            <li><Clock size={18} /> Demand Forecasting — anticipates busy periods for dynamic pricing</li>
            <li><Sparkles size={18} /> AI Booking Assistant — conversational booking in English & local languages</li>
            <li><Shield size={18} /> Trust & Fraud Scoring — flags suspicious behavior before it affects you</li>
          </ul>
          <Link to="/ai-chat" className="btn btn-primary">
            Try AI Assistant <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="guarantee-section">
        <h2>CleanConnect Assurance Guarantee</h2>
        <p>Every booking is covered. If the job falls short:</p>
        <div className="guarantee-grid">
          <div className="guarantee-card">
            <CheckCircle size={32} className="text-accent" />
            <h3>Re-clean</h3>
            <p>Free re-clean if you're not satisfied with the quality</p>
          </div>
          <div className="guarantee-card">
            <CreditCard size={32} className="text-accent" />
            <h3>Refund</h3>
            <p>Full refund if the issue can't be resolved within 24 hours</p>
          </div>
          <div className="guarantee-card">
            <Sparkles size={32} className="text-accent" />
            <h3>Replacement</h3>
            <p>Free replacement partner sent at no extra cost</p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready for a spotless space?</h2>
        <p>Join thousands of happy customers across Kampala</p>
        <div className="cta-buttons">
          <Link to="/order" className="btn btn-primary btn-lg">
            <Search size={18} /> Find a Cleaner
          </Link>
          {!user && (
            <Link to="/register" className="btn btn-outline btn-lg">
              Become a Partner
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
