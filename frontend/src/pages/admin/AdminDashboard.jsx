import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { AdminPage, Loading, fmtUGX, fmtDateTime } from './common';
import {
  Building2, Users, CalendarCheck, Coins, TrendingUp, Banknote,
  FileCheck2, AlertTriangle, ArrowRight,
} from 'lucide-react';

export default function AdminDashboard() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminAPI.overview()
      .then((res) => setD(res.data))
      .catch(() => setError('Failed to load overview.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (error) return <div className="alert alert-error">{error}</div>;

  const q = d.queues;
  const queueItems = [
    { n: q.pending_partners, label: 'Partners awaiting verification', to: '/admin/partners?status=pending', icon: Building2 },
    { n: q.pending_documents, label: 'Documents to review', to: '/admin/documents?status=pending', icon: FileCheck2 },
    { n: q.failed_payouts, label: 'Failed payouts', to: '/admin/payouts?status=failed', icon: Banknote },
    { n: q.disputed_bookings, label: 'Disputed bookings', to: '/admin/bookings?status=disputed', icon: AlertTriangle },
  ];

  return (
    <AdminPage title="Dashboard" subtitle="Platform health at a glance">
      <div className="stats-grid">
        <Stat icon={Building2} value={d.partners.total} label={`Partners (${d.partners.pending_verification} pending)`} />
        <Stat icon={Users} value={d.users.total} label={`Users · ${d.users.new_30d} new / 30d`} />
        <Stat icon={CalendarCheck} value={d.bookings.total} label={`Bookings · ${d.bookings.new_30d} new / 30d`} />
        <Stat icon={Coins} value={fmtUGX(d.money.commission_revenue)} label="Commission revenue" />
        <Stat icon={TrendingUp} value={fmtUGX(d.money.gmv)} label="Gross merchandise value" />
        <Stat icon={Banknote} value={fmtUGX(d.money.partner_earnings)} label="Partner earnings (net)" />
        <Stat icon={Banknote} value={fmtUGX(d.payouts.paid.amount)} label={`Paid out · ${d.payouts.paid.n} payouts`} />
        <Stat icon={Banknote} value={fmtUGX(d.payouts.failed.amount)} label={`Failed payouts · ${d.payouts.failed.n}`} />
      </div>

      <div className="admin-grid-2">
        <div className="overview-card">
          <h3>Action queues</h3>
          {queueItems.map(({ n, label, to, icon: Icon }) => (
            <Link key={label} to={to} className="admin-queue-row">
              <Icon size={16} />
              <span className="admin-queue-label">{label}</span>
              <span className={`admin-queue-count ${n > 0 ? 'hot' : ''}`}>{n}</span>
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>

        <div className="overview-card">
          <h3>Bookings by status</h3>
          {Object.entries(d.bookings.by_status).length === 0 && <p className="text-muted">No bookings yet.</p>}
          {Object.entries(d.bookings.by_status).map(([k, v]) => (
            <div key={k} className="admin-kv">
              <span>{k.replace('_', ' ')}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="overview-card">
        <h3>Recent admin activity</h3>
        {d.recent_activity.length === 0 && <p className="text-muted">No admin actions recorded yet.</p>}
        {d.recent_activity.map((a) => (
          <div key={a.id} className="admin-activity-row">
            <span className="admin-activity-action">{a.action}</span>
            <span className="admin-activity-summary">{a.summary}</span>
            <span className="text-muted">{a.actor_name || 'system'} · {fmtDateTime(a.created_at)}</span>
          </div>
        ))}
        <Link to="/admin/activity" className="admin-see-all">View full activity log <ArrowRight size={14} /></Link>
      </div>
    </AdminPage>
  );
}

function Stat({ icon: Icon, value, label }) {
  return (
    <div className="stat-card">
      <Icon size={22} />
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
