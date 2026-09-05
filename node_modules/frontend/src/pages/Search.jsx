import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { aiAPI } from '../services/api';
import StarRating from '../components/StarRating';
import { Search, MapPin, Clock, Shield, Zap, ChevronDown, Loader2, CheckCircle, Star } from 'lucide-react';

const SERVICE_OPTIONS = [
  { value: 'home_deep_clean', label: 'Home Deep Clean' },
  { value: 'regular_clean', label: 'Regular Clean' },
  { value: 'office_cleaning', label: 'Office Cleaning' },
  { value: 'move_in_clean', label: 'Move-in Clean' },
  { value: 'move_out_clean', label: 'Move-out Clean' },
  { value: 'window_cleaning', label: 'Window Cleaning' },
  { value: 'fumigation', label: 'Fumigation' },
  { value: 'laundry', label: 'Laundry' },
];

const LOCATIONS = [
  'Nakawa, Kampala', 'Kololo, Kampala', 'Bugolobi, Kampala', 'Ntinda, Kampala',
  'Kisementi, Kampala', 'Kabalagala, Kampala', 'Bukoto, Kampala', 'Kisaasi, Kampala',
  'Mulago, Kampala', 'Wandegeya, Kampala', 'Kyanja, Kampala', 'Entebbe',
  'Mukono', 'Wakiso', 'Jinja',
];

export default function SearchPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [serviceType, setServiceType] = useState(searchParams.get('service') || 'home_deep_clean');
  const [numRooms, setNumRooms] = useState(2);
  const [numBathrooms, setNumBathrooms] = useState(1);
  const [urgency, setUrgency] = useState('standard');
  const [quotes, setQuotes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loc = searchParams.get('location');
    const svc = searchParams.get('service');
    if (loc) {
      setLocation(loc);
      setServiceType(svc || 'home_deep_clean');
      handleSearch(loc, svc || 'home_deep_clean');
    }
  }, [searchParams]);

  const handleSearch = async (loc, svc) => {
    const searchLoc = loc || location;
    const searchSvc = svc || serviceType;
    if (!searchLoc) {
      setError('Please enter your location');
      return;
    }
    if (!user) {
      navigate('/login?redirect=/search');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await aiAPI.quote({
        location: searchLoc,
        service_type: searchSvc,
        num_rooms: numRooms,
        num_bathrooms: numBathrooms,
        urgency,
      });
      setQuotes(res.data);
    } catch (err) {
      setError('Failed to get quotes. Please try again.');
    }
    setLoading(false);
  };

  const handleBook = (quote) => {
    navigate('/booking', {
      state: {
        quote,
        location,
        serviceType,
        numRooms,
        numBathrooms,
        urgency,
      }
    });
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h1>Find Your Perfect Cleaner</h1>
        <p>Get instant quotes from verified partners near you</p>
      </div>

      <div className="search-form-card">
        <div className="search-grid">
          <div className="form-group">
            <label><MapPin size={14} /> Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}>
              <option value="">Select your area</option>
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label><Zap size={14} /> Service Type</label>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
              {SERVICE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Rooms</label>
            <select value={numRooms} onChange={(e) => setNumRooms(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'room' : 'rooms'}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Bathrooms</label>
            <select value={numBathrooms} onChange={(e) => setNumBathrooms(Number(e.target.value))}>
              {[0, 1, 2, 3, 4].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'bathroom' : 'bathrooms'}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label><Clock size={14} /> Urgency</label>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              <option value="standard">Standard</option>
              <option value="scheduled">Scheduled (save 10%)</option>
              <option value="urgent">Urgent (+35%)</option>
            </select>
          </div>
          <div className="form-group form-group-btn">
            <button className="btn btn-primary btn-full" onClick={() => handleSearch()} disabled={loading}>
              {loading ? <><Loader2 size={18} className="spin" /> Getting quotes...</> : <><Search size={18} /> Get Quotes</>}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {quotes && (
        <div className="quotes-section">
          <div className="quotes-header">
            <h2>
              {quotes.quote_count} Verified Partner{quotes.quote_count !== 1 ? 's' : ''} Available
            </h2>
            <div className="quotes-predicted">
              AI Predicted Price: <strong>{quotes.predicted_price_display}</strong>
              {quotes.demand_level > 1 && (
                <span className="demand-badge">High demand area</span>
              )}
            </div>
          </div>

          <div className="quotes-list">
            {quotes.quotes.map((q, idx) => (
              <div key={q.partner_id} className={`quote-card ${q.is_featured ? 'featured' : ''} ${idx === 0 ? 'best-match' : ''}`}>
                {idx === 0 && <div className="best-match-badge"><Star size={14} /> Best Match</div>}
                {q.is_featured && <div className="featured-badge">Featured</div>}

                <div className="quote-info">
                  <h3>{q.partner_name}</h3>
                  <StarRating rating={q.rating} />
                  <span className="quote-bookings">{q.total_bookings} jobs completed</span>
                </div>

                <div className="quote-details">
                  <div className="quote-price">{q.price_display}</div>
                  <div className="quote-meta">
                    <span><Clock size={14} /> {q.estimated_duration} min</span>
                    {q.distance_km !== null && (
                      <span><MapPin size={14} /> {q.distance_km} km away</span>
                    )}
                    <span><CheckCircle size={14} /> {q.next_available.display}</span>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={() => handleBook(q)}>
                  Book Now
                </button>
              </div>
            ))}
          </div>

          <div className="assurance-bar">
            <Shield size={20} />
            <div>
              <strong>CleanConnect Assurance Guarantee</strong>
              <p>Re-clean, refund, or replacement partner if the job falls short</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
