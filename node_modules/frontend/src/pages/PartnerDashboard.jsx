import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { partnersAPI, bookingsAPI, aiAPI } from '../services/api';
import { BarChart3, Users, DollarSign, Calendar, Star, TrendingUp, Loader2, MapPin, Clock } from 'lucide-react';

export default function PartnerDashboard() {
  const { user } = useAuth();
  const [partner, setPartner] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const partnerRes = await partnersAPI.list();
      const myPartner = partnerRes.data.find(p => p.user?.username === user?.username || p.id);
      if (myPartner) {
        const detailRes = await partnersAPI.detail(myPartner.id);
        setPartner(detailRes.data);

        const bookingsRes = await bookingsAPI.list();
        setBookings(bookingsRes.data);

        try {
          const forecastRes = await aiAPI.forecast({
            location: user?.location || 'Kampala',
            service_type: 'home_deep_clean',
            days: 7,
          });
          setForecast(forecastRes.data);
        } catch (e) {
          console.error('Forecast error:', e);
        }

        setStats({
          totalBookings: detailRes.data.total_bookings,
          avgRating: detailRes.data.avg_rating,
          totalEarnings: detailRes.data.total_earnings,
          trustScore: detailRes.data.trust_score,
        });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="loading-page"><Loader2 size={32} className="spin" /></div>;
  }

  if (!partner) {
    return (
      <div className="empty-state">
        <Users size={48} />
        <h2>Partner profile not found</h2>
        <p>Contact support to set up your partner account</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>{partner.business_name}</h1>
          <p>Partner Dashboard</p>
        </div>
        <div className="dashboard-badges">
          <span className={`badge ${partner.verification_status}`}>
            {partner.verification_status}
          </span>
          {partner.is_featured && <span className="badge featured">Featured</span>}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <Calendar size={24} />
          <div>
            <div className="stat-value">{stats.totalBookings || 0}</div>
            <div className="stat-label">Total Bookings</div>
          </div>
        </div>
        <div className="stat-card">
          <Star size={24} />
          <div>
            <div className="stat-value">{stats.avgRating || '0.0'}</div>
            <div className="stat-label">Avg Rating</div>
          </div>
        </div>
        <div className="stat-card">
          <DollarSign size={24} />
          <div>
            <div className="stat-value">UGX {Number(stats.totalEarnings || 0).toLocaleString()}</div>
            <div className="stat-label">Total Earnings</div>
          </div>
        </div>
        <div className="stat-card">
          <BarChart3 size={24} />
          <div>
            <div className="stat-value">{stats.trustScore || '--'}</div>
            <div className="stat-label">AI Trust Score</div>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>Bookings</button>
        <button className={`tab ${activeTab === 'forecast' ? 'active' : ''}`} onClick={() => setActiveTab('forecast')}>AI Forecast</button>
        <button className={`tab ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>Services</button>
      </div>

      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="overview-grid">
            <div className="overview-card">
              <h3>Recent Bookings</h3>
              {bookings.slice(0, 5).map(b => (
                <div key={b.id} className="mini-booking">
                  <div>
                    <strong>{b.booking_ref}</strong>
                    <p>{b.customer_name} — {b.address}</p>
                  </div>
                  <div className="mini-booking-right">
                    <span className={`status-dot ${b.status}`} />
                    <span>UGX {Number(b.total_price).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {bookings.length === 0 && <p className="text-muted">No bookings yet</p>}
            </div>
            <div className="overview-card">
              <h3>Services Offered</h3>
              {partner.services?.map(s => (
                <div key={s.id} className="mini-service">
                  <div>
                    <strong>{s.name}</strong>
                    <p>{s.category_name}</p>
                  </div>
                  <span>UGX {Number(s.base_price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="tab-content">
          <div className="bookings-table">
            {bookings.map(b => (
              <div key={b.id} className="table-row">
                <div><strong>{b.booking_ref}</strong></div>
                <div>{b.customer_name}</div>
                <div>{b.scheduled_date} {b.scheduled_time}</div>
                <div>{b.address}</div>
                <div>UGX {Number(b.total_price).toLocaleString()}</div>
                <div><span className={`status-dot ${b.status}`} /> {b.status}</div>
              </div>
            ))}
            {bookings.length === 0 && <p className="text-muted">No bookings yet</p>}
          </div>
        </div>
      )}

      {activeTab === 'forecast' && forecast && (
        <div className="tab-content">
          <div className="forecast-card">
            <h3><TrendingUp size={20} /> 7-Day Demand Forecast — {forecast.location}</h3>
            <p className="forecast-summary">
              Avg daily demand: <strong>{forecast.summary.avg_daily_demand}</strong> |
              Strategy: <strong>{forecast.summary.recommended_pricing_strategy}</strong>
            </p>
            <div className="forecast-bars">
              {forecast.forecasts.map(f => (
                <div key={f.date} className="forecast-bar-item">
                  <div className="forecast-bar-label">
                    <span>{f.day_name.slice(0, 3)}</span>
                    <span>{f.date.slice(5)}</span>
                  </div>
                  <div className="forecast-bar-track">
                    <div
                      className={`forecast-bar-fill ${f.demand_level}`}
                      style={{ width: `${Math.min((f.predicted_demand / (forecast.base_daily_demand * 2)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="forecast-bar-info">
                    <span>{f.predicted_demand} jobs</span>
                    <span>{f.suggested_price_multiplier}x price</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'services' && (
        <div className="tab-content">
          <div className="services-list">
            {partner.services?.map(s => (
              <div key={s.id} className="service-detail-card">
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <div className="service-pricing">
                  <div><span>Base Price:</span> <strong>UGX {Number(s.base_price).toLocaleString()}</strong></div>
                  <div><span>Per Additional Room:</span> <strong>UGX {Number(s.price_per_room).toLocaleString()}</strong></div>
                  <div><span>Duration:</span> <strong>{s.duration_minutes} min</strong></div>
                  <div><span>Status:</span> <strong className={s.is_available ? 'text-success' : 'text-error'}>
                    {s.is_available ? 'Available' : 'Unavailable'}
                  </strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
