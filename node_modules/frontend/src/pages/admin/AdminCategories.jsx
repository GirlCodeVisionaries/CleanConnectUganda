import { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { AdminPage, Loading, fmtUGX } from './common';
import { Plus, Loader2 } from 'lucide-react';

const BLANK = { name: '', base_price: '', icon: '', description: '', is_active: true };

export default function AdminCategories() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // {mode:'create'|'edit', data}
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { setList((await adminAPI.categories()).data); }
    catch { setError('Failed to load categories.'); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true); setError('');
    try {
      const { data, mode } = modal;
      if (mode === 'create') await adminAPI.createCategory(data);
      else await adminAPI.updateCategory(data.id, {
        name: data.name, base_price: data.base_price, icon: data.icon,
        description: data.description, is_active: data.is_active,
      });
      setModal(null);
      load();
    } catch (err) {
      setError(err.response?.data ? JSON.stringify(err.response.data) : 'Save failed.');
    }
    setSaving(false);
  };

  const disable = async (c) => {
    if (!window.confirm(`Disable "${c.name}"? Existing bookings are unaffected.`)) return;
    await adminAPI.disableCategory(c.id);
    load();
  };

  return (
    <AdminPage
      title="Service categories"
      subtitle="What customers can book"
      actions={<button className="btn btn-primary btn-sm" onClick={() => setModal({ mode: 'create', data: { ...BLANK } })}>
        <Plus size={14} /> New category
      </button>}
    >
      {error && <div className="alert alert-error">{error}</div>}
      {loading ? <Loading /> : (
        <div className="admin-table">
          <div className="admin-tr admin-tr-head" style={{ '--cols': '1.6fr 1fr 1fr 0.8fr 1.2fr' }}>
            <div>Name</div><div>Base price</div><div>Slug</div><div>Active</div><div>Actions</div>
          </div>
          {list.map((c) => (
            <div key={c.id} className="admin-tr" style={{ '--cols': '1.6fr 1fr 1fr 0.8fr 1.2fr' }}>
              <div><strong>{c.name}</strong><br /><span className="text-muted">{c.partner_service_count} partner services</span></div>
              <div>{fmtUGX(c.base_price)}</div>
              <div className="admin-cell-sub">{c.slug}</div>
              <div>{c.is_active ? 'Yes' : 'No'}</div>
              <div className="admin-btn-row">
                <button className="btn btn-outline btn-sm" onClick={() => setModal({ mode: 'edit', data: { ...c } })}>Edit</button>
                {c.is_active && <button className="btn btn-outline btn-sm" onClick={() => disable(c)}>Disable</button>}
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="admin-empty">No categories yet.</div>}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.mode === 'create' ? 'New category' : `Edit ${modal.data.name}`}</h2>
            <div className="form-group">
              <label>Name</label>
              <input value={modal.data.name}
                onChange={(e) => setModal({ ...modal, data: { ...modal.data, name: e.target.value } })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Base price (UGX)</label>
                <input type="number" value={modal.data.base_price}
                  onChange={(e) => setModal({ ...modal, data: { ...modal.data, base_price: e.target.value } })} />
              </div>
              <div className="form-group">
                <label>Icon name</label>
                <input value={modal.data.icon || ''}
                  onChange={(e) => setModal({ ...modal, data: { ...modal.data, icon: e.target.value } })} />
              </div>
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea rows={2} value={modal.data.description || ''}
                onChange={(e) => setModal({ ...modal, data: { ...modal.data, description: e.target.value } })} />
            </div>
            {modal.mode === 'edit' && (
              <label className="admin-check">
                <input type="checkbox" checked={modal.data.is_active}
                  onChange={(e) => setModal({ ...modal, data: { ...modal.data, is_active: e.target.checked } })} />
                Active
              </label>
            )}
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving || !modal.data.name || !modal.data.base_price}>
                {saving ? <><Loader2 size={14} className="spin" /> Saving…</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
