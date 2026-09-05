import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { aiAPI, bookingsAPI, paymentsAPI } from '../services/api';
import StarRating from '../components/StarRating';
import {
  Search, MapPin, Clock, Shield, Zap, Loader2, CheckCircle, Star,
  ArrowRight, ArrowLeft, Calendar, CreditCard, Sparkles, Home, Briefcase,
  Truck, Package, Maximize, Droplet, ChevronRight, Home as HomeIcon
} from 'lucide-react';

const SERVICE_OPTIONS = [
  { value: 'home_deep_clean', label: 'Home Deep Clean', icon: Home, desc: 'Thorough cleaning of your entire home', price: 'From UGX 50,000' },
  { value: 'regular_clean', label: 'Regular Clean', icon: Sparkles, desc: 'Standard cleaning for maintained spaces', price: 'From UGX 35,000' },
  { value: 'office_cleaning', label: 'Office Cleaning', icon: Briefcase, desc: 'Professional office & commercial cleaning', price: 'From UGX 70,000' },
  { value: 'move_in_clean', label: 'Move-in Clean', icon: Truck, desc: 'Deep clean before moving into a new place', price: 'From UGX 80,000' },
  { value: 'move_out_clean', label: 'Move-out Clean', icon: Package, desc: 'Thorough clean when vacating a property', price: 'From UGX 75,000' },
  { value: 'window_cleaning', label: 'Window Cleaning', icon: Maximize, desc: 'Interior and exterior window cleaning', price: 'From UGX 30,000' },
  { value: 'fumigation', label: 'Fumigation', icon: Shield, desc: 'Pest control and fumigation services', price: 'From UGX 100,000' },
  { value: 'laundry', label: 'Laundry', icon: Droplet, desc: 'Professional laundry and dry cleaning', price: 'From UGX 25,000' },
];

const LOCATIONS = [
  'Nakawa, Kampala', 'Kololo, Kampala', 'Bugolobi, Kampala', 'Ntinda, Kampala',
  'Kisementi, Kampala', 'Kabalagala, Kampala', 'Bukoto, Kampala', 'Kisaasi, Kampala',
  'Mulago, Kampala', 'Wandegeya, Kampala', 'Kyanja, Kampala', 'Mbuya, Kampala',
  'Luzira, Kampala', 'Naguru, Kampala', 'Bunga, Kampala', 'Entebbe',
  'Mukono', 'Wakiso', 'Kira', 'Jinja',
];

export default function Order() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [serviceType, setServiceType] = useState('');
  const [location, setLocation] = useState('');
  const [numRooms, setNumRooms] = useState(2);
  const [numBathrooms, setNumBathrooms] = useState(1);
  const [urgency, setUrgency] = useState('standard');

  const [quotes, setQuotes] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [orderForm, setOrderForm] = useState({
    address: user?.location || '',
    scheduled_date: '',
    scheduled_time: '09:00',
    special_requests: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('mtn_momo');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [orderLoading, setOrderLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const handleGetQuotes = async () => {
    if (!serviceType) { setError('Please select a service'); return; }
    if (!location) { setError('Please select your location'); return; }
    if (!user) { navigate('/login?redirect=/order'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await aiAPI.quote({
        location,
        service_type: serviceType,
        num_rooms: numRooms,
        num_bathrooms: numBathrooms,
        urgency,
      });
      setQuotes(res.data);
      setStep(2);
    } catch (err) {
      setError('Failed to get quotes. Please try again.');
    }
    setLoading(false);
  };

  const handleSelectPartner = (quote) => {
    setSelectedQuote(quote);
    setStep(3);
  };

  const handlePlaceOrder = async () => {
    if (!orderForm.address || !orderForm.scheduled_date) {
      setError('Please fill in your address and preferred date');
      return;
    }
    setOrderLoading(true);
    setError('');

    try {
      const bookingRes = await bookingsAPI.create({
        partner: selectedQuote.partner_id,
        service: null,
        service_category: null,
        address: orderForm.address,
        num_rooms: numRooms,
        num_bathrooms: numBathrooms,
        special_requests: orderForm.special_requests,
        scheduled_date: orderForm.scheduled_date,
        scheduled_time: orderForm.scheduled_time,
        duration_minutes: selectedQuote.estimated_duration || 120,
        total_price: selectedQuote.price,
        ai_quote_data: { serviceType, location, numRooms, numBathrooms, urgency, quote: selectedQuote },
      });

      await paymentsAPI.create({
        booking: bookingRes.data.id,
        method: paymentMethod,
        phone_number: phoneNumber,
      });

      setBookingRef(bookingRes.data.booking_ref);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Order failed. Please try again.');
    }
    setOrderLoading(false);
  };

  const serviceLabel = SERVICE_OPTIONS.find(s => s.value === serviceType)?.label || '';

  if (success) {
    return (
      <div className="booking-success">
        <div className="success-card">
          <CheckCircle size={64} className="text-accent" />
          <h1>Order Confirmed!</h1>
          <p className="booking-ref">Reference: <strong>{bookingRef}</strong></p>
          <div className="success-details">
            <p><strong>{selectedQuote.partner_name}</strong></p>
            <p><Calendar size={14} /> {orderForm.scheduled_date} at {orderForm.scheduled_time}</p>
            <p><MapPin size={14} /> {orderForm.address}</p>
            <p><CreditCard size={14} /> {selectedQuote.price_display} paid via {paymentMethod === 'mtn_momo' ? 'MTN MoMo' : paymentMethod === 'airtel_money' ? 'Airtel Money' : 'Card'}</p>
          </div>
          <div className="success-guarantee">
            <Shield size={20} />
            <span>Protected by CleanConnect Assurance Guarantee</span>
          </div>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => navigate('/bookings')}>View My Orders</button>
            <button className="btn btn-outline" onClick={() => navigate('/')}>Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-page">
      <div className="order-steps">
        <div className={`order-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
          <div className="step-circle">{step > 1 ? <CheckCircle size={18} /> : '1'}</div>
          <span>Select Service</span>
        </div>
        <div className="step-line" />
        <div className={`order-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
          <div className="step-circle">{step > 2 ? <CheckCircle size={18} /> : '2'}</div>
          <span>Compare & Choose</span>
        </div>
        <div className="step-line" />
        <div className={`order-step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-circle">3</div>
          <span>Confirm Order</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 1 && (
        <div className="order-step-content">
          <div className="order-step-header">
            <h1>What do you need cleaned?</h1>
            <p>Choose a service and we'll find the best verified partners near you</p>
          </div>

          <div className="service-grid">
            {SERVICE_OPTIONS.map(svc => {
              const Icon = svc.icon;
              return (
                <button
                  key={svc.value}
                  className={`service-card ${serviceType === svc.value ? 'selected' : ''}`}
                  onClick={() => { setServiceType(svc.value); setError(''); }}
                >
                  <Icon size={28} />
                  <div className="service-card-info">
                    <strong>{svc.label}</strong>
                    <span>{svc.desc}</span>
                    <span className="service-card-price">{svc.price}</span>
                  </div>
                  {serviceType === svc.value && <CheckCircle size={20} className="service-check" />}
                </button>
              );
            })}
          </div>

          <div className="order-details-card">
            <h2>Tell us about your space</h2>
            <div className="order-details-grid">
              <div className="form-group">
                <label><MapPin size={14} /> Your Location</label>
                <select value={location} onChange={(e) => { setLocation(e.target.value); setError(''); }}>
                  <option value="">Select your area</option>
                  {LOCATIONS.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Bedrooms</label>
                <div className="counter">
                  <button type="button" onClick={() => setNumRooms(Math.max(1, numRooms - 1))}>-</button>
                  <span>{numRooms}</span>
                  <button type="button" onClick={() => setNumRooms(Math.min(10, numRooms + 1))}>+</button>
                </div>
              </div>
              <div className="form-group">
                <label>Bathrooms</label>
                <div className="counter">
                  <button type="button" onClick={() => setNumBathrooms(Math.max(0, numBathrooms - 1))}>-</button>
                  <span>{numBathrooms}</span>
                  <button type="button" onClick={() => setNumBathrooms(Math.min(10, numBathrooms + 1))}>+</button>
                </div>
              </div>
              <div className="form-group">
                <label><Clock size={14} /> When do you need it?</label>
                <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="standard">Standard (today or tomorrow)</option>
                  <option value="scheduled">Schedule ahead (save 10%)</option>
                  <option value="urgent">Urgent (ASAP, +35%)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="order-step-actions">
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGetQuotes}
              disabled={loading || !serviceType || !location}
            >
              {loading
                ? <><Loader2 size={18} className="spin" /> AI is finding partners near you...</>
                : <><Zap size={18} /> Find Partners Near Me <ArrowRight size={18} /></>
              }
            </button>
          </div>
        </div>
      )}

      {step === 2 && quotes && (
        <div className="order-step-content">
          <div className="order-step-header">
            <h1>We found {quotes.quote_count} verified partner{quotes.quote_count !== 1 ? 's' : ''} near you</h1>
            <p>
              AI-matched for <strong>{serviceLabel}</strong> in <strong>{location}</strong>
              {' '}({numRooms} bed{numBathrooms > 0 ? `, ${numBathrooms} bath` : ''})
            </p>
          </div>

          <div className="quotes-ai-bar">
            <Sparkles size={18} />
            <div>
              <strong>AI Predicted Fair Price: {quotes.predicted_price_display}</strong>
              <span>Based on property size, location, and current demand</span>
            </div>
            {quotes.demand_level > 1 && <span className="demand-badge">High demand area</span>}
          </div>

          <div className="quotes-list">
            {quotes.quotes.map((q, idx) => (
              <div key={q.partner_id} className={`quote-card ${q.is_featured ? 'featured' : ''} ${idx === 0 ? 'best-match' : ''}`}>
                {idx === 0 && <div className="best-match-badge"><Star size={14} /> AI Best Match</div>}
                {q.is_featured && <div className="featured-badge">Featured</div>}

                <div className="quote-info">
                  <h3>{q.partner_name}</h3>
                  <StarRating rating={q.rating} />
                  <span className="quote-bookings">{q.total_bookings} jobs completed</span>
                </div>

                <div className="quote-details">
                  <div className="quote-price">{q.price_display}</div>
                  {idx === 0 && quotes.predicted_price && q.price < quotes.predicted_price && (
                    <span className="quote-savings">
                      Save UGX {(quotes.predicted_price - q.price).toLocaleString()}
                    </span>
                  )}
                  <div className="quote-meta">
                    <span><Clock size={14} /> ~{q.estimated_duration} min</span>
                    {q.distance_km !== null && (
                      <span><MapPin size={14} /> {q.distance_km} km away</span>
                    )}
                    <span><CheckCircle size={14} /> {q.next_available.display}</span>
                  </div>
                </div>

                <button className="btn btn-primary" onClick={() => handleSelectPartner(q)}>
                  Select <ChevronRight size={16} />
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

          <div className="order-step-actions two-btn">
            <button className="btn btn-outline" onClick={() => { setStep(1); setQuotes(null); }}>
              <ArrowLeft size={16} /> Change Service
            </button>
          </div>
        </div>
      )}

      {step === 3 && selectedQuote && (
        <div className="order-step-content">
          <div className="order-step-header">
            <h1>Confirm Your Order</h1>
            <p>Review details and place your order with <strong>{selectedQuote.partner_name}</strong></p>
          </div>

          <div className="booking-grid">
            <div className="booking-form-section">
              <div className="form-card">
                <h2>Order Details</h2>
                <div className="order-summary-mini">
                  <div className="order-summary-row">
                    <span>Service</span>
                    <strong>{serviceLabel}</strong>
                  </div>
                  <div className="order-summary-row">
                    <span>Area</span>
                    <strong>{location}</strong>
                  </div>
                  <div className="order-summary-row">
                    <span>Space</span>
                    <strong>{numRooms} bed, {numBathrooms} bath</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label><MapPin size={14} /> Your Full Address</label>
                  <input
                    type="text"
                    value={orderForm.address}
                    onChange={(e) => setOrderForm({ ...orderForm, address: e.target.value })}
                    placeholder="e.g. 123 Kimathi Avenue, Nakawa"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label><Calendar size={14} /> Preferred Date</label>
                    <input
                      type="date"
                      value={orderForm.scheduled_date}
                      onChange={(e) => setOrderForm({ ...orderForm, scheduled_date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label><Clock size={14} /> Preferred Time</label>
                    <select value={orderForm.scheduled_time} onChange={(e) => setOrderForm({ ...orderForm, scheduled_time: e.target.value })}>
                      {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Special Instructions</label>
                  <textarea
                    value={orderForm.special_requests}
                    onChange={(e) => setOrderForm({ ...orderForm, special_requests: e.target.value })}
                    placeholder="e.g. Focus on kitchen, bring own supplies, gate code is 1234..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-card">
                <h2>Payment Method</h2>
                <div className="payment-options">
                  <label className={`payment-option ${paymentMethod === 'mtn_momo' ? 'active' : ''}`}>
                    <input type="radio" value="mtn_momo" checked={paymentMethod === 'mtn_momo'} onChange={(e) => setPaymentMethod(e.target.value)} />
                    <span>MTN Mobile Money</span>
                  </label>
                  <label className={`payment-option ${paymentMethod === 'airtel_money' ? 'active' : ''}`}>
                    <input type="radio" value="airtel_money" checked={paymentMethod === 'airtel_money'} onChange={(e) => setPaymentMethod(e.target.value)} />
                    <span>Airtel Money</span>
                  </label>
                  <label className={`payment-option ${paymentMethod === 'card' ? 'active' : ''}`}>
                    <input type="radio" value="card" checked={paymentMethod === 'card'} onChange={(e) => setPaymentMethod(e.target.value)} />
                    <span>Bank Card</span>
                  </label>
                </div>
                {(paymentMethod === 'mtn_momo' || paymentMethod === 'airtel_money') && (
                  <div className="form-group">
                    <label>Mobile Money Number</label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+256 7XX XXX XXX"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="booking-summary">
              <div className="summary-card">
                <h2>Order Summary</h2>
                <div className="summary-partner">
                  <h3>{selectedQuote.partner_name}</h3>
                  <div className="summary-rating">
                    {'★'.repeat(Math.round(selectedQuote.rating))} {selectedQuote.rating_display}
                  </div>
                </div>
                <div className="summary-details">
                  <div className="summary-row">
                    <span>Service</span>
                    <span>{serviceLabel}</span>
                  </div>
                  <div className="summary-row">
                    <span>Location</span>
                    <span>{location}</span>
                  </div>
                  <div className="summary-row">
                    <span>Rooms / Bathrooms</span>
                    <span>{numRooms} / {numBathrooms}</span>
                  </div>
                  <div className="summary-row">
                    <span>Duration</span>
                    <span>~{selectedQuote.estimated_duration} min</span>
                  </div>
                  <div className="summary-row">
                    <span>Available</span>
                    <span>{selectedQuote.next_available?.display}</span>
                  </div>
                </div>
                <div className="summary-total">
                  <div className="summary-row total">
                    <span>Total</span>
                    <span>{selectedQuote.price_display}</span>
                  </div>
                </div>
                <div className="summary-guarantee">
                  <Shield size={16} />
                  <span>Assurance Guarantee included</span>
                </div>
                <button className="btn btn-primary btn-full btn-lg" onClick={handlePlaceOrder} disabled={orderLoading}>
                  {orderLoading
                    ? <><Loader2 size={18} className="spin" /> Processing...</>
                    : <><CreditCard size={18} /> Place Order & Pay</>
                  }
                </button>
              </div>
            </div>
          </div>

          <div className="order-step-actions" style={{ marginTop: 24 }}>
            <button className="btn btn-outline" onClick={() => setStep(2)}>
              <ArrowLeft size={16} /> Back to Partners
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
