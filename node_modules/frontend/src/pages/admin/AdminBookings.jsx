import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  AdminPage, Toolbar, Pager, Loading, Pill, BOOKING_PILL, PAY_PILL, fmtUGX, fmtDate, usePagedList,
} from './common';
import { Loader2 } from 'lucide-react';

const STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed'];

export default function AdminBookings() {
  const [sp] = useSearchParams();
  const fetcher = useCallback((params) => adminAPI.bookings(params), []);
  const { data, loading, error, page, setPage, filters, updateFilter, reload } = usePagedList(
    fetcher, { status: sp.get('status') || '', search: '' },
  );
  const [edit, setEdit] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const openEdit = (b) => { setEdit(b); setNewStatus(b.status); setNotes(''); setMsg(''); };

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await adminAPI.setBookingStatus(edit.id, { status: newStatus, notes });
      setEdit(null);
      reload();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Update failed.');
    }
    setSaving(false);
  };

  return (
    <AdminPage title="Bookings" subtitle="Every booking on the platform">
      <Toolbar>
        <input className="admin-search" placeholder="Search ref, customer, partner…"
          defaultValue={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} />
        <select value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </Toolbar>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <Loading /> : (
        <>
          <div className="admin-table">
            <div className="admin-tr admin-tr-head" style={{ '--cols': '1fr 1.3fr 1.3fr 1fr 1fr 0.9fr 0.7fr' }}>
              <div>Ref</div><div>Customer</div><div>Partner</div><div>Date</div><div>Total</div><div>Status</div><div>Pay</div>
            </div>
            {data.results.map((b) => (
              <div key={b.id} className="admin-tr admin-tr-click" style={{ '--cols': '1fr 1.3fr 1.3fr 1fr 1fr 0.9fr 0.7fr' }}
                onClick={() => openEdit(b)}>
                <div><strong>{b.booking_ref}</strong></div>
                <div>{b.customer_name}</div>
                <div>{b.partner_name}</div>
                <div>{fmtDate(b.scheduled_date)}</div>
                <div>{fmtUGX(b.total_price)}</div>
                <div><Pill value={b.status} map={BOOKING_PILL} /></div>
                <div>{b.payment_status ? <Pill value={b.payment_status} map={PAY_PILL} /> : '—'}</div>
              </div>
            ))}
            {data.results.length === 0 && <div className="admin-empty">No bookings match.</div>}
          </div>
          <Pager page={page} numPages={data.num_pages} count={data.count} onPage={setPage} />
        </>
      )}

      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{edit.booking_ref}</h2>
            <p className="text-muted">{edit.customer_name} → {edit.partner_name} · {fmtUGX(edit.total_price)}</p>
            <div className="form-group">
              <label>Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Note (recorded in the activity log)</label>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {msg && <div className="alert alert-error">{msg}</div>}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><Loader2 size={14} className="spin" /> Saving…</> : 'Update status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
