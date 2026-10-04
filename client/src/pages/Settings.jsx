import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { SERVICE_ACTION_META } from '../components/serviceActionMeta';
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
  AlertTriangle
} from 'lucide-react';

export function Settings({ setNotification }) {
  const { user, apiFetch } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

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

  useEffect(() => {
    fetchStatus();
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

  return (
    <div className="page-wrapper max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            System Settings & Service Maintenance
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Manage daemon lifecycle operations, review environment parameters, and inspect system paths
          </p>
        </div>

        <button
          className="btn btn-secondary text-xs sm:text-sm self-start sm:self-auto"
          onClick={fetchStatus}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh Status
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
                {status?.isMock && (
                  <span className="badge badge-info">Simulation Mock</span>
                )}
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

      {/* Section 2: Environment & Path Information */}
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
                {status?.isMock ? 'server/data/dhcpd.conf (Local Mock)' : '/etc/dhcp/dhcpd.conf'}
              </span>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/80 dark:border-white/10">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Lease Database Location
              </span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all font-medium">
                {status?.isMock ? 'server/data/dhcpd.leases (Local Mock)' : '/var/lib/dhcp/dhcpd.leases'}
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

        {/* Section 3: Operator & Account Details */}
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
