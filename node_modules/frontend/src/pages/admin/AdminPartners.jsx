import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminAPI } from '../../services/api';
import {
  AdminPage, Toolbar, Pager, Loading, Pill, VERIFY_PILL, fmtUGX, usePagedList,
} from './common';

export default function AdminPartners() {
  const [sp] = useSearchParams();
  const fetcher = useCallback((params) => adminAPI.partners(params), []);
  const { data, loading, error, page, setPage, filters, updateFilter } = usePagedList(
    fetcher, { status: sp.get('status') || '', search: '' },
  );

  return (
    <AdminPage title="Partners" subtitle="Cleaning companies and individuals on the platform">
      <Toolbar>
        <input
          className="admin-search"
          placeholder="Search name, username, email…"
          defaultValue={filters.search}
          onChange={(e) => updateFilter({ search: e.target.value })}
        />
        <select value={filters.status} onChange={(e) => updateFilter({ status: e.target.value })}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
        <select value={filters.is_individual || ''} onChange={(e) => updateFilter({ is_individual: e.target.value })}>
          <option value="">Any type</option>
          <option value="false">Company</option>
          <option value="true">Individual</option>
        </select>
      </Toolbar>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <Loading /> : (
        <>
          <div className="admin-table">
            <div className="admin-tr admin-tr-head" style={{ '--cols': '2fr 1.4fr 1fr 1fr 1fr 0.8fr' }}>
              <div>Business</div><div>Contact</div><div>Status</div><div>Commission</div><div>Earnings</div><div>Docs</div>
            </div>
            {data.results.map((p) => (
              <Link key={p.id} to={`/admin/partners/${p.id}`} className="admin-tr" style={{ '--cols': '2fr 1.4fr 1fr 1fr 1fr 0.8fr' }}>
                <div>
                  <strong>{p.business_name}</strong>
                  <span className="text-muted"> · {p.is_individual ? 'Individual' : 'Company'}</span>
                </div>
                <div className="admin-cell-sub">{p.username}<br /><span className="text-muted">{p.email || p.phone || '—'}</span></div>
                <div><Pill value={p.verification_status} map={VERIFY_PILL} /></div>
                <div>{p.commission_rate}%</div>
                <div>{fmtUGX(p.total_earnings)}</div>
                <div>{p.pending_documents > 0 ? <span className="admin-queue-count hot">{p.pending_documents}</span> : '—'}</div>
              </Link>
            ))}
            {data.results.length === 0 && <div className="admin-empty">No partners match.</div>}
          </div>
          <Pager page={page} numPages={data.num_pages} count={data.count} onPage={setPage} />
        </>
      )}
    </AdminPage>
  );
}
