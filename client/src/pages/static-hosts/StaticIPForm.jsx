import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookmarkCheck,
  ArrowLeft,
  Save,
  CheckCircle2,
  Info
} from 'lucide-react';

export function StaticIPForm({ setNotification }) {
  const { name } = useParams();
  const isEdit = Boolean(name);
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mac: '',
    ip: '',
    description: '',
  });

  useEffect(() => {
    if (!isEdit) return;

    const fetchHostData = async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/static-hosts');
        const hosts = await res.json();
        const found = hosts.find((h) => h.name === name);

        if (!found) {
          throw new Error(`Host '${name}' not found`);
        }

        setFormData({
          name: found.name,
          mac: found.mac,
          ip: found.ip,
          description: found.description || '',
        });
      } catch (err) {
        setNotification({ type: 'danger', message: err.message });
        navigate('/static-hosts');
      } finally {
        setLoading(false);
      }
    };

    fetchHostData();
  }, [name, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEdit) {
        const res = await apiFetch(`/api/static-hosts/${name}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setNotification({ type: 'success', message: `Host ${formData.name} updated successfully` });
      } else {
        const res = await apiFetch('/api/static-hosts', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setNotification({ type: 'success', message: `Static host reservation ${formData.name} created` });
      }

      navigate('/static-hosts');
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading Host Details...</div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: 760 }}>
      {/* Breadcrumbs & Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          <Link to="/static-hosts" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>
            Static IP (Hosts)
          </Link>
          <span>/</span>
          {isEdit ? (
            <span style={{ color: 'var(--text-primary)' }}>{name}</span>
          ) : (
            <span>New Host</span>
          )}
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{isEdit ? 'Edit Reservation' : 'Create'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="btn-icon" onClick={() => navigate('/static-hosts')} title="Back to Static Hosts">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
                {isEdit ? `Edit Host ${name}` : 'Create Static IP Reservation'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                {isEdit
                  ? 'Update hardware MAC address, assigned fixed IP, or description notes'
                  : 'Assign a dedicated fixed IP reservation to a specific device MAC address'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/static-hosts')}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Reservation'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <BookmarkCheck size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Host Reservation Details</h2>
          </div>

          <div className="form-group">
            <label className="form-label">Host Identifier / Machine Name *</label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. accounting-printer or dev-nas-01"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Unique alphanumeric identifier for this host (spaces will be converted to hyphens)
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Physical Hardware MAC Address *</label>
            <input
              type="text"
              className="input-text font-mono"
              placeholder="00:1a:2b:3c:4d:5e"
              value={formData.mac}
              onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Client network interface MAC address (e.g. 08:00:27:fa:61:9a or 00-1A-2B-3C-4D-5E)
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Fixed IP Address *</label>
            <input
              type="text"
              className="input-text font-mono"
              placeholder="192.168.1.50"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              required
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Dedicated IP address that will always be assigned to this MAC
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Device Notes</label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. Marketing Department Color Laser Printer - 3rd Floor"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/static-hosts')}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={{ padding: '10px 24px' }}
          >
            <Save size={16} />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
}
