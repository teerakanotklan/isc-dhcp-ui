import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Network,
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Sliders,
  Globe,
  SlidersHorizontal
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
  const { id } = useParams();
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
      <div className="page-wrapper text-center py-24">
        <div className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          Loading Subnet Details...
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              className="btn-icon mt-1 sm:mt-0"
              onClick={() => navigate('/subnets')}
              title="Back to Subnets"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {isEdit ? `Edit Subnet ${id}` : 'Create New Subnet'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                {isEdit
                  ? 'Modify address pool range, routing options, and specialized DHCP parameters'
                  : 'Define a new network segment and configure dynamic IP address allocation'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              className="btn btn-secondary text-xs sm:text-sm"
              onClick={() => navigate('/subnets')}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary text-xs sm:text-sm"
              onClick={handleSubmit}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Subnet'}
            </button>
          </div>
        </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Network & Address Pool */}
        <div className="glass-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <Network size={20} className="text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              1. Network Identification & IP Range
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="form-group mb-0">
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
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Base network address of the subnet (e.g. 192.168.1.0)
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
                Subnet mask in dotted decimal format (e.g. 255.255.255.0)
              </span>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Dynamic Pool Range Start IP</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.100"
                value={formData.rangeStart}
                onChange={(e) => setFormData({ ...formData, rangeStart: e.target.value })}
              />
            </div>

            <div className="form-group mb-0">
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
        <div className="glass-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <Globe size={20} className="text-cyan-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              2. Gateway, DNS & Lease Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="form-group mb-0">
              <label className="form-label">Default Gateway (option routers)</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.1"
                value={formData.routers}
                onChange={(e) => setFormData({ ...formData, routers: e.target.value })}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Broadcast Address</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="192.168.1.255"
                value={formData.broadcastAddress}
                onChange={(e) => setFormData({ ...formData, broadcastAddress: e.target.value })}
              />
            </div>

            <div className="form-group mb-0 sm:col-span-2">
              <label className="form-label">DNS Name Servers (comma separated)</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="1.1.1.1, 8.8.8.8"
                value={formData.domainNameServers}
                onChange={(e) => setFormData({ ...formData, domainNameServers: e.target.value })}
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                DNS server IPs pushed to client devices
              </span>
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
                className="input-text font-mono"
                placeholder="86400"
                value={formData.defaultLeaseTime}
                onChange={(e) => setFormData({ ...formData, defaultLeaseTime: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Additional DHCP Options */}
        <div className="glass-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <div className="flex items-center gap-2.5">
              <Sliders size={20} className="text-cyan-500" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  3. Additional DHCP Options
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure advanced options like NTP, PXE boot, WINS, or custom vendor parameters
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary text-xs self-start sm:self-auto"
              onClick={handleAddOption}
            >
              <Plus size={14} /> Add DHCP Option
            </button>
          </div>

          {customOptions.length === 0 ? (
            <div className="inner-panel text-center py-10 text-slate-500 dark:text-slate-400 space-y-2">
              <SlidersHorizontal size={28} className="mx-auto opacity-40 text-slate-400" />
              <div className="text-xs sm:text-sm">No additional DHCP options specified for this subnet.</div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Click <strong>+ Add DHCP Option</strong> to configure NTP, PXE boot, MTU, WPAD, or custom parameters.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {customOptions.map((opt, idx) => (
                <div
                  key={idx}
                  className="inner-panel flex flex-col sm:flex-row items-stretch sm:items-start gap-3 p-3.5"
                >
                  {/* Select Option */}
                  <div className="flex-1 min-w-[200px] space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
                      Option Identifier
                    </label>
                    <select
                      className="select-input font-mono text-xs sm:text-sm py-2"
                      value={opt.type}
                      onChange={(e) => handleOptionTypeChange(idx, e.target.value)}
                    >
                      {PREDEFINED_DHCP_OPTIONS.map((p) => (
                        <option key={p.value} value={p.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                          {p.label}
                        </option>
                      ))}
                    </select>

                    {opt.type === 'custom' && (
                      <input
                        type="text"
                        className="input-text font-mono text-xs sm:text-sm py-1.5 mt-2"
                        placeholder="Enter custom option name..."
                        value={opt.customName}
                        onChange={(e) => handleOptionFieldChange(idx, 'customName', e.target.value)}
                        required
                      />
                    )}
                  </div>

                  {/* Value Input */}
                  <div className="flex-[2] min-w-[220px] space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block">
                      Option Value / Parameter
                    </label>
                    <input
                      type="text"
                      className="input-text font-mono text-xs sm:text-sm py-2"
                      placeholder={`Example: ${getOptionExample(opt.type)}`}
                      value={opt.value}
                      onChange={(e) => handleOptionFieldChange(idx, 'value', e.target.value)}
                      required
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="flex sm:flex-col justify-end pt-1 sm:pt-6">
                    <button
                      type="button"
                      className="btn-icon text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2"
                      onClick={() => handleRemoveOption(idx)}
                      title="Remove Option"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="btn btn-secondary text-sm"
            onClick={() => navigate('/subnets')}
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
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Subnet'}
          </button>
        </div>
      </form>
    </div>
  );
}
