import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingsAPI, paymentsAPI } from '../services/api';
import { Calendar, Clock, MapPin, CreditCard, Shield, CheckCircle, Loader2 } from 'lucide-react';

export default function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const data = loc.state || {};
  const quote = data.quote || {};

  const [form, setForm] = useState({
    address: user?.location || '',
    scheduled_date: '',
    scheduled_time: '09:00',
    special_requests: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('mtn_momo');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  const handleConfirm = async () => {
    if (!form.address || !form.scheduled_date) {
      setError('Please fill in address and date');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const bookingRes = await bookingsAPI.create({
        partner: quote.partner_id,
        service: null,
        service_category: null,
        address: form.address,
        num_rooms: data.numRooms || 1,
        num_bathrooms: data.numBathrooms || 1,
        special_requests: form.special_requests,
        scheduled_date: form.scheduled_date,
        scheduled_time: form.scheduled_time,
        duration_minutes: quote.estimated_duration || 120,
        total_price: quote.price,
        ai_quote_data: data,
      });

      const booking = bookingRes.data;

      await paymentsAPI.create({
        booking: booking.id,
        method: paymentMethod,
        phone_number: phoneNumber,
      });

      setBookingRef(booking.booking_ref);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Booking failed. Please try again.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="booking-success">
        <div className="success-card">
          <CheckCircle size={64} className="text-accent" />
          <h1>Booking Confirmed!</h1>
          <p className="booking-ref">Reference: <strong>{bookingRef}</strong></p>
          <div className="success-details">
            <p><strong>{quote.partner_name}</strong></p>
            <p><Calendar size={14} /> {form.scheduled_date} at {form.scheduled_time}</p>
            <p><MapPin size={14} /> {form.address}</p>
            <p><CreditCard size={14} /> {quote.price_display} paid via {paymentMethod === 'mtn_momo' ? 'MTN MoMo' : paymentMethod === 'airtel_money' ? 'Airtel Money' : 'Card'}</p>
          </div>
          <div className="success-guarantee">
            <Shield size={20} />
            <span>Protected by CleanConnect Assurance Guarantee</span>
          </div>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => navigate('/bookings')}>View My Bookings</button>
            <button className="btn btn-outline" onClick={() => navigate('/')}>Back to Home</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-page">
      <h1>Confirm Your Booking</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="booking-grid">
        <div className="booking-form-section">
          <div className="form-card">
            <h2>Service Details</h2>
            <div className="form-group">
              <label><MapPin size={14} /> Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Your full address"
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label><Calendar size={14} /> Date</label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="form-group">
                <label><Clock size={14} /> Time</label>
                <select value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}>
                  {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Special Requests</label>
              <textarea
                value={form.special_requests}
                onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
                placeholder="Any specific instructions..."
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
            <h2>Booking Summary</h2>
            <div className="summary-partner">
              <h3>{quote.partner_name}</h3>
              <div className="summary-rating">
                {'★'.repeat(Math.round(quote.rating))} {quote.rating_display}
              </div>
            </div>
            <div className="summary-details">
              <div className="summary-row">
                <span>Service</span>
                <span>{data.serviceType?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
              </div>
              <div className="summary-row">
                <span>Location</span>
                <span>{data.location}</span>
              </div>
              <div className="summary-row">
                <span>Rooms / Bathrooms</span>
                <span>{data.numRooms} / {data.numBathrooms}</span>
              </div>
              <div className="summary-row">
                <span>Duration</span>
                <span>{quote.estimated_duration} min</span>
              </div>
              <div className="summary-row">
                <span>Next Available</span>
                <span>{quote.next_available?.display}</span>
              </div>
            </div>
            <div className="summary-total">
              <div className="summary-row total">
                <span>Total</span>
                <span>{quote.price_display}</span>
              </div>
            </div>
            <div className="summary-guarantee">
              <Shield size={16} />
              <span>Assurance Guarantee included</span>
            </div>
            <button className="btn btn-primary btn-full btn-lg" onClick={handleConfirm} disabled={loading}>
              {loading ? <><Loader2 size={18} className="spin" /> Processing...</> : <><CreditCard size={18} /> Confirm & Pay</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
