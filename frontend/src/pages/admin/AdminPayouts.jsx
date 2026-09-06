import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  AdminPage, Toolbar, Pager, Loading, Pill, PAY_PILL, fmtUGX, fmtDateTime, usePagedList,
} from './common';
import { Loader2, RefreshCw } from 'lucide-react';

export default function AdminPayouts() {
  const [sp] = useSearchParams();
  const fetcher = useCallback((params) => adminAPI.payouts(params), []);
  const { data, loading, error, page, setPage, filters, updateFilter, reload } = usePagedList(
    fetcher, { status: sp.get('status') || '' },
  );
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState('');

  const retry = async (id) => {
    setBusy(id); setMsg('');
    try {
      const res = await adminAPI.retryPayout(id);
      setMsg(`Retry: payout is now "${res.data.status}".`);
      reload();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Retry failed.');
    }
    setBusy(null);
  };

  return (
    <AdminPage title="Payouts" subtitle="Disbursements to partners">
      <Toolbar>
        <select value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
          <option value="">All statuses</option>
          {['pending', 'processing', 'paid', 'failed'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </Toolbar>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <Loading /> : (
        <>
          <div className="admin-table">
            <div className="admin-tr admin-tr-head" style={{ '--cols': '1.4fr 1fr 1fr 1.2fr 1.2fr 0.9fr' }}>
              <div>Partner</div><div>Amount</div><div>Method</div><div>Reference</div><div>Status / date</div><div></div>
            </div>
            {data.results.map((p) => (
              <div key={p.id} className="admin-tr" style={{ '--cols': '1.4fr 1fr 1fr 1.2fr 1.2fr 0.9fr' }}>
                <div><strong>{p.partner_name}</strong>{p.requested_by_name && <><br /><span className="text-muted">by {p.requested_by_name}</span></>}</div>
                <div>{fmtUGX(p.amount)}</div>
                <div>{p.method_display}</div>
                <div className="admin-cell-sub">{p.reference || '—'}{p.failure_reason && <><br /><span className="text-error">{p.failure_reason}</span></>}</div>
                <div><Pill value={p.status} map={PAY_PILL} /><br /><span className="text-muted">{fmtDateTime(p.created_at)}</span></div>
                <div>
                  {(p.status === 'failed' || p.status === 'processing') && (
                    <button className="btn btn-outline btn-sm" disabled={busy === p.id} onClick={() => retry(p.id)}>
                      {busy === p.id ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />} Retry
                    </button>
                  )}
                </div>
              </div>
            ))}
            {data.results.length === 0 && <div className="admin-empty">No payouts match.</div>}
          </div>
          <Pager page={page} numPages={data.num_pages} count={data.count} onPage={setPage} />
        </>
      )}
    </AdminPage>
  );
}
