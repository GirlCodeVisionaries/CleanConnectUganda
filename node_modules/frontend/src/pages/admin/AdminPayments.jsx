import { useCallback, useState } from 'react';
import { adminAPI } from '../../services/api';
import {
  AdminPage, Toolbar, Pager, Loading, Pill, PAY_PILL, fmtUGX, fmtDateTime, usePagedList,
} from './common';
import { Loader2, Undo2 } from 'lucide-react';

export default function AdminPayments() {
  const fetcher = useCallback((params) => adminAPI.payments(params), []);
  const { data, loading, error, page, setPage, filters, updateFilter, reload } = usePagedList(
    fetcher, { status: '', method: '', search: '' },
  );
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState('');

  const refund = async (id) => {
    if (!window.confirm('Refund this payment and cancel the booking?')) return;
    setBusy(id); setMsg('');
    try {
      await adminAPI.refundPayment(id);
      setMsg('Payment refunded and booking cancelled.');
      reload();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Refund failed.');
    }
    setBusy(null);
  };

  return (
    <AdminPage title="Payments" subtitle="Money collected from customers">
      <Toolbar>
        <input className="admin-search" placeholder="Search txn id / booking ref…"
          defaultValue={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} />
        <select value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
          <option value="">All statuses</option>
          {['pending', 'processing', 'completed', 'failed', 'refunded'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.method} onChange={(e) => updateFilter({ method: e.target.value })}>
          <option value="">All methods</option>
          <option value="mtn_momo">MTN MoMo</option>
          <option value="airtel_money">Airtel Money</option>
          <option value="card">Card</option>
        </select>
      </Toolbar>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <Loading /> : (
        <>
          <div className="admin-table">
            <div className="admin-tr admin-tr-head" style={{ '--cols': '1.2fr 1fr 1fr 1fr 1fr 1.2fr 0.9fr' }}>
              <div>Txn</div><div>Booking</div><div>Customer</div><div>Amount</div><div>Method</div><div>Status / date</div><div></div>
            </div>
            {data.results.map((p) => (
              <div key={p.id} className="admin-tr" style={{ '--cols': '1.2fr 1fr 1fr 1fr 1fr 1.2fr 0.9fr' }}>
                <div className="admin-cell-sub">{p.transaction_id || '—'}</div>
                <div>{p.booking_ref}</div>
                <div>{p.customer_name}</div>
                <div>{fmtUGX(p.amount)}</div>
                <div>{p.method}</div>
                <div><Pill value={p.status} map={PAY_PILL} /><br /><span className="text-muted">{fmtDateTime(p.created_at)}</span></div>
                <div>
                  {p.status !== 'refunded' && (
                    <button className="btn btn-outline btn-sm" disabled={busy === p.id} onClick={() => refund(p.id)}>
                      {busy === p.id ? <Loader2 size={13} className="spin" /> : <Undo2 size={13} />} Refund
                    </button>
                  )}
                </div>
              </div>
            ))}
            {data.results.length === 0 && <div className="admin-empty">No payments match.</div>}
          </div>
          <Pager page={page} numPages={data.num_pages} count={data.count} onPage={setPage} />
        </>
      )}
    </AdminPage>
  );
}
