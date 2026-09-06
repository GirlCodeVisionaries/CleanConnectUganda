import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

export const fmtUGX = (v) => `UGX ${Number(v || 0).toLocaleString()}`;
export const fmtDate = (v) => (v ? new Date(v).toLocaleDateString() : '—');
export const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : '—');

/* Hook for a paginated admin list endpoint. `fetcher(params)` -> axios promise
   resolving to { results, count, page, num_pages }. */
export function usePagedList(fetcher, initialFilters = {}) {
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], count: 0, num_pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, ...filters };
      Object.keys(params).forEach((k) => (params[k] === '' || params[k] == null) && delete params[k]);
      const res = await fetcher(params);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load.');
    }
    setLoading(false);
  }, [fetcher, page, filters]);

  useEffect(() => { load(); }, [load]);

  const updateFilter = (patch) => { setPage(1); setFilters((f) => ({ ...f, ...patch })); };

  return { data, loading, error, page, setPage, filters, updateFilter, reload: load };
}

export function AdminPage({ title, subtitle, actions, children }) {
  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="admin-page-actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Toolbar({ children }) {
  return <div className="admin-toolbar">{children}</div>;
}

export function Pager({ page, numPages, count, onPage }) {
  if (count === 0) return null;
  return (
    <div className="admin-pager">
      <span>{count} result{count === 1 ? '' : 's'}</span>
      <div className="admin-pager-buttons">
        <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft size={14} />
        </button>
        <span>Page {page} / {numPages}</span>
        <button className="btn btn-outline btn-sm" disabled={page >= numPages} onClick={() => onPage(page + 1)}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function Loading() {
  return <div className="loading-page"><Loader2 size={28} className="spin" /></div>;
}

export function Pill({ value, map = {} }) {
  const cfg = map[value] || {};
  return (
    <span className="admin-pill" style={{ background: cfg.bg || 'var(--border-light)', color: cfg.fg || 'var(--text-secondary)' }}>
      {cfg.label || value || '—'}
    </span>
  );
}

export const VERIFY_PILL = {
  pending: { label: 'Pending', bg: '#fef3c7', fg: '#92400e' },
  verified: { label: 'Verified', bg: '#d1fae5', fg: '#065f46' },
  rejected: { label: 'Rejected', bg: '#fee2e2', fg: '#991b1b' },
  suspended: { label: 'Suspended', bg: '#e5e7eb', fg: '#374151' },
};

export const BOOKING_PILL = {
  pending: { label: 'Pending', bg: '#fef3c7', fg: '#92400e' },
  confirmed: { label: 'Confirmed', bg: '#d1fae5', fg: '#065f46' },
  in_progress: { label: 'In progress', bg: '#dbeafe', fg: '#1e40af' },
  completed: { label: 'Completed', bg: '#d1fae5', fg: '#065f46' },
  cancelled: { label: 'Cancelled', bg: '#fee2e2', fg: '#991b1b' },
  disputed: { label: 'Disputed', bg: '#fee2e2', fg: '#991b1b' },
};

export const PAY_PILL = {
  pending: { label: 'Pending', bg: '#fef3c7', fg: '#92400e' },
  processing: { label: 'Processing', bg: '#dbeafe', fg: '#1e40af' },
  completed: { label: 'Completed', bg: '#d1fae5', fg: '#065f46' },
  paid: { label: 'Paid', bg: '#d1fae5', fg: '#065f46' },
  failed: { label: 'Failed', bg: '#fee2e2', fg: '#991b1b' },
  refunded: { label: 'Refunded', bg: '#e5e7eb', fg: '#374151' },
};
