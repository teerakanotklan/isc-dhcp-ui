import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookmarkCheck,
  ArrowLeft,
  Save
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
      <div className="page-wrapper text-center py-24">
        <div className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          Loading Host Details...
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-2xl space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link to="/static-hosts" className="text-cyan-600 dark:text-cyan-400 hover:underline">
            Static IP (Hosts)
          </Link>
          <span>/</span>
          {isEdit ? (
            <span className="text-slate-800 dark:text-slate-200">{name}</span>
          ) : (
            <span>New Host</span>
          )}
          <span>/</span>
          <span>{isEdit ? 'Edit Reservation' : 'Create'}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              className="btn-icon mt-1 sm:mt-0"
              onClick={() => navigate('/static-hosts')}
              title="Back to Static Hosts"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {isEdit ? `Edit Host ${name}` : 'Create Static IP Reservation'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                {isEdit
                  ? 'Update hardware MAC address, assigned fixed IP, or description notes'
                  : 'Assign a dedicated fixed IP reservation to a specific device MAC address'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              className="btn btn-secondary text-xs sm:text-sm"
              onClick={() => navigate('/static-hosts')}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary text-xs sm:text-sm"
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
      <form onSubmit={handleSubmit} className="glass-card space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/10">
          <BookmarkCheck size={20} className="text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Host Reservation Details
          </h2>
        </div>

        <div className="form-group">
          <label className="form-label">Host Identifier / Machine Name *</label>
          <input
            type="text"
            className="input-text text-sm"
            placeholder="e.g. accounting-printer or dev-nas-01"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Unique alphanumeric identifier for this host (spaces will be converted to hyphens)
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Physical Hardware MAC Address *</label>
          <input
            type="text"
            className="input-text font-mono text-sm"
            placeholder="00:1a:2b:3c:4d:5e"
            value={formData.mac}
            onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
            required
          />
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Client network interface MAC address (e.g. 08:00:27:fa:61:9a)
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Fixed IP Address *</label>
          <input
            type="text"
            className="input-text font-mono text-sm"
            placeholder="192.168.1.50"
            value={formData.ip}
            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
            required
          />
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Dedicated IP address that will always be assigned to this MAC
          </span>
        </div>

        <div className="form-group">
          <label className="form-label">Description / Device Notes</label>
          <input
            type="text"
            className="input-text text-sm"
            placeholder="e.g. Marketing Department Color Laser Printer - 3rd Floor"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
          <button
            type="button"
            className="btn btn-secondary text-sm"
            onClick={() => navigate('/static-hosts')}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary text-sm px-6"
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
}
