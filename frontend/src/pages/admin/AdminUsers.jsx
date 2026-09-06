import { useCallback, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import {
  AdminPage, Toolbar, Pager, Loading, Pill, fmtDate, usePagedList,
} from './common';
import { Loader2 } from 'lucide-react';

const ROLE_PILL = {
  customer: { label: 'Customer', bg: '#dbeafe', fg: '#1e40af' },
  partner: { label: 'Partner', bg: '#d1fae5', fg: '#065f46' },
  admin: { label: 'Admin', bg: '#fce7f3', fg: '#9d174d' },
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const fetcher = useCallback((params) => adminAPI.users(params), []);
  const { data, loading, error, page, setPage, filters, updateFilter, reload } = usePagedList(
    fetcher, { role: '', is_active: '', search: '' },
  );
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState('');

  const run = async (id, fn) => {
    setBusy(id); setMsg('');
    try { await fn(); reload(); }
    catch (err) { setMsg(err.response?.data?.error || 'Action failed.'); }
    setBusy(null);
  };

  return (
    <AdminPage title="Users" subtitle="Everyone with an account">
      <Toolbar>
        <input className="admin-search" placeholder="Search username, email, phone…"
          defaultValue={filters.search} onChange={(e) => updateFilter({ search: e.target.value })} />
        <select value={filters.role} onChange={(e) => updateFilter({ role: e.target.value })}>
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="partner">Partner</option>
          <option value="admin">Admin</option>
        </select>
        <select value={filters.is_active} onChange={(e) => updateFilter({ is_active: e.target.value })}>
          <option value="">Any state</option>
          <option value="true">Active</option>
          <option value="false">Deactivated</option>
        </select>
      </Toolbar>

      {msg && <div className="alert alert-error">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {loading ? <Loading /> : (
        <>
          <div className="admin-table">
            <div className="admin-tr admin-tr-head" style={{ '--cols': '1.3fr 1.5fr 1fr 1fr 0.8fr 1.6fr' }}>
              <div>Username</div><div>Email / phone</div><div>Role</div><div>Joined</div><div>Bookings</div><div>Actions</div>
            </div>
            {data.results.map((u) => {
              const isSelf = me && u.id === me.id;
              return (
                <div key={u.id} className="admin-tr" style={{ '--cols': '1.3fr 1.5fr 1fr 1fr 0.8fr 1.6fr' }}>
                  <div>
                    <strong>{u.username}</strong>{u.is_superuser && <span className="text-muted"> ★</span>}
                    {!u.is_active && <div><span className="admin-pill" style={{ background: '#fee2e2', color: '#991b1b' }}>deactivated</span></div>}
                  </div>
                  <div className="admin-cell-sub">{u.email || '—'}<br /><span className="text-muted">{u.phone || ''}</span></div>
                  <div>
                    <select className="admin-mini-select" value={u.role} disabled={busy === u.id}
                      onChange={(e) => run(u.id, () => adminAPI.setUserRole(u.id, { role: e.target.value }))}>
                      <option value="customer">customer</option>
                      <option value="partner">partner</option>
                      <option value="admin">admin</option>
                    </select>
                  </div>
                  <div className="text-muted">{fmtDate(u.date_joined)}</div>
                  <div>{u.booking_count}</div>
                  <div className="admin-btn-row">
                    {!isSelf && (
                      <button className="btn btn-outline btn-sm" disabled={busy === u.id}
                        onClick={() => run(u.id, () => adminAPI.setUserActive(u.id, { is_active: !u.is_active }))}>
                        {busy === u.id ? <Loader2 size={13} className="spin" /> : (u.is_active ? 'Deactivate' : 'Reactivate')}
                      </button>
                    )}
                    <Pill value={u.role} map={ROLE_PILL} />
                  </div>
                </div>
              );
            })}
            {data.results.length === 0 && <div className="admin-empty">No users match.</div>}
          </div>
          <Pager page={page} numPages={data.num_pages} count={data.count} onPage={setPage} />
        </>
      )}
    </AdminPage>
  );
}
