import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Network,
  Save,
  Plus,
  Trash2,
  Sliders,
  Globe,
  SlidersHorizontal,
  Power,
  PowerOff
} from 'lucide-react';

const PREDEFINED_DHCP_OPTIONS = [
  { value: 'ntp-servers', label: 'ntp-servers (NTP Time Server)', example: 'time.google.com, 192.168.1.1' },
  { value: 'bootfile-name', label: 'bootfile-name (PXE Boot File)', example: '"pxelinux.0" or "ipxe.efi"' },
  { value: 'tftp-server-name', label: 'tftp-server-name (TFTP Server)', example: '"tftp.corp.lan" or 192.168.1.5' },
  { value: 'next-server', label: 'next-server (PXE Server IP)', example: '192.168.1.5' },
  { value: 'netbios-name-servers', label: 'netbios-name-servers (WINS Server)', example: '192.168.1.10, 192.168.1.11' },
  { value: 'netbios-node-type', label: 'netbios-node-type (NetBIOS Node Type)', example: '8' },
  { value: 'domain-search', label: 'domain-search (Search Domains)', example: '"corp.lan", "sales.corp.lan"' },
  { value: 'interface-mtu', label: 'interface-mtu (MTU Size)', example: '1492' },
  { value: 'default-ip-ttl', label: 'default-ip-ttl (IP TTL)', example: '64' },
  { value: 'time-servers', label: 'time-servers (Time Server)', example: '192.168.1.1' },
  { value: 'time-offset', label: 'time-offset (Time Offset in seconds)', example: '25200' },
  { value: 'log-servers', label: 'log-servers (Syslog Server)', example: '192.168.1.250' },
  { value: 'wpad', label: 'wpad (Proxy Auto-Discovery URL)', example: '"http://wpad.corp.lan/wpad.dat"' },
  { value: 'captive-portal', label: 'captive-portal (Captive Portal URL)', example: '"https://login.wifi.corp.lan"' },
  { value: 'vendor-encapsulated-options', label: 'vendor-encapsulated-options (Vendor Option 43)', example: '01:04:c0:a8:01:0a' },
  { value: 'custom', label: 'Custom Option (Specify Name)...', example: 'value or "string"' },
];

export function ScopeForm({ setNotification }) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { apiFetch } = useAuth();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    subnet: '',
    netmask: '255.255.255.0',
    disabled: false,
    rangeStart: '',
    rangeEnd: '',
    routers: '',
    domainNameServers: '8.8.8.8, 1.1.1.1',
    domainName: '',
    defaultLeaseTime: 86400,
  });

  const [customOptions, setCustomOptions] = useState([]);

  useEffect(() => {
    if (!isEdit) return;

    const fetchScopeData = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/scopes/${id}`);
        if (!res.ok) {
          throw new Error(`Scope #${id} not found`);
        }
        const found = await res.json();

        setFormData({
          name: found.name || '',
          subnet: found.subnet,
          netmask: found.netmask || '255.255.255.0',
          disabled: Boolean(found.disabled),
          rangeStart: found.rangeStart || '',
          rangeEnd: found.rangeEnd || '',
          routers: found.routers || '',
          domainNameServers: found.domainNameServers || '',
          domainName: found.domainName || '',
          defaultLeaseTime: found.defaultLeaseTime || 86400,
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
        navigate('/scopes');
      } finally {
        setLoading(false);
      }
    };

    fetchScopeData();
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const addCustomOption = (preset = null) => {
    if (preset) {
      setCustomOptions([
        ...customOptions,
        { type: preset, customName: '', value: '' },
      ]);
    } else {
      setCustomOptions([
        ...customOptions,
        { type: 'ntp-servers', customName: '', value: '' },
      ]);
    }
  };

  const removeCustomOption = (index) => {
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
        const res = await apiFetch(`/api/scopes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setNotification({ type: 'success', message: `Scope ${formData.subnet} updated successfully` });
      } else {
        const res = await apiFetch('/api/scopes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setNotification({ type: 'success', message: `Scope ${formData.subnet} created successfully` });
      }
      navigate('/scopes');
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
          Loading Scope Details...
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-7xl mx-auto space-y-6">
      {/* Header (No Left Arrow, clean Breadcrumb + Action buttons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {isEdit ? `Edit Scope ${formData.subnet || '#' + id}` : 'Create New Scope'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            {isEdit
              ? 'Modify address pool range, routing options, and specialized DHCP parameters'
              : 'Define a new network segment and configure dynamic IP address allocation'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            className="btn btn-secondary text-xs sm:text-sm"
            onClick={() => navigate('/scopes')}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary text-xs sm:text-sm shadow-glow-indigo"
            onClick={handleSubmit}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Scope'}
          </button>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Network & Address Pool */}
        <div className="glass-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <Network size={20} className="text-indigo-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                1. Network Identification & IP Range
              </h2>
            </div>

            {/* Scope Disable / Enable Toggle Switch */}
            <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Scope Status:
              </span>
              <div
                onClick={() => setFormData(p => ({ ...p, disabled: !p.disabled }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  !formData.disabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/20'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    !formData.disabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
              <span className={`text-xs font-bold ${!formData.disabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                {!formData.disabled ? 'Active (Enabled)' : 'Disabled'}
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="form-group mb-0 sm:col-span-2">
              <label className="form-label">Scope Name *</label>
              <input
                type="text"
                className="input-text"
                placeholder="Office LAN"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                maxLength={64}
                required
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Friendly label to identify this scope
              </span>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Scope Network IP *</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.0"
                value={formData.subnet}
                onChange={(e) => setFormData({ ...formData, subnet: e.target.value })}
                required
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                The network IP address identifying this scope
              </span>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Subnet Mask *</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="255.255.255.0"
                value={formData.netmask}
                onChange={(e) => setFormData({ ...formData, netmask: e.target.value })}
                required
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Specifies the network prefix (e.g. 255.255.255.0 for /24)
              </span>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">DHCP Pool Range Start</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.100"
                value={formData.rangeStart}
                onChange={(e) => setFormData({ ...formData, rangeStart: e.target.value })}
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                First IP address in the dynamic leasing pool
              </span>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">DHCP Pool Range End</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.200"
                value={formData.rangeEnd}
                onChange={(e) => setFormData({ ...formData, rangeEnd: e.target.value })}
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Last IP address in the dynamic leasing pool
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Gateway, DNS & Timing Parameters */}
        <div className="glass-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <Globe size={20} className="text-cyan-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              2. Gateway & Standard Network Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="form-group mb-0">
              <label className="form-label">Default Gateway (Routers)</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.1"
                value={formData.routers}
                onChange={(e) => setFormData({ ...formData, routers: e.target.value })}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label">DNS Name Servers</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="8.8.8.8, 1.1.1.1"
                value={formData.domainNameServers}
                onChange={(e) => setFormData({ ...formData, domainNameServers: e.target.value })}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Domain Name</label>
              <input
                type="text"
                className="input-text"
                placeholder="corp.internal"
                value={formData.domainName}
                onChange={(e) => setFormData({ ...formData, domainName: e.target.value })}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Default Lease Time (seconds)</label>
              <input
                type="number"
                className="input-text"
                placeholder="86400 (1 day)"
                value={formData.defaultLeaseTime}
                onChange={(e) => setFormData({ ...formData, defaultLeaseTime: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Specialized & Additional DHCP Options */}
        <div className="glass-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal size={20} className="text-indigo-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  3. Additional DHCP Options
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure PXE boot directives, NTP servers, MTU sizes, and vendor custom options
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary text-xs self-start sm:self-auto"
              onClick={() => addCustomOption()}
            >
              <Plus size={14} /> Add Option
            </button>
          </div>

          {/* Quick-add preset badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
              Quick Suggestions:
            </span>
            {['ntp-servers', 'bootfile-name', 'next-server', 'interface-mtu', 'domain-search', 'wpad'].map((preset) => (
              <button
                key={preset}
                type="button"
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300 border border-slate-200 dark:border-white/10 transition-colors"
                onClick={() => addCustomOption(preset)}
              >
                + {preset}
              </button>
            ))}
          </div>

          {/* Option rows list */}
          {customOptions.length > 0 ? (
            <div className="space-y-3 pt-2">
              {customOptions.map((opt, index) => {
                const isCustom = opt.type === 'custom';
                return (
                  <div
                    key={index}
                    className="inner-panel flex flex-col md:flex-row items-stretch md:items-center gap-3 p-3.5 transition-all"
                  >
                    {/* Option Selector */}
                    <div className="w-full md:w-5/12">
                      <select
                        className="select-input text-xs sm:text-sm py-2"
                        value={opt.type}
                        onChange={(e) => handleOptionTypeChange(index, e.target.value)}
                      >
                        {PREDEFINED_DHCP_OPTIONS.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Custom Option Name Input (shown if 'custom' is selected) */}
                    {isCustom && (
                      <div className="w-full md:w-3/12">
                        <input
                          type="text"
                          className="input-text text-xs sm:text-sm py-2 font-mono"
                          placeholder="option-name"
                          value={opt.customName}
                          onChange={(e) => handleOptionFieldChange(index, 'customName', e.target.value)}
                          required
                        />
                      </div>
                    )}

                    {/* Option Value Input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        className="input-text text-xs sm:text-sm py-2 font-mono"
                        placeholder={`e.g. ${getOptionExample(opt.type)}`}
                        value={opt.value}
                        onChange={(e) => handleOptionFieldChange(index, 'value', e.target.value)}
                        required
                      />
                    </div>

                    {/* Remove Option Button */}
                    <button
                      type="button"
                      className="btn-icon text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0 self-end md:self-center"
                      onClick={() => removeCustomOption(index)}
                      title="Remove option"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
              No additional DHCP options configured. Click "+ Add Option" or select a quick suggestion above.
            </div>
          )}
        </div>

        {/* Footer Submit Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn btn-secondary text-sm"
            onClick={() => navigate('/scopes')}
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
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Scope'}
          </button>
        </div>
      </form>
    </div>
  );
}
