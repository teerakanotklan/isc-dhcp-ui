import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Terminal,
  RefreshCw,
  Search,
  Clock
} from 'lucide-react';

export function ServiceLogs({ setNotification }) {
  const { apiFetch } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/service/logs?limit=150');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 6000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

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
            Logs
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor live isc-dhcp-server journalctl daemon transaction logs
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
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
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
