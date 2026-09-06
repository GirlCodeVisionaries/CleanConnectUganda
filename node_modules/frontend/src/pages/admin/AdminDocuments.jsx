import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import { AdminPage, Toolbar, Pager, Loading, Pill, PAY_PILL, fmtDateTime, usePagedList } from './common';
import { Check, X, FileText, Loader2 } from 'lucide-react';

const DOC_PILL = { pending: PAY_PILL.pending, approved: PAY_PILL.paid, rejected: PAY_PILL.failed };

export default function AdminDocuments() {
  const [sp] = useSearchParams();
  const fetcher = useCallback((params) => adminAPI.documents(params), []);
  const { data, loading, error, page, setPage, filters, updateFilter, reload } = usePagedList(
    fetcher, { status: sp.get('status') || 'pending' },
  );
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState('');

  const review = async (docId, decision) => {
    setBusy(docId); setMsg('');
    try {
      const res = await adminAPI.reviewDocument(docId, {
        decision,
        notes: decision === 'reject' ? 'Rejected by admin' : '',
      });
      setMsg(`Document ${decision}d. Partner is now "${res.data.partner_verification_status}".`);
      reload();
    } catch (err) {
      setMsg(err.response?.data?.error || 'Review failed.');
    }
    setBusy(null);
  };

  return (
    <AdminPage title="Document review" subtitle="Approve or reject partner verification documents">
      <Toolbar>
        <select value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </Toolbar>

      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <Loading /> : (
        <>
          <div className="admin-table">
            <div className="admin-tr admin-tr-head" style={{ '--cols': '1.4fr 1.4fr 1fr 1fr 1.6fr' }}>
              <div>Partner</div><div>Document</div><div>Status</div><div>Uploaded</div><div>Actions</div>
            </div>
            {data.results.map((d) => (
              <div key={d.id} className="admin-tr" style={{ '--cols': '1.4fr 1.4fr 1fr 1fr 1.6fr' }}>
                <div><Link to={`/admin/partners/${d.partner_id}`}>{d.business_name}</Link></div>
                <div className="admin-doc-info">
                  <span><FileText size={13} /> {d.doc_type_display}</span>
                  <a href={d.file_url} target="_blank" rel="noreferrer" className="text-muted">{d.original_name}</a>
                </div>
                <div><Pill value={d.status} map={DOC_PILL} /></div>
                <div className="text-muted">{fmtDateTime(d.uploaded_at)}</div>
                <div className="admin-btn-row">
                  {d.status !== 'approved' && (
                    <button className="btn btn-primary btn-sm" disabled={busy === d.id}
                      onClick={() => review(d.id, 'approve')}>
                      {busy === d.id ? <Loader2 size={13} className="spin" /> : <Check size={13} />} Approve
                    </button>
                  )}
                  {d.status !== 'rejected' && (
                    <button className="btn btn-outline btn-sm" disabled={busy === d.id}
                      onClick={() => review(d.id, 'reject')}>
                      <X size={13} /> Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
            {data.results.length === 0 && <div className="admin-empty">Nothing in this queue.</div>}
          </div>
          <Pager page={page} numPages={data.num_pages} count={data.count} onPage={setPage} />
        </>
      )}
    </AdminPage>
  );
}
