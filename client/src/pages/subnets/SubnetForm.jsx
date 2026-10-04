import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Network,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Sliders,
  Globe,
  HardDrive,
  Info,
  CheckCircle2
} from 'lucide-react';

const PREDEFINED_DHCP_OPTIONS = [
  { value: 'ntp-servers', label: 'ntp-servers (Option 42 - Network Time Protocol)', example: 'time.google.com, 192.168.1.1' },
  { value: 'bootfile-name', label: 'bootfile-name (Option 67 - PXE Boot File Name)', example: '"pxelinux.0" or "ipxe.efi"' },
  { value: 'tftp-server-name', label: 'tftp-server-name (Option 66 - TFTP Boot Server)', example: '"tftp.corp.lan" or 192.168.1.5' },
  { value: 'next-server', label: 'next-server (Directive - PXE Server IP)', example: '192.168.1.5' },
  { value: 'netbios-name-servers', label: 'netbios-name-servers (Option 44 - WINS Server)', example: '192.168.1.10, 192.168.1.11' },
  { value: 'netbios-node-type', label: 'netbios-node-type (Option 46 - 1:B, 2:P, 4:M, 8:H)', example: '8' },
  { value: 'domain-search', label: 'domain-search (Option 119 - Domain Search List)', example: '"corp.lan", "sales.corp.lan"' },
  { value: 'interface-mtu', label: 'interface-mtu (Option 26 - MTU in bytes)', example: '1492' },
  { value: 'default-ip-ttl', label: 'default-ip-ttl (Option 23 - Default Time To Live)', example: '64' },
  { value: 'time-servers', label: 'time-servers (Option 4 - RFC 868 Time)', example: '192.168.1.1' },
  { value: 'time-offset', label: 'time-offset (Option 2 - UTC offset in seconds)', example: '25200' },
  { value: 'log-servers', label: 'log-servers (Option 7 - Syslog Servers)', example: '192.168.1.250' },
  { value: 'wpad', label: 'wpad (Option 252 - Web Proxy PAC URL)', example: '"http://wpad.corp.lan/wpad.dat"' },
  { value: 'captive-portal', label: 'captive-portal (Option 114 - Captive Portal URL)', example: '"https://login.wifi.corp.lan"' },
  { value: 'vendor-encapsulated-options', label: 'vendor-encapsulated-options (Option 43)', example: '01:04:c0:a8:01:0a' },
  { value: 'custom', label: '⚡ Custom Option (Specify name manually)...', example: 'value or "string"' },
];

export function SubnetForm({ setNotification }) {
  const { id } = useParams(); // Subnet network IP if editing (e.g. 192.168.1.0)
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    subnet: '',
    netmask: '255.255.255.0',
    rangeStart: '',
    rangeEnd: '',
    routers: '',
    broadcastAddress: '',
    domainNameServers: '8.8.8.8, 1.1.1.1',
    domainName: '',
    defaultLeaseTime: 86400,
    maxLeaseTime: 604800,
  });

  const [customOptions, setCustomOptions] = useState([]);

  // Fetch subnet details if in edit mode
  useEffect(() => {
    if (!isEdit) return;

    const fetchSubnetData = async () => {
      try {
        setLoading(true);
        const res = await apiFetch('/api/subnets');
        const subnets = await res.json();
        const found = subnets.find((s) => s.subnet === id);

        if (!found) {
          throw new Error(`Subnet ${id} not found`);
        }

        setFormData({
          subnet: found.subnet,
          netmask: found.netmask || '255.255.255.0',
          rangeStart: found.rangeStart || '',
          rangeEnd: found.rangeEnd || '',
          routers: found.routers || '',
          broadcastAddress: found.broadcastAddress || '',
          domainNameServers: found.domainNameServers || '',
          domainName: found.domainName || '',
          defaultLeaseTime: found.defaultLeaseTime || 86400,
          maxLeaseTime: found.maxLeaseTime || 604800,
        });

        if (Array.isArray(found.customOptions)) {
          const mapped = found.customOptions.map((opt) => {
            const isPredefined = PREDEFINED_DHCP_OPTIONS.some(
              (p) => p.value !== 'custom' && p.value === opt.name
            );
            return {
              type: isPredefined ? opt.name : 'custom',
              customName: isPredefined ? '' : opt.name,
              value: opt.value || '',
            };
          });
          setCustomOptions(mapped);
        }
      } catch (err) {
        setNotification({ type: 'danger', message: err.message });
        navigate('/subnets');
      } finally {
        setLoading(false);
      }
    };

    fetchSubnetData();
  }, [id, isEdit]);

  // Option Handlers
  const handleAddOption = () => {
    setCustomOptions([
      ...customOptions,
      { type: 'ntp-servers', customName: '', value: '' },
    ]);
  };

  const handleRemoveOption = (index) => {
    setCustomOptions(customOptions.filter((_, i) => i !== index));
  };

  const handleOptionTypeChange = (index, newType) => {
    const updated = [...customOptions];
    updated[index].type = newType;
    if (newType !== 'custom') {
      updated[index].customName = '';
    }
    setCustomOptions(updated);
  };

  const handleOptionFieldChange = (index, field, val) => {
    const updated = [...customOptions];
    updated[index][field] = val;
    setCustomOptions(updated);
  };

  const getOptionExample = (type) => {
    const item = PREDEFINED_DHCP_OPTIONS.find((p) => p.value === type);
    return item ? item.example : 'Value';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formattedOptions = customOptions
      .map((opt) => {
        const optionName = opt.type === 'custom' ? opt.customName.trim() : opt.type;
        return {
          name: optionName,
          value: opt.value.trim(),
        };
      })
      .filter((opt) => opt.name && opt.value !== '');

    const payload = {
      ...formData,
      customOptions: formattedOptions,
    };

    try {
      if (isEdit) {
        const res = await apiFetch(`/api/subnets/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setNotification({ type: 'success', message: `Subnet ${formData.subnet} updated successfully` });
      } else {
        const res = await apiFetch('/api/subnets', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setNotification({ type: 'success', message: `Subnet ${formData.subnet} created successfully` });
      }

      navigate('/subnets');
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading Subnet Details...</div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: 980 }}>
      {/* Breadcrumbs & Navigation Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
          <Link to="/subnets" style={{ color: 'var(--accent-cyan)', textDecoration: 'none' }}>
            Subnet Management
          </Link>
          <span>/</span>
          {isEdit ? (
            <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{id}</span>
          ) : (
            <span>New Subnet</span>
          )}
          <span>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{isEdit ? 'Edit Configuration' : 'Create'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="btn-icon" onClick={() => navigate('/subnets')} title="Back to Subnets">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 2 }}>
                {isEdit ? `Edit Subnet ${id}` : 'Create New Subnet'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                {isEdit
                  ? 'Modify address pool range, routing options, and specialized DHCP parameters'
                  : 'Define a new network segment and configure dynamic IP address allocation'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/subnets')}
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
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Subnet'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Section 1: Network & Address Pool */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <Network size={20} color="var(--accent-primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>1. Network Identification & IP Range</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Subnet Network IP *</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.0"
                value={formData.subnet}
                onChange={(e) => setFormData({ ...formData, subnet: e.target.value })}
                disabled={isEdit}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Base network address of the subnet (e.g. 192.168.1.0 or 10.0.0.0)
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Subnet Mask *</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="255.255.255.0"
                value={formData.netmask}
                onChange={(e) => setFormData({ ...formData, netmask: e.target.value })}
                required
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Subnet mask in dotted decimal format (e.g. 255.255.255.0)
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Dynamic Pool Range Start IP</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.100"
                value={formData.rangeStart}
                onChange={(e) => setFormData({ ...formData, rangeStart: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dynamic Pool Range End IP</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.200"
                value={formData.rangeEnd}
                onChange={(e) => setFormData({ ...formData, rangeEnd: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Gateways, DNS & Lease Timers */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <Globe size={20} color="var(--accent-cyan)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>2. Gateway, DNS & Lease Parameters</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Default Gateway (option routers)</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.1"
                value={formData.routers}
                onChange={(e) => setFormData({ ...formData, routers: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Broadcast Address (option broadcast-address)</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.255"
                value={formData.broadcastAddress}
                onChange={(e) => setFormData({ ...formData, broadcastAddress: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">DNS Name Servers (comma separated)</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="1.1.1.1, 8.8.8.8"
                value={formData.domainNameServers}
                onChange={(e) => setFormData({ ...formData, domainNameServers: e.target.value })}
              />
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                DNS IPs pushed to client devices (e.g. 1.1.1.1, 8.8.8.8)
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Domain Name (option domain-name)</label>
              <input
                type="text"
                className="input-text"
                placeholder="corp.internal"
                value={formData.domainName}
                onChange={(e) => setFormData({ ...formData, domainName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Lease Time (seconds)</label>
              <input
                type="number"
                className="input-text"
                placeholder="86400"
                value={formData.defaultLeaseTime}
                onChange={(e) => setFormData({ ...formData, defaultLeaseTime: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Additional DHCP Options */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sliders size={20} color="var(--accent-cyan)" />
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>3. Additional DHCP Options</h2>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Configure advanced options like NTP time sync, PXE network boot, WINS, or custom vendor tags
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.82rem', padding: '6px 14px' }}
              onClick={handleAddOption}
            >
              <Plus size={15} /> Add DHCP Option
            </button>
          </div>

          {customOptions.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 20px',
                background: 'rgba(0, 0, 0, 0.15)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
                fontSize: '0.88rem',
              }}
            >
              <Sliders size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <div>No additional DHCP options specified for this subnet.</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                Click <strong>+ Add DHCP Option</strong> to configure NTP, PXE boot, MTU, WPAD, or custom parameters.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {customOptions.map((opt, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {/* Select Option */}
                  <div style={{ flex: 1.2, minWidth: 200 }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Option Identifier
                    </label>
                    <select
                      className="select-input font-mono"
                      value={opt.type}
                      onChange={(e) => handleOptionTypeChange(idx, e.target.value)}
                    >
                      {PREDEFINED_DHCP_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value} style={{ background: '#0f172a', color: '#fff' }}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    {opt.type === 'custom' && (
                      <input
                        type="text"
                        className="input-text font-mono"
                        style={{ marginTop: 8, fontSize: '0.82rem' }}
                        placeholder="Enter custom option name..."
                        value={opt.customName}
                        onChange={(e) => handleOptionFieldChange(idx, 'customName', e.target.value)}
                        required
                      />
                    )}
                  </div>

                  {/* Value Input */}
                  <div style={{ flex: 2, minWidth: 220 }}>
                    <label style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Option Value / Parameter
                    </label>
                    <input
                      type="text"
                      className="input-text font-mono"
                      placeholder={`Example: ${getOptionExample(opt.type)}`}
                      value={opt.value}
                      onChange={(e) => handleOptionFieldChange(idx, 'value', e.target.value)}
                      required
                    />
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    className="btn-icon"
                    style={{ marginTop: 22, color: 'var(--status-danger)', padding: 9 }}
                    onClick={() => handleRemoveOption(idx)}
                    title="Remove Option"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingBottom: 40 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/subnets')}
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
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Subnet'}
          </button>
        </div>
      </form>
    </div>
  );
}
