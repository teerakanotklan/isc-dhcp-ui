import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { SERVICE_ACTION_META } from '../constants/serviceActionMeta';
import {
  Settings as SettingsIcon,
  RotateCw,
  RefreshCw,
  Power,
  Activity,
  Server,
  FileCode,
  HardDrive,
  Shield,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Network,
  Save,
  Sliders,
  Globe,
  FileText
} from 'lucide-react';

export function Settings({ setNotification }) {
  const { user, apiFetch } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  // Global Settings state
  const [settings, setSettings] = useState({
    defaultLeaseTime: 86400,
    maxLeaseTime: 604800,
    authoritative: true,
    ddnsUpdateStyle: 'none',
    logFacility: 'local7',
    domainName: '',
    domainNameServers: '',
    interfacesv4: 'eth0',
    interfacesv6: '',
    systemInterfaces: ['eth0', 'eth1'],
    confPath: '/etc/dhcp/dhcpd.conf',
    interfacesPath: '/etc/default/isc-dhcp-server'
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/service/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setSettingsLoading(true);
      const res = await apiFetch('/api/service/settings');
      const data = await res.json();
      setSettings(data);
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchSettings();
  }, []);

  const handleAction = (action) => setPendingAction(action);

  const runAction = async () => {
    const action = pendingAction;
    if (!action) return;

    try {
      setActionLoading(true);
      const res = await apiFetch('/api/service/control', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: 'success', message: data.message });
      fetchStatus();
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await apiFetch('/api/service/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSettings(data);
      setNotification({
        type: 'success',
        message: 'ISC DHCP Server settings updated successfully. Restart service to apply changes.',
      });
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleInterfaceV4 = (ifaceName) => {
    const currentList = (settings.interfacesv4 || '').split(/\s+/).filter(Boolean);
    let newList;
    if (currentList.includes(ifaceName)) {
      newList = currentList.filter((i) => i !== ifaceName);
    } else {
      newList = [...currentList, ifaceName];
    }
    setSettings((prev) => ({ ...prev, interfacesv4: newList.join(' ') }));
  };

  return (
    <div className="page-wrapper max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            System Settings & Service Maintenance
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Configure listen interfaces, global lease policies, and manage daemon lifecycle operations
          </p>
        </div>

        <button
          className="btn btn-secondary text-xs sm:text-sm self-start sm:self-auto"
          onClick={() => {
            fetchStatus();
            fetchSettings();
          }}
          disabled={loading || settingsLoading}
        >
          <RefreshCw size={15} className={loading || settingsLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Section 1: Service Operations (Featuring Restart Service) */}
      <div className="glass-card space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/10">
          <Activity size={20} className="text-cyan-500" />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Service Operations & Maintenance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Control the isc-dhcp-server daemon process and reload active network configurations
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-4 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-colors ${
                status?.active
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              <Server size={24} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <span className="font-mono font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  isc-dhcp-server.service
                </span>
                <span className={`badge ${status?.active ? 'badge-active' : 'badge-danger'}`}>
                  <span className="pulse-dot" />
                  {status?.active ? 'Active (Running)' : 'Stopped'}
                </span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-4 flex-wrap">
                {status?.pid && (
                  <span>Main PID: <strong className="font-mono text-slate-700 dark:text-slate-300">{status.pid}</strong></span>
                )}
                {status?.since && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Uptime: {new Date(status.since).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons (Restart, Reload, Stop/Start) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="btn btn-primary text-xs sm:text-sm shadow-glow-indigo"
              onClick={() => handleAction('restart')}
              disabled={actionLoading}
              title="Restart daemon"
            >
              <RotateCw size={15} className={actionLoading ? 'animate-spin' : ''} />
              Restart Service
            </button>
            <button
              className="btn btn-secondary text-xs sm:text-sm"
              onClick={() => handleAction('reload')}
              disabled={actionLoading || !status?.active}
              title="Reload configuration"
            >
              <RefreshCw size={15} className="text-amber-500" />
              Reload Config
            </button>
            {status?.active ? (
              <button
                className="btn btn-danger text-xs sm:text-sm"
                onClick={() => handleAction('stop')}
                disabled={actionLoading}
              >
                <Power size={15} />
                Stop
              </button>
            ) : (
              <button
                className="btn btn-secondary text-xs sm:text-sm"
                onClick={() => handleAction('start')}
                disabled={actionLoading}
              >
                <Power size={15} className="text-emerald-500" />
                Start
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: ISC DHCP Server Configuration & Listen Interfaces */}
      <form onSubmit={handleSaveSettings} className="glass-card space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <Sliders size={20} className="text-indigo-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                ISC DHCP Server Global Configuration & Listen Interfaces
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage listening network interfaces (/etc/default/isc-dhcp-server) and global directives (dhcpd.conf)
              </p>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary text-xs sm:text-sm shadow-glow-indigo"
            disabled={savingSettings || settingsLoading}
          >
            <Save size={16} />
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* 1. Network Interfaces Configuration */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Network size={16} className="text-cyan-500" />
            Listen Network Interfaces (INTERFACESv4 / INTERFACESv6)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">IPv4 Listen Interface (INTERFACESv4) *</label>
              <select
                className="input-text font-mono cursor-pointer"
                value={settings.interfacesv4 || ''}
                onChange={(e) => setSettings({ ...settings, interfacesv4: e.target.value })}
              >
                <option value="">-- Select Network Interface --</option>
                {Array.from(
                  new Set([
                    ...(settings.systemInterfaces || []),
                    ...(settings.interfacesv4 ? settings.interfacesv4.split(/\s+/) : [])
                  ])
                )
                  .filter(Boolean)
                  .map((iface) => (
                    <option key={iface} value={iface}>
                      {iface}
                    </option>
                  ))}
              </select>

              {/* Quick-Select Badges for multi-interface toggle */}
              {settings.systemInterfaces && settings.systemInterfaces.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  <span className="text-[11px] text-slate-400">Toggle Multi-Adapters:</span>
                  {settings.systemInterfaces.map((iface) => {
                    const isSelected = (settings.interfacesv4 || '').split(/\s+/).includes(iface);
                    return (
                      <button
                        key={iface}
                        type="button"
                        onClick={() => toggleInterfaceV4(iface)}
                        className={`px-2 py-0.5 rounded text-xs font-mono border transition-all ${
                          isSelected
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'bg-slate-100 dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {isSelected ? `✓ ${iface}` : `+ ${iface}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="form-group mb-0">
              <label className="form-label">IPv6 Listen Interface (INTERFACESv6)</label>
              <select
                className="input-text font-mono cursor-pointer"
                value={settings.interfacesv6 || ''}
                onChange={(e) => setSettings({ ...settings, interfacesv6: e.target.value })}
              >
                <option value="">Disabled / None</option>
                {Array.from(
                  new Set([
                    ...(settings.systemInterfaces || []),
                    ...(settings.interfacesv6 ? settings.interfacesv6.split(/\s+/) : [])
                  ])
                )
                  .filter(Boolean)
                  .map((iface) => (
                    <option key={iface} value={iface}>
                      {iface}
                    </option>
                  ))}
              </select>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Written to /etc/default/isc-dhcp-server
              </span>
            </div>
          </div>
        </div>

        {/* 2. Global Lease Times & Authority */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock size={16} className="text-indigo-500" />
            Lease Policy & Server Authority
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Default Lease Time */}
            <div className="form-group mb-0">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Default Lease Time (sec)</label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    className="text-cyan-600 dark:text-cyan-400 hover:underline"
                    onClick={() => setSettings({ ...settings, defaultLeaseTime: 43200 })}
                  >
                    12h
                  </button>
                  <button
                    type="button"
                    className="text-cyan-600 dark:text-cyan-400 hover:underline"
                    onClick={() => setSettings({ ...settings, defaultLeaseTime: 86400 })}
                  >
                    24h
                  </button>
                  <button
                    type="button"
                    className="text-cyan-600 dark:text-cyan-400 hover:underline"
                    onClick={() => setSettings({ ...settings, defaultLeaseTime: 604800 })}
                  >
                    7d
                  </button>
                </div>
              </div>
              <input
                type="number"
                className="input-text font-mono"
                value={settings.defaultLeaseTime || 86400}
                onChange={(e) => setSettings({ ...settings, defaultLeaseTime: parseInt(e.target.value, 10) || 0 })}
                required
              />
            </div>

            {/* Max Lease Time */}
            <div className="form-group mb-0">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label mb-0">Max Lease Time (sec)</label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    className="text-cyan-600 dark:text-cyan-400 hover:underline"
                    onClick={() => setSettings({ ...settings, maxLeaseTime: 86400 })}
                  >
                    24h
                  </button>
                  <button
                    type="button"
                    className="text-cyan-600 dark:text-cyan-400 hover:underline"
                    onClick={() => setSettings({ ...settings, maxLeaseTime: 604800 })}
                  >
                    7d
                  </button>
                  <button
                    type="button"
                    className="text-cyan-600 dark:text-cyan-400 hover:underline"
                    onClick={() => setSettings({ ...settings, maxLeaseTime: 2592000 })}
                  >
                    30d
                  </button>
                </div>
              </div>
              <input
                type="number"
                className="input-text font-mono"
                value={settings.maxLeaseTime || 604800}
                onChange={(e) => setSettings({ ...settings, maxLeaseTime: parseInt(e.target.value, 10) || 0 })}
                required
              />
            </div>

            {/* Authoritative Toggle */}
            <div className="form-group mb-0">
              <label className="form-label">Authoritative Server</label>
              <div className="flex items-center gap-3 pt-1.5">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={Boolean(settings.authoritative)}
                    onChange={(e) => setSettings({ ...settings, authoritative: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {settings.authoritative ? 'Authoritative (Active)' : 'Not Authoritative'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. DDNS, Syslog & Global Network Options */}
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe size={16} className="text-emerald-500" />
            Global Network Options & Logging
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">DDNS Update Style</label>
              <select
                className="input-text cursor-pointer"
                value={settings.ddnsUpdateStyle || 'none'}
                onChange={(e) => setSettings({ ...settings, ddnsUpdateStyle: e.target.value })}
              >
                <option value="none">none (Disabled)</option>
                <option value="interim">interim</option>
                <option value="standard">standard</option>
              </select>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Syslog Facility</label>
              <select
                className="input-text cursor-pointer"
                value={settings.logFacility || 'local7'}
                onChange={(e) => setSettings({ ...settings, logFacility: e.target.value })}
              >
                <option value="local7">local7 (Default)</option>
                <option value="daemon">daemon</option>
                <option value="local0">local0</option>
                <option value="local1">local1</option>
                <option value="local2">local2</option>
                <option value="local3">local3</option>
                <option value="local4">local4</option>
                <option value="local5">local5</option>
                <option value="local6">local6</option>
              </select>
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Global Domain Name</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="e.g. example.com"
                value={settings.domainName || ''}
                onChange={(e) => setSettings({ ...settings, domainName: e.target.value })}
              />
            </div>

            <div className="form-group mb-0">
              <label className="form-label">Global DNS Resolvers</label>
              <input
                type="text"
                className="input-text font-mono"
                placeholder="e.g. 8.8.8.8, 8.8.4.4"
                value={settings.domainNameServers || ''}
                onChange={(e) => setSettings({ ...settings, domainNameServers: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-white/10">
          <button
            type="submit"
            className="btn btn-primary text-sm shadow-glow-indigo"
            disabled={savingSettings || settingsLoading}
          >
            <Save size={16} />
            {savingSettings ? 'Saving Settings...' : 'Save Server Configuration'}
          </button>
        </div>
      </form>

      {/* Section 3: Environment & Path Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <HardDrive size={18} className="text-indigo-500" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Filesystem & Configuration Paths
            </h3>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                DHCP Configuration File
              </span>
              <span className="font-mono text-cyan-600 dark:text-cyan-400 break-all font-medium">
                {settings.confPath || '/etc/dhcp/dhcpd.conf'}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Interface Configuration File
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 break-all font-medium">
                {settings.interfacesPath || '/etc/default/isc-dhcp-server'}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Systemd Service Unit
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                isc-dhcp-server.service
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Operator & Account Details */}
        <div className="glass-card space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/80 dark:border-white/10">
            <Shield size={18} className="text-emerald-500" />
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Authentication & Session Security
            </h3>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Logged in Account
              </span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {user?.username || 'admin'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Access Authorization
              </span>
              <span className="badge badge-active">
                <CheckCircle2 size={12} />
                ADMINISTRATOR
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Token Authentication
              </span>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                JWT HMAC-SHA256 (24h)
              </span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        onClose={() => setPendingAction(null)}
        onConfirm={runAction}
        loading={actionLoading}
        {...(SERVICE_ACTION_META[pendingAction] || {})}
      />
    </div>
  );
}
