import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Terminal,
  RotateCw,
  Power,
  RefreshCw,
  Search,
  Activity,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ShieldCheck
} from 'lucide-react';

export function ServiceLogs({ setNotification }) {
  const { apiFetch } = useAuth();
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchStatusAndLogs = async () => {
    try {
      setLoading(true);
      const [resStatus, resLogs] = await Promise.all([
        apiFetch('/api/service/status'),
        apiFetch('/api/service/logs?limit=150'),
      ]);

      const dataStatus = await resStatus.json();
      const dataLogs = await resLogs.json();

      setStatus(dataStatus);
      setLogs(dataLogs);
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatusAndLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchStatusAndLogs, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleAction = async (action) => {
    if (!confirm(`Confirm execution of 'systemctl ${action} isc-dhcp-server'?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiFetch('/api/service/control', {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: 'success', message: data.message });
      fetchStatusAndLogs();
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) =>
    l.message.toLowerCase().includes(search.toLowerCase()) ||
    l.timestamp.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-wrapper max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Service Control & System Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor systemd daemon operations and inspect live DHCP transaction logs
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            className={`btn text-xs sm:text-sm ${autoRefresh ? 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-sm shadow-cyan-500/25' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Clock size={16} />
            {autoRefresh ? 'Auto-Poll (6s): ON' : 'Auto-Poll'}
          </button>
          <button
            className="btn btn-secondary text-xs sm:text-sm"
            onClick={fetchStatusAndLogs}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Service Control Card */}
      <div className="glass-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border transition-colors ${
                status?.active
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              <Activity size={26} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono">
                  isc-dhcp-server.service
                </h3>
                <span className={`badge ${status?.active ? 'badge-active' : 'badge-danger'}`}>
                  <span className="pulse-dot" />
                  {status?.active ? 'Active (Running)' : 'Inactive / Stopped'}
                </span>
                {status?.isMock && (
                  <span className="badge badge-info">Mock Environment</span>
                )}
              </div>

              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex items-center gap-3 sm:gap-6 flex-wrap">
                {status?.pid && (
                  <span>
                    Main PID: <strong className="font-mono text-slate-700 dark:text-slate-200">{status.pid}</strong>
                  </span>
                )}
                {status?.since && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} />
                    Uptime Since: {new Date(status.since).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-4 lg:pt-0 border-t border-slate-200/80 dark:border-white/10 lg:border-none">
            <button
              className="btn btn-secondary text-xs sm:text-sm flex-1 sm:flex-initial"
              onClick={() => handleAction('restart')}
              disabled={actionLoading}
            >
              <RotateCw size={15} className="text-cyan-500" />
              Restart
            </button>
            <button
              className="btn btn-secondary text-xs sm:text-sm flex-1 sm:flex-initial"
              onClick={() => handleAction('reload')}
              disabled={actionLoading || !status?.active}
            >
              <RefreshCw size={15} className="text-amber-500" />
              Reload
            </button>
            {status?.active ? (
              <button
                className="btn btn-danger text-xs sm:text-sm flex-1 sm:flex-initial"
                onClick={() => handleAction('stop')}
                disabled={actionLoading}
              >
                <Power size={15} />
                Stop
              </button>
            ) : (
              <button
                className="btn btn-primary text-xs sm:text-sm flex-1 sm:flex-initial"
                onClick={() => handleAction('start')}
                disabled={actionLoading}
              >
                <Power size={15} />
                Start
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs Console Container */}
      <div className="glass-card p-0 overflow-hidden flex flex-col border border-slate-200 dark:border-white/10">
        <div className="p-3.5 sm:px-5 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/70 dark:bg-white/[0.03]">
          <div className="flex items-center gap-2.5">
            <Terminal size={18} className="text-cyan-500" />
            <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
              Journalctl Output Stream
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
              {filteredLogs.length} events
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              className="input-text py-1.5 pl-8 pr-3 text-xs sm:text-sm w-full"
              placeholder="Filter logs (e.g. DHCPACK)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>

        {/* Log Lines Area */}
        <div className="font-mono h-[520px] overflow-y-auto bg-slate-950 dark:bg-[#070a12] p-4 sm:p-5 text-xs sm:text-sm leading-relaxed select-text space-y-1">
          {filteredLogs.map((log, index) => {
            let textColorClass = 'text-slate-300';
            if (log.message.includes('DHCPACK')) {
              textColorClass = 'text-emerald-400 font-medium';
            } else if (log.message.includes('DHCPOFFER')) {
              textColorClass = 'text-cyan-400 font-medium';
            } else if (log.message.includes('DHCPDISCOVER')) {
              textColorClass = 'text-indigo-400';
            } else if (log.message.includes('DHCPREQUEST')) {
              textColorClass = 'text-amber-300';
            } else if (log.message.includes('error') || log.message.includes('Failed')) {
              textColorClass = 'text-rose-400 font-semibold';
            }

            return (
              <div key={index} className="flex items-start gap-3 hover:bg-white/[0.03] py-0.5 px-1 rounded transition-colors">
                <span className="text-slate-500 flex-shrink-0 text-xs select-none">
                  {log.timestamp}
                </span>
                <span className={textColorClass}>{log.message}</span>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div className="text-slate-500 text-center py-16">
              No log messages matching filter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
