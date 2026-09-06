import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { AdminPage, Loading, Pill, VERIFY_PILL, PAY_PILL, fmtUGX, fmtDateTime } from './common';
import { ArrowLeft, Check, X, FileText, Loader2 } from 'lucide-react';

export default function AdminPartnerDetail() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  const [commission, setCommission] = useState('');
  const [payoutDest, setPayoutDest] = useState('');
  const [payoutMethod, setPayoutMethod] = useState('mtn_momo');

  const load = async () => {
    try {
      const res = await adminAPI.partner(id);
      setP(res.data);
      setCommission(res.data.commission_rate);
    } catch {
      setError('Could not load partner.');
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const act = async (fn, label) => {
    setBusy(label); setError(''); setNotice('');
    try { await fn(); await load(); setNotice(`${label} done.`); }
    catch (err) { setError(err.response?.data?.error || `${label} failed.`); }
    setBusy('');
  };

  if (loading) return <Loading />;
  if (!p) return <div className="alert alert-error">{error || 'Not found'}</div>;

  const v = p.verification || {};
  const es = p.earnings_summary || {};

  return (
    <AdminPage
      title={p.business_name}
      subtitle={<Link to="/admin/partners" className="admin-back"><ArrowLeft size={14} /> All partners</Link>}
      actions={<Pill value={p.verification_status} map={VERIFY_PILL} />}
    >
      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="admin-grid-2">
        <div className="overview-card">
          <h3>Verification</h3>
          <p className="text-muted" style={{ fontSize: 13 }}>
            Required: {v.required_documents?.join(', ') || '—'}<br />
            Missing: {v.missing_documents?.length ? v.missing_documents.join(', ') : 'none'}
          </p>
          <div className="admin-btn-row">
            <button className="btn btn-primary btn-sm" disabled={busy}
              onClick={() => act(() => adminAPI.setPartnerVerification(id, { status: 'verified' }), 'Verify')}>
              {busy === 'Verify' ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Verify
            </button>
            <button className="btn btn-outline btn-sm" disabled={busy}
              onClick={() => act(() => adminAPI.setPartnerVerification(id, { status: 'suspended' }), 'Suspend')}>
              Suspend
            </button>
            <button className="btn btn-outline btn-sm" disabled={busy}
              onClick={() => act(() => adminAPI.setPartnerVerification(id, { status: 'rejected' }), 'Reject')}>
              <X size={14} /> Reject
            </button>
            <button className="btn btn-outline btn-sm" disabled={busy}
              onClick={() => act(() => adminAPI.setPartnerVerification(id, { status: 'pending' }), 'Reset')}>
              Reset to pending
            </button>
          </div>
        </div>

        <div className="overview-card">
          <h3>Settings</h3>
          <div className="form-group">
            <label>Commission rate (%)</label>
            <div className="admin-inline-form">
              <input type="number" step="0.5" value={commission} onChange={(e) => setCommission(e.target.value)} />
              <button className="btn btn-outline btn-sm" disabled={busy}
                onClick={() => act(() => adminAPI.updatePartner(id, { commission_rate: commission }), 'Commission update')}>
                Save
              </button>
            </div>
          </div>
          <label className="admin-check">
            <input type="checkbox" checked={p.is_featured} disabled={busy}
              onChange={(e) => act(() => adminAPI.updatePartner(id, { is_featured: e.target.checked }), 'Featured toggle')} />
            Featured partner
          </label>
        </div>
      </div>

      <div className="admin-grid-2">
        <div className="overview-card">
          <h3>Earnings</h3>
          <div className="admin-kv"><span>Lifetime gross</span><strong>{fmtUGX(es.lifetime_gross)}</strong></div>
          <div className="admin-kv"><span>Commission taken</span><strong>{fmtUGX(es.lifetime_commission)}</strong></div>
          <div className="admin-kv"><span>Available for payout</span><strong>{fmtUGX(es.available_balance)}</strong></div>
          <div className="admin-kv"><span>Paid out</span><strong>{fmtUGX(es.paid_out)}</strong></div>
          <div className="admin-inline-form" style={{ marginTop: 12 }}>
            <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}>
              <option value="mtn_momo">MTN MoMo</option>
              <option value="airtel_money">Airtel Money</option>
              <option value="bank">Bank</option>
            </select>
            <input placeholder="Destination acct / phone" value={payoutDest} onChange={(e) => setPayoutDest(e.target.value)} />
            <button className="btn btn-primary btn-sm" disabled={busy || !payoutDest}
              onClick={() => act(() => adminAPI.payoutPartner(id, { method: payoutMethod, destination: payoutDest }), 'Payout')}>
              Pay out balance
            </button>
          </div>
        </div>

        <div className="overview-card">
          <h3>Account</h3>
          <div className="admin-kv"><span>User</span><strong>{p.user?.username}</strong></div>
          <div className="admin-kv"><span>Email</span><strong>{p.user?.email || '—'}</strong></div>
          <div className="admin-kv"><span>Phone</span><strong>{p.user?.phone || '—'}</strong></div>
          <div className="admin-kv"><span>Rating</span><strong>{p.avg_rating}</strong></div>
          <div className="admin-kv"><span>Bookings</span><strong>{p.total_bookings}</strong></div>
          <div className="admin-kv"><span>Joined</span><strong>{fmtDateTime(p.created_at)}</strong></div>
        </div>
      </div>

      <div className="overview-card">
        <h3>Documents</h3>
        {(!p.documents || p.documents.length === 0) && <p className="text-muted">No documents uploaded.</p>}
        {p.documents?.map((d) => (
          <div key={d.id} className="admin-doc-row">
            <FileText size={16} />
            <div className="admin-doc-info">
              <strong>{d.doc_type_display}</strong>
              <a href={d.file_url} target="_blank" rel="noreferrer" className="text-muted">{d.original_name}</a>
            </div>
            <Pill value={d.status} map={{ pending: PAY_PILL.pending, approved: PAY_PILL.paid, rejected: PAY_PILL.failed }} />
            {d.status !== 'approved' && (
              <button className="btn btn-primary btn-sm" disabled={busy}
                onClick={() => act(() => adminAPI.reviewDocument(d.id, { decision: 'approve' }), 'Approve doc')}>
                <Check size={13} /> Approve
              </button>
            )}
            {d.status !== 'rejected' && (
              <button className="btn btn-outline btn-sm" disabled={busy}
                onClick={() => act(() => adminAPI.reviewDocument(d.id, { decision: 'reject', notes: 'Rejected by admin' }), 'Reject doc')}>
                <X size={13} /> Reject
              </button>
            )}
          </div>
        ))}
      </div>
    </AdminPage>
  );
}
