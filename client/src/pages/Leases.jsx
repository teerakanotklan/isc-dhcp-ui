import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/ConfirmModal';
import {
  Wifi,
  Search,
  RefreshCw,
  Download,
  Clock,
  RotateCcw
} from 'lucide-react';

export function Leases({ setNotification }) {
  const { apiFetch } = useAuth();
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [releaseTarget, setReleaseTarget] = useState(null);
  const [releasing, setReleasing] = useState(false);

  const fetchLeases = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (statusFilter !== 'all') query.append('status', statusFilter);
      if (search) query.append('search', search);

      const res = await apiFetch(`/api/leases?${query.toString()}`);
      const data = await res.json();
      setLeases(data.leases || []);
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeases();
  }, [statusFilter]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLeases, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, statusFilter, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeases();
  };

  const confirmRelease = async () => {
    if (!releaseTarget) return;
    const ip = releaseTarget;

    try {
      setReleasing(true);
      const res = await apiFetch(`/api/leases/${ip}/release`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: 'success', message: data.message });
      fetchLeases();
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setReleasing(false);
      setReleaseTarget(null);
    }
  };

  const exportCSV = () => {
    if (leases.length === 0) return;

    const headers = ['IP Address', 'MAC Address', 'Hostname', 'Status', 'Binding State', 'Starts At (UTC)', 'Ends At (UTC)'];
    const rows = leases.map(l => [
      l.ip,
      l.mac || '',
      `"${l.hostname || ''}"`,
      l.status,
      l.bindingState,
      l.starts || '',
      l.ends || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `dhcp_leases_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRemainingTime = (seconds) => {
    if (!seconds || seconds <= 0) return 'Expired';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="page-wrapper space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            DHCP IP Leases
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Live records of active IP assignments granted to network client devices
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            className={`btn text-xs sm:text-sm ${autoRefresh ? 'btn-cyan' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Auto refresh every 10 seconds"
          >
            <Clock size={15} />
            {autoRefresh ? 'Auto (10s): ON' : 'Auto-Refresh'}
          </button>
          <button className="btn btn-secondary text-xs sm:text-sm" onClick={exportCSV}>
            <Download size={15} />
            Export CSV
          </button>
          <button className="btn btn-secondary text-xs sm:text-sm" onClick={fetchLeases}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5">
        {/* Status Tabs */}
        <div className="segmented-tabs overflow-x-auto self-start md:self-auto">
          {['all', 'active', 'free', 'expired'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`segmented-tab-btn ${statusFilter === st ? 'active' : ''}`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <input
              type="text"
              className="input-text pl-10 text-xs sm:text-sm"
              placeholder="Search IP, MAC, hostname..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
          </div>
          <button type="submit" className="btn btn-secondary text-xs sm:text-sm shrink-0">
            Search
          </button>
        </form>
      </div>

      {/* Leases Table */}
      <div className="glass-card p-0 overflow-hidden">
        <div className="table-container border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Assigned IP</th>
                <th>Hardware MAC</th>
                <th>Client Hostname</th>
                <th>Status</th>
                <th>Valid Until (UTC)</th>
                <th>Time Left</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.ip}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <Wifi size={15} className="text-cyan-500 shrink-0" />
                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                        {l.ip}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span className="font-mono text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
                      {l.mac || 'N/A'}
                    </span>
                  </td>

                  <td className="font-medium text-slate-800 dark:text-slate-200">
                    {l.hostname ? l.hostname : <span className="text-slate-400 italic font-normal">—</span>}
                  </td>

                  <td>
                    <span
                      className={`badge ${
                        l.status === 'active'
                          ? 'badge-active'
                          : l.status === 'expired'
                          ? 'badge-warning'
                          : 'badge-info'
                      }`}
                    >
                      {l.status === 'active' && <span className="pulse-dot" />}
                      <span className="capitalize">{l.status}</span>
                    </span>
                  </td>

                  <td className="text-xs text-slate-500 dark:text-slate-400">
                    {l.ends ? new Date(l.ends).toLocaleString() : 'N/A'}
                  </td>

                  <td>
                    {l.status === 'active' ? (
                      <span
                        className={`text-xs font-semibold ${
                          l.remainingSeconds < 3600
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {formatRemainingTime(l.remainingSeconds)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  <td className="text-right">
                    {l.status === 'active' && (
                      <button
                        className="btn btn-secondary text-xs py-1 px-2.5"
                        onClick={() => setReleaseTarget(l.ip)}
                        title="Release this lease and mark as free"
                      >
                        <RotateCcw size={12} />
                        Release
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {leases.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500 dark:text-slate-400">
                    No lease records matching the current criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(releaseTarget)}
        onClose={() => setReleaseTarget(null)}
        onConfirm={confirmRelease}
        variant="danger"
        icon={RotateCcw}
        title="Release Lease"
        message={`Release the active lease for ${releaseTarget}? The client will lose this address and must request a new one.`}
        confirmText="Release Lease"
        loadingText="Releasing..."
        loading={releasing}
      />
    </div>
  );
}
