import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookmarkCheck,
  Save,
  Wand2
} from 'lucide-react';

export function StaticIPForm({ setNotification }) {
  const { id, name: paramName } = useParams();
  const hostIdentifier = id || paramName;
  const isEdit = Boolean(hostIdentifier);
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [subnets, setSubnets] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    mac: '',
    ip: '',
    description: '',
  });

  useEffect(() => {
    // Fetch available subnets to assist in IP suggestion
    apiFetch('/api/scopes')
      .then((res) => res.json())
      .then((data) => setSubnets(data))
      .catch(() => {});

    if (!isEdit) return;

    const fetchHostData = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/static-hosts/${hostIdentifier}`);
        if (!res.ok) {
          throw new Error(`Host '${hostIdentifier}' not found`);
        }
        const found = await res.json();

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
  }, [hostIdentifier, isEdit]);

  const generateRandomMac = () => {
    const hex = '0123456789abcdef';
    let mac = '52:54:00'; // Common QEMU/KVM prefix
    for (let i = 0; i < 3; i++) {
      mac += ':' + hex[Math.floor(Math.random() * 16)] + hex[Math.floor(Math.random() * 16)];
    }
    setFormData((prev) => ({ ...prev, mac }));
  };

  const handleSubnetSelect = (subnet) => {
    if (!subnet) return;
    const parts = subnet.subnet.split('.');
    if (parts.length === 4) {
      const suggestedIp = `${parts[0]}.${parts[1]}.${parts[2]}.`;
      setFormData((prev) => ({ ...prev, ip: suggestedIp }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (isEdit) {
        const res = await apiFetch(`/api/static-hosts/${hostIdentifier}`, {
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
        setNotification({ type: 'success', message: `Host ${formData.name} created successfully` });
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
      <div className="page-wrapper max-w-7xl mx-auto flex items-center justify-center py-20">
        <div className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          Loading Host Details...
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-7xl space-y-6">
      {/* Header (No Left Arrow, clean Breadcrumbs + Action buttons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isEdit ? `Edit Host ${formData.name || '#' + hostIdentifier}` : 'Create Static IP Reservation'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            {isEdit
              ? 'Update hardware MAC address, assigned fixed IP, or description notes'
              : 'Assign a dedicated fixed IP reservation to a specific device MAC address'}
          </p>
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
            className="btn btn-primary text-xs sm:text-sm shadow-glow-indigo"
            onClick={handleSubmit}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Reservation'}
          </button>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="form-group mb-0">
            <label className="form-label">Host Identifier Name *</label>
            <input
              type="text"
              className="input-text font-mono"
              placeholder="e.g. office-printer or web-server"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Unique hostname declaration inside dhcpd.conf
            </span>
          </div>

          <div className="form-group mb-0">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Hardware MAC Address *</label>
              <button
                type="button"
                className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                onClick={generateRandomMac}
              >
                <Wand2 size={12} /> Auto-Gen Sample
              </button>
            </div>
            <input
              type="text"
              className="input-text font-mono"
              placeholder="00:1a:2b:3c:4d:5e"
              value={formData.mac}
              onChange={(e) => setFormData({ ...formData, mac: e.target.value })}
              pattern="^([0-9a-fA-F]{2}[:-]){5}([0-9a-fA-F]{2})$"
              title="6 pairs of hexadecimal characters separated by colons or hyphens"
              required
            />
          </div>

          <div className="form-group mb-0">
            <div className="flex items-center justify-between mb-1">
              <label className="form-label mb-0">Fixed IP Address *</label>
              {subnets.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <span>Prefill:</span>
                  {subnets.slice(0, 2).map((s) => (
                    <button
                      key={s.subnet}
                      type="button"
                      className="text-cyan-600 dark:text-cyan-400 hover:underline"
                      onClick={() => handleSubnetSelect(s)}
                    >
                      {s.subnet.split('.').slice(0, 3).join('.')}.x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              className="input-text font-mono"
              placeholder="192.168.1.50"
              value={formData.ip}
              onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
              pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}$"
              title="Standard IPv4 address"
              required
            />
          </div>

          <div className="form-group mb-0">
            <label className="form-label">Description / Device Notes</label>
            <input
              type="text"
              className="input-text"
              placeholder="e.g. Finance Floor Printer - HP LaserJet"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
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
            className="btn btn-primary text-sm shadow-glow-indigo"
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
