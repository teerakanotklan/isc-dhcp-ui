import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wifi,
  Search,
  RefreshCw,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export function Leases({ setNotification }) {
  const { apiFetch } = useAuth();
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

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

  // Handle auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLeases, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, statusFilter, search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLeases();
  };

  const handleRelease = async (ip) => {
    if (!confirm(`Are you sure you want to release the active lease for ${ip}?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/leases/${ip}/release`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: 'success', message: data.message });
      fetchLeases();
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
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
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            DHCP IP Leases
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Live records of active IP assignments granted to network client devices
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${autoRefresh ? 'btn-cyan' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
            title="Auto refresh every 10 seconds"
          >
            <Clock size={16} />
            {autoRefresh ? 'Auto (10s): ON' : 'Auto-Refresh'}
          </button>
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} />
            Export CSV
          </button>
          <button className="btn btn-secondary" onClick={fetchLeases}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Status Tabs */}
          <div className="segmented-tabs">
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
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1, maxWidth: 380 }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type="text"
                className="input-text"
                style={{ paddingLeft: 38 }}
                placeholder="Search IP, MAC, hostname..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search
                size={17}
                style={{
                  position: 'absolute',
                  left: 13,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Leases Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Assigned IP</th>
                <th>Hardware MAC</th>
                <th>Client Hostname</th>
                <th>Status</th>
                <th>Valid Until (UTC)</th>
                <th>Time Left</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {leases.map((l) => (
                <tr key={l.ip}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Wifi size={16} color="var(--accent-cyan)" />
                      <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {l.ip}
                      </span>
                    </div>
                  </td>

                  <td>
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {l.mac || 'N/A'}
                    </span>
                  </td>

                  <td>
                    {l.hostname ? (
                      <span style={{ fontWeight: 600 }}>{l.hostname}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
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
                      <span style={{ textTransform: 'capitalize' }}>{l.status}</span>
                    </span>
                  </td>

                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {l.ends ? new Date(l.ends).toLocaleString() : 'N/A'}
                  </td>

                  <td>
                    {l.status === 'active' ? (
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          color: l.remainingSeconds < 3600 ? 'var(--status-warning)' : 'var(--text-secondary)',
                        }}
                      >
                        {formatRemainingTime(l.remainingSeconds)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    {l.status === 'active' && (
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        onClick={() => handleRelease(l.ip)}
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
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    No lease records matching the current criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
