import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { partnerPortalAPI } from '../services/api';
import {
  Building2, FileText, CheckCircle, Loader2, Upload, Trash2,
  ArrowRight, ArrowLeft, ShieldCheck, AlertCircle, Clock,
} from 'lucide-react';

const DOC_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'business_registration', label: 'Business Registration Certificate' },
  { value: 'tax_certificate', label: 'Tax Certificate (TIN)' },
  { value: 'proof_of_address', label: 'Proof of Address' },
  { value: 'insurance', label: 'Insurance Certificate' },
  { value: 'certification', label: 'Cleaning Certification' },
  { value: 'other', label: 'Other' },
];

const DOC_STATUS = {
  pending: { icon: Clock, color: 'var(--warning)', label: 'Pending review' },
  approved: { icon: CheckCircle, color: 'var(--success)', label: 'Approved' },
  rejected: { icon: AlertCircle, color: 'var(--error)', label: 'Rejected' },
};

export default function PartnerOnboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState({
    business_name: '',
    business_description: '',
    is_individual: false,
    coverage_radius_km: 10,
    phone: user?.phone || '',
    location: user?.location || '',
  });

  const [docType, setDocType] = useState('national_id');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMe = async () => {
    try {
      const res = await partnerPortalAPI.me();
      applyMe(res.data);
      if (res.data.business_name) setStep(2);
    } catch (err) {
      if (err.response?.status !== 404) setError('Could not load your partner profile.');
    }
    setLoading(false);
  };

  const applyMe = (data) => {
    setMe(data);
    setProfile((p) => ({
      ...p,
      business_name: data.business_name || p.business_name,
      business_description: data.business_description || p.business_description,
      is_individual: data.is_individual,
      coverage_radius_km: data.coverage_radius_km || p.coverage_radius_km,
      phone: data.user?.phone || p.phone,
      location: data.user?.location || p.location,
    }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await partnerPortalAPI.onboard(profile);
      applyMe(res.data);
      if (user && user.role !== 'partner') {
        const updated = { ...user, role: 'partner' };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
      setStep(2);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(', ') : 'Could not save your details.');
    }
    setSaving(false);
  };

  const uploadDoc = async () => {
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('doc_type', docType);
      fd.append('file', file);
      await partnerPortalAPI.uploadDocument(fd);
      setFile(null);
      const res = await partnerPortalAPI.me();
      applyMe(res.data);
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(', ') : 'Upload failed.');
    }
    setUploading(false);
  };

  const removeDoc = async (id) => {
    try {
      await partnerPortalAPI.deleteDocument(id);
      const res = await partnerPortalAPI.me();
      applyMe(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove document.');
    }
  };

  if (loading) {
    return <div className="loading-page"><Loader2 size={32} className="spin" /></div>;
  }

  const required = me?.verification?.required_documents || [];
  const missing = me?.verification?.missing_documents || [];
  const docs = me?.documents || [];

  return (
    <div className="onboarding-page">
      <div className="order-steps">
        <div className={`order-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
          <div className="step-circle">{step > 1 ? <CheckCircle size={18} /> : '1'}</div>
          <span>Business Details</span>
        </div>
        <div className="step-line" />
        <div className={`order-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'done' : ''}`}>
          <div className="step-circle">{step > 2 ? <CheckCircle size={18} /> : '2'}</div>
          <span>Upload Documents</span>
        </div>
        <div className="step-line" />
        <div className={`order-step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-circle">3</div>
          <span>Verification</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 1 && (
        <div className="order-step-content">
          <div className="order-step-header">
            <h1><Building2 size={24} /> Tell us about your cleaning business</h1>
            <p>This is what customers and our team see. You can update it later.</p>
          </div>

          <form className="form-card" onSubmit={saveProfile}>
            <div className="form-group">
              <label>Business / Trading Name</label>
              <input
                type="text"
                value={profile.business_name}
                onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                placeholder="e.g. SparkleHome Ltd"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={profile.business_description}
                onChange={(e) => setProfile({ ...profile, business_description: e.target.value })}
                placeholder="What you do, years of experience, areas you specialise in..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>You are registering as</label>
              <div className="role-selector">
                <label className={`role-option ${!profile.is_individual ? 'active' : ''}`}>
                  <input
                    type="radio"
                    checked={!profile.is_individual}
                    onChange={() => setProfile({ ...profile, is_individual: false })}
                  />
                  <span>A registered company</span>
                </label>
                <label className={`role-option ${profile.is_individual ? 'active' : ''}`}>
                  <input
                    type="radio"
                    checked={profile.is_individual}
                    onChange={() => setProfile({ ...profile, is_individual: true })}
                  />
                  <span>An individual cleaner</span>
                </label>
              </div>
              <p className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                {profile.is_individual
                  ? 'Individuals need an approved National ID to get verified.'
                  : 'Companies need an approved National ID and Business Registration Certificate.'}
              </p>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Contact Phone</label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+256 7XX XXX XXX"
                />
              </div>
              <div className="form-group">
                <label>Base Location</label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="e.g. Ntinda, Kampala"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Coverage Radius: {profile.coverage_radius_km} km</label>
              <input
                type="range"
                min={1}
                max={50}
                value={profile.coverage_radius_km}
                onChange={(e) => setProfile({ ...profile, coverage_radius_km: Number(e.target.value) })}
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
              {saving ? <><Loader2 size={16} className="spin" /> Saving...</> : <>Save & Continue <ArrowRight size={16} /></>}
            </button>
          </form>
        </div>
      )}

      {step === 2 && (
        <div className="order-step-content">
          <div className="order-step-header">
            <h1><FileText size={24} /> Upload your verification documents</h1>
            <p>Accepted formats: PDF, JPG, PNG, WEBP (max 5 MB each).</p>
          </div>

          <div className="form-card">
            <div className="required-docs-note">
              <ShieldCheck size={16} />
              <span>
                Required for verification:{' '}
                <strong>{required.map((r) => DOC_TYPES.find((d) => d.value === r)?.label || r).join(', ') || '—'}</strong>
              </span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {DOC_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}{required.includes(d.value) ? ' (required)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>File</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFile(e.target.files[0] || null)}
                />
              </div>
            </div>

            <button className="btn btn-outline" onClick={uploadDoc} disabled={uploading}>
              {uploading ? <><Loader2 size={16} className="spin" /> Uploading...</> : <><Upload size={16} /> Upload Document</>}
            </button>
          </div>

          <div className="doc-list">
            {docs.length === 0 && <p className="text-muted">No documents uploaded yet.</p>}
            {docs.map((d) => {
              const cfg = DOC_STATUS[d.status] || DOC_STATUS.pending;
              const Icon = cfg.icon;
              return (
                <div key={d.id} className="doc-row">
                  <FileText size={18} />
                  <div className="doc-row-info">
                    <strong>{d.doc_type_display}</strong>
                    <span className="text-muted">{d.original_name}</span>
                    {d.status === 'rejected' && d.review_notes && (
                      <span className="text-error" style={{ fontSize: 12 }}>{d.review_notes}</span>
                    )}
                  </div>
                  <span className="doc-status" style={{ color: cfg.color }}>
                    <Icon size={14} /> {cfg.label}
                  </span>
                  {d.status !== 'approved' && (
                    <button className="icon-btn" onClick={() => removeDoc(d.id)} title="Remove">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="order-step-actions two-btn">
            <button className="btn btn-outline" onClick={() => setStep(1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="order-step-content">
          <div className="order-step-header">
            <h1><ShieldCheck size={24} /> Verification status</h1>
          </div>

          <div className="form-card verification-card">
            <div className="verification-status-row">
              <span>Current status</span>
              <span className={`badge ${me?.verification_status}`}>{me?.verification_status}</span>
            </div>

            {me?.verification?.documents_complete ? (
              <div className="verification-ok">
                <CheckCircle size={20} />
                <span>All required documents are approved. You can now receive bookings.</span>
              </div>
            ) : (
              <div className="verification-pending">
                <Clock size={20} />
                <span>
                  Waiting on:{' '}
                  <strong>
                    {missing.map((m) => DOC_TYPES.find((d) => d.value === m)?.label || m).join(', ')}
                  </strong>
                  . Our team reviews documents within 1–2 business days.
                </span>
              </div>
            )}

            <ul className="checklist">
              <li className={me?.onboarding_complete?.profile ? 'done' : ''}>
                <CheckCircle size={16} /> Business details completed
              </li>
              <li className={docs.length > 0 ? 'done' : ''}>
                <CheckCircle size={16} /> Documents uploaded
              </li>
              <li className={me?.verification?.documents_complete ? 'done' : ''}>
                <CheckCircle size={16} /> Documents approved by CleanConnect
              </li>
            </ul>
          </div>

          <div className="order-step-actions two-btn">
            <button className="btn btn-outline" onClick={() => setStep(2)}>
              <ArrowLeft size={16} /> Documents
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
