import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { partnerPortalAPI } from '../services/api';
import {
  Wallet, TrendingDown, PiggyBank, BanknoteArrowUp, Loader2,
  ArrowDownToLine, CheckCircle, Clock, XCircle,
} from 'lucide-react';

const ugx = (v) => `UGX ${Number(v || 0).toLocaleString()}`;

const EARNING_STATUS = {
  pending: { color: 'var(--warning)', label: 'Pending job' },
  available: { color: 'var(--info)', label: 'Available' },
  paid: { color: 'var(--success)', label: 'Paid out' },
};

const PAYOUT_STATUS = {
  pending: { icon: Clock, color: 'var(--warning)', label: 'Pending' },
  processing: { icon: Loader2, color: 'var(--info)', label: 'Processing' },
  paid: { icon: CheckCircle, color: 'var(--success)', label: 'Paid' },
  failed: { icon: XCircle, color: 'var(--error)', label: 'Failed' },
};

export default function PartnerEarnings() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noPartner, setNoPartner] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [method, setMethod] = useState('mtn_momo');
  const [destination, setDestination] = useState(user?.phone || '');
  const [requesting, setRequesting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    try {
      const [eRes, pRes] = await Promise.all([
        partnerPortalAPI.earnings(),
        partnerPortalAPI.payouts(),
      ]);
      setSummary(eRes.data.summary);
      setEarnings(eRes.data.earnings);
      setPayouts(pRes.data.payouts);
    } catch (err) {
      if (err.response?.status === 404) setNoPartner(true);
      else setError('Could not load your earnings.');
    }
    setLoading(false);
  };

  const requestPayout = async () => {
    setError('');
    setRequesting(true);
    try {
      const res = await partnerPortalAPI.requestPayout({ method, destination });
      setModalOpen(false);
      setNotice(
        res.data.status === 'paid'
          ? `Payout of ${ugx(res.data.amount)} sent (ref ${res.data.reference}).`
          : `Payout of ${ugx(res.data.amount)} is ${res.data.status}.`
      );
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Payout request failed.');
    }
    setRequesting(false);
  };

  if (loading) {
    return <div className="loading-page"><Loader2 size={32} className="spin" /></div>;
  }

  if (noPartner) {
    return (
      <div className="empty-state">
        <Wallet size={48} />
        <h2>No partner profile yet</h2>
        <p>Complete onboarding to start earning through CleanConnect.</p>
        <Link to="/partner/onboarding" className="btn btn-primary">Start Onboarding</Link>
      </div>
    );
  }

  const available = Number(summary?.available_balance || 0);
  const minimum = Number(summary?.payout_minimum || 0);
  const canPayout = available >= minimum;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Earnings & Payouts</h1>
          <p>What customers paid, our commission, and what's yours</p>
        </div>
        <button
          className="btn btn-primary"
          disabled={!canPayout}
          title={canPayout ? '' : `Minimum payout is ${ugx(minimum)}`}
          onClick={() => { setError(''); setModalOpen(true); }}
        >
          <ArrowDownToLine size={16} /> Request Payout
        </button>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <Wallet size={24} />
          <div>
            <div className="stat-value">{ugx(summary?.lifetime_gross)}</div>
            <div className="stat-label">Customers Paid (gross)</div>
          </div>
        </div>
        <div className="stat-card">
          <TrendingDown size={24} />
          <div>
            <div className="stat-value">{ugx(summary?.lifetime_commission)}</div>
            <div className="stat-label">Platform Commission ({summary?.commission_rate}%)</div>
          </div>
        </div>
        <div className="stat-card">
          <PiggyBank size={24} />
          <div>
            <div className="stat-value">{ugx(summary?.available_balance)}</div>
            <div className="stat-label">Available for Payout</div>
          </div>
        </div>
        <div className="stat-card">
          <BanknoteArrowUp size={24} />
          <div>
            <div className="stat-value">{ugx(summary?.paid_out)}</div>
            <div className="stat-label">Paid Out to You</div>
          </div>
        </div>
      </div>

      <div className="overview-card" style={{ marginBottom: 24 }}>
        <h3>Earnings by Job</h3>
        <div className="bookings-table">
          <div className="table-row earnings-row">
            <div>Reference</div>
            <div>Date</div>
            <div>Customer Paid</div>
            <div>Commission</div>
            <div>Your Payout</div>
            <div>Status</div>
          </div>
          {earnings.map((e) => {
            const cfg = EARNING_STATUS[e.status] || EARNING_STATUS.pending;
            return (
              <div key={e.id} className="table-row earnings-row">
                <div><strong>{e.booking_ref}</strong></div>
                <div>{e.scheduled_date}</div>
                <div>{ugx(e.gross_amount)}</div>
                <div className="text-error">- {ugx(e.commission_amount)}</div>
                <div className="text-success"><strong>{ugx(e.net_amount)}</strong></div>
                <div style={{ color: cfg.color }}>{cfg.label}</div>
              </div>
            );
          })}
          {earnings.length === 0 && (
            <div className="table-row"><div style={{ gridColumn: '1 / -1' }} className="text-muted">
              No earnings yet. You'll see a line here once a customer pays for one of your jobs.
            </div></div>
          )}
        </div>
      </div>

      <div className="overview-card">
        <h3>Payout History</h3>
        {payouts.length === 0 ? (
          <p className="text-muted">No payouts yet.</p>
        ) : (
          <div className="bookings-table">
            <div className="table-row payout-row">
              <div>Date</div>
              <div>Amount</div>
              <div>Method</div>
              <div>Reference</div>
              <div>Status</div>
            </div>
            {payouts.map((p) => {
              const cfg = PAYOUT_STATUS[p.status] || PAYOUT_STATUS.pending;
              const Icon = cfg.icon;
              return (
                <div key={p.id} className="table-row payout-row">
                  <div>{new Date(p.created_at).toLocaleDateString()}</div>
                  <div><strong>{ugx(p.amount)}</strong></div>
                  <div>{p.method_display}</div>
                  <div>{p.reference || '—'}</div>
                  <div style={{ color: cfg.color }}>
                    <Icon size={14} className={p.status === 'processing' ? 'spin' : ''} /> {cfg.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Request Payout</h2>
            <p>
              We'll send your full available balance of <strong>{ugx(available)}</strong> to the
              account below.
            </p>
            <div className="form-group">
              <label>Payout Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="mtn_momo">MTN Mobile Money</option>
                <option value="airtel_money">Airtel Money</option>
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <div className="form-group">
              <label>{method === 'bank' ? 'Account Number' : 'Mobile Money Number'}</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={method === 'bank' ? 'Account number' : '+256 7XX XXX XXX'}
              />
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={requestPayout} disabled={requesting || !destination}>
                {requesting ? <><Loader2 size={16} className="spin" /> Sending...</> : 'Confirm Payout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
