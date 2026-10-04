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
  Layers
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
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Service Control & System Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Monitor systemd daemon operations and inspect live DHCP transaction logs
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${autoRefresh ? 'btn-cyan' : 'btn-secondary'}`}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Clock size={16} />
            {autoRefresh ? 'Auto (6s): ON' : 'Auto-Poll'}
          </button>
          <button className="btn btn-secondary" onClick={fetchStatusAndLogs}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Service Control Card */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-md)',
                background: status?.active ? 'var(--status-active-bg)' : 'var(--status-danger-bg)',
                color: status?.active ? 'var(--status-active)' : 'var(--status-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${status?.active ? 'var(--status-active-border)' : 'var(--status-danger-border)'}`,
              }}
            >
              <Activity size={28} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>isc-dhcp-server.service</h3>
                <span className={`badge ${status?.active ? 'badge-active' : 'badge-danger'}`}>
                  <span className="pulse-dot" />
                  {status?.active ? 'Active (Running)' : 'Inactive / Stopped'}
                </span>
                {status?.isMock && (
                  <span className="badge badge-info">Mock Environment</span>
                )}
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
                {status?.pid && <span>Main PID: <strong style={{ color: 'var(--text-primary)' }}>{status.pid}</strong></span>}
                {status?.since && <span>Uptime Since: {new Date(status.since).toLocaleString()}</span>}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleAction('restart')}
              disabled={actionLoading}
            >
              <RotateCw size={15} color="var(--accent-cyan)" />
              Restart Service
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleAction('reload')}
              disabled={actionLoading || !status?.active}
            >
              <RefreshCw size={15} color="var(--status-warning)" />
              Reload Config
            </button>
            {status?.active ? (
              <button
                className="btn btn-danger"
                onClick={() => handleAction('stop')}
                disabled={actionLoading}
              >
                <Power size={15} />
                Stop Service
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => handleAction('start')}
                disabled={actionLoading}
              >
                <Power size={15} />
                Start Service
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Logs Console Container */}
      <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-tertiary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Terminal size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>Journalctl Output Stream</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              ({filteredLogs.length} events)
            </span>
          </div>

          <div style={{ position: 'relative', width: 280 }}>
            <input
              type="text"
              className="input-text"
              style={{ padding: '6px 12px 6px 32px', fontSize: '0.82rem' }}
              placeholder="Filter logs (e.g. DHCPACK)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
          </div>
        </div>

        {/* Log Lines Area */}
        <div
          className="font-mono"
          style={{
            height: '520px',
            overflowY: 'auto',
            background: '#070a12',
            padding: '16px 20px',
            fontSize: '0.82rem',
            lineHeight: 1.6,
          }}
        >
          {filteredLogs.map((log, index) => {
            let textColor = '#cbd5e1';
            if (log.message.includes('DHCPACK')) textColor = 'var(--status-active)';
            else if (log.message.includes('DHCPOFFER')) textColor = 'var(--accent-cyan)';
            else if (log.message.includes('DHCPDISCOVER')) textColor = '#818cf8';
            else if (log.message.includes('error') || log.message.includes('Failed')) textColor = 'var(--status-danger)';

            return (
              <div key={index} style={{ display: 'flex', gap: 14, padding: '2px 0' }}>
                <span style={{ color: 'var(--text-muted)', flexShrink: 0, userSelect: 'none' }}>
                  {log.timestamp}
                </span>
                <span style={{ color: textColor }}>{log.message}</span>
              </div>
            );
          })}

          {filteredLogs.length === 0 && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>
              No log messages matching filter
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
