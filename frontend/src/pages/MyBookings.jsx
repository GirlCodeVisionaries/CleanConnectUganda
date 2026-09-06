import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingsAPI, reviewsAPI } from '../services/api';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, AlertCircle, Star, Loader2 } from 'lucide-react';

const STATUS_CONFIG = {
  pending: { icon: Clock, color: '#f59e0b', label: 'Pending' },
  confirmed: { icon: CheckCircle, color: '#10b981', label: 'Confirmed' },
  in_progress: { icon: AlertCircle, color: '#3b82f6', label: 'In Progress' },
  completed: { icon: CheckCircle, color: '#10b981', label: 'Completed' },
  cancelled: { icon: XCircle, color: '#ef4444', label: 'Cancelled' },
  disputed: { icon: AlertCircle, color: '#ef4444', label: 'Disputed' },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [reviewModal, setReviewModal] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadBookings();
  }, [filter]);

  const loadBookings = async () => {
    try {
      const params = filter ? { status: filter } : {};
      const res = await bookingsAPI.list(params);
      setBookings(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const submitReview = async () => {
    if (!reviewModal) return;
    try {
      await reviewsAPI.create({
        booking: reviewModal.id,
        partner: reviewModal.partner,
        rating,
        comment,
      });
      setReviewModal(null);
      setRating(5);
      setComment('');
      loadBookings();
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error
        || Object.values(data || {}).flat().join(', ')
        || 'Failed to submit review';
      alert(msg);
    }
  };

  if (loading) {
    return <div className="loading-page"><Loader2 size={32} className="spin" /></div>;
  }

  return (
    <div className="bookings-page">
      <div className="page-header">
        <h1>My Bookings</h1>
        <Link to="/order" className="btn btn-primary">Book a Cleaner</Link>
      </div>

      <div className="filter-tabs">
        {['', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(f => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f ? STATUS_CONFIG[f]?.label : 'All'}
          </button>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <h2>No bookings yet</h2>
          <p>Find a verified cleaner and book your first service</p>
          <Link to="/order" className="btn btn-primary">Find a Cleaner</Link>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map(b => {
            const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div key={b.id} className="booking-card">
                <div className="booking-card-header">
                  <span className="booking-ref">{b.booking_ref}</span>
                  <span className="booking-status" style={{ color: cfg.color }}>
                    <Icon size={14} /> {cfg.label}
                  </span>
                </div>
                <div className="booking-card-body">
                  <div>
                    <h3>{b.partner_name}</h3>
                    <p className="booking-service">{b.service_name || 'Cleaning Service'}</p>
                    <p className="booking-meta">
                      <Calendar size={14} /> {b.scheduled_date} at {b.scheduled_time}
                    </p>
                    <p className="booking-meta">
                      <MapPin size={14} /> {b.address}
                    </p>
                  </div>
                  <div className="booking-card-right">
                    <div className="booking-price">UGX {Number(b.total_price).toLocaleString()}</div>
                    {b.status === 'completed' && !b.review && (
                      <button className="btn btn-outline btn-sm" onClick={() => setReviewModal(b)}>
                        <Star size={14} /> Leave Review
                      </button>
                    )}
                    {b.review && (
                      <div className="booking-review-mini">
                        {'★'.repeat(b.review.rating)} {b.review.comment?.slice(0, 40)}...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Leave a Review</h2>
            <p>How was your experience with {reviewModal.partner_name}?</p>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} className={`star-btn ${n <= rating ? 'active' : ''}`} onClick={() => setRating(n)}>
                  <Star size={28} fill={n <= rating ? '#f59e0b' : 'none'} />
                </button>
              ))}
            </div>
            <div className="form-group">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience (optional)..."
                rows={4}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setReviewModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitReview}>Submit Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
