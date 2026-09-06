import { useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { AdminPage, Toolbar, Pager, Loading, fmtDateTime, usePagedList } from './common';

export default function AdminActivity() {
  const fetcher = useCallback((params) => adminAPI.activity(params), []);
  const { data, loading, error, page, setPage, filters, updateFilter } = usePagedList(
    fetcher, { action: '', target_type: '', actor: '' },
  );

  return (
    <AdminPage title="Activity log" subtitle="Every write action taken through the admin portal">
      <Toolbar>
        <input className="admin-search" placeholder="Filter by admin username…"
          defaultValue={filters.actor} onChange={(e) => updateFilter({ actor: e.target.value })} />
        <input className="admin-search" placeholder="action (e.g. partner.verification)"
          defaultValue={filters.action} onChange={(e) => updateFilter({ action: e.target.value })} />
        <select value={filters.target_type} onChange={(e) => updateFilter({ target_type: e.target.value })}>
          <option value="">Any target</option>
          {['partner', 'partnerdocument', 'booking', 'payment', 'payout', 'user', 'servicecategory'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </Toolbar>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <Loading /> : (
        <>
          <div className="admin-table">
            <div className="admin-tr admin-tr-head" style={{ '--cols': '1.2fr 1fr 1.2fr 2.4fr 1fr' }}>
              <div>When</div><div>Admin</div><div>Action</div><div>Summary</div><div>Target</div>
            </div>
            {data.results.map((a) => (
              <div key={a.id} className="admin-tr" style={{ '--cols': '1.2fr 1fr 1.2fr 2.4fr 1fr' }}>
                <div className="text-muted">{fmtDateTime(a.created_at)}</div>
                <div>{a.actor_name || 'system'}</div>
                <div className="admin-cell-sub">{a.action}</div>
                <div>{a.summary}</div>
                <div className="admin-cell-sub">{a.target_type}{a.target_id ? `#${a.target_id}` : ''}</div>
              </div>
            ))}
            {data.results.length === 0 && <div className="admin-empty">No activity recorded.</div>}
          </div>
          <Pager page={page} numPages={data.num_pages} count={data.count} onPage={setPage} />
        </>
      )}
    </AdminPage>
  );
}
