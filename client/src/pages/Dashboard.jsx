import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MetricCard } from '../components/MetricCard';
import {
  Network,
  Users,
  HardDrive,
  BookmarkCheck,
  RefreshCw,
  Power,
  RotateCw,
  Clock,
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export function Dashboard({ setNotification }) {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      if (setNotification) {
        setNotification({ type: 'danger', message: err.message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleServiceAction = async (action) => {
    if (!confirm(`Are you sure you want to ${action} the isc-dhcp-server service?`)) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await apiFetch('/api/service/control', {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setNotification({ type: 'success', message: result.message });
      fetchDashboardData();
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="page-wrapper" style={{ textAlign: 'center', padding: '100px 0' }}>
        <RefreshCw className="pulse-dot" size={32} style={{ margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-secondary)' }}>Loading Dashboard Overview...</div>
      </div>
    );
  }

  const counts = data?.counts || {};
  const service = data?.service || {};

  return (
    <div className="page-wrapper">
      {/* Page Title & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            DHCP Server Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Real-time status, address pool utilization, and lease statistics
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchDashboardData} disabled={actionLoading}>
            <RefreshCw size={16} className={actionLoading ? 'pulse-dot' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Service Status & Quick Control Card */}
      <div
        className="glass-card service-status-card"
        style={{
          marginBottom: 28,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 'var(--radius-md)',
              background: service.active ? 'var(--status-active-bg)' : 'var(--status-danger-bg)',
              color: service.active ? 'var(--status-active)' : 'var(--status-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${service.active ? 'var(--status-active-border)' : 'var(--status-danger-border)'}`,
            }}
          >
            {service.active ? <Activity size={26} /> : <AlertCircle size={26} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>isc-dhcp-server</span>
              <span className={`badge ${service.active ? 'badge-active' : 'badge-danger'}`}>
                <span className="pulse-dot" />
                {service.active ? 'Active (Running)' : 'Stopped'}
              </span>
              {service.isMock && (
                <span className="badge badge-info">Mock Mode (Simulated)</span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
              {service.pid && <span>PID: <strong style={{ color: 'var(--text-primary)' }}>{service.pid}</strong></span>}
              {service.since && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} /> Uptime: {new Date(service.since).toLocaleTimeString()} ({new Date(service.since).toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Service Control Buttons */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleServiceAction('restart')}
            disabled={actionLoading}
            title="Restart the DHCP daemon"
          >
            <RotateCw size={15} color="var(--accent-cyan)" />
            Restart Service
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleServiceAction('reload')}
            disabled={actionLoading || !service.active}
            title="Reload configuration without dropping active connections"
          >
            <RefreshCw size={15} color="var(--status-warning)" />
            Reload Config
          </button>
          {service.active ? (
            <button
              className="btn btn-danger"
              onClick={() => handleServiceAction('stop')}
              disabled={actionLoading}
            >
              <Power size={15} />
              Stop
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => handleServiceAction('start')}
              disabled={actionLoading}
            >
              <Power size={15} />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Top Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 20,
          marginBottom: 32,
        }}
      >
        <MetricCard
          title="Total Subnets"
          value={counts.subnets || 0}
          subtext="Configured address spaces"
          icon={Network}
          color="indigo"
        />

        <MetricCard
          title="Pool IP Capacity"
          value={counts.totalCapacity || 0}
          subtext="Total assignable dynamic IPs"
          icon={HardDrive}
          color="cyan"
        />

        <MetricCard
          title="Active Dynamic Leases"
          value={counts.activeLeases || 0}
          subtext={`${counts.utilizationPercentage || 0}% overall pool utilization`}
          progress={counts.utilizationPercentage || 0}
          icon={Users}
          color="emerald"
        />

        <MetricCard
          title="Static IP Reservations"
          value={counts.staticHosts || 0}
          subtext="Fixed host MAC bindings"
          icon={BookmarkCheck}
          color="amber"
        />
      </div>

      {/* Subnet Utilization Progress Cards */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Subnet Pool Utilization</h2>
          <button
            className="btn-icon"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            onClick={() => navigate('/subnets')}
          >
            Manage Subnets →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {data?.subnetStats?.map((s) => (
            <div key={s.subnet} className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{s.subnet}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Netmask: {s.netmask}</div>
                </div>
                <span
                  className={`badge ${
                    s.utilization > 85 ? 'badge-danger' : s.utilization > 60 ? 'badge-warning' : 'badge-active'
                  }`}
                >
                  {s.utilization}% Used
                </span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Range: {s.range}</span>
                  <span style={{ fontWeight: 600 }}>
                    {s.activeLeases} / {s.capacity} IPs
                  </span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${s.utilization}%`,
                      background:
                        s.utilization > 85
                          ? 'var(--status-danger)'
                          : s.utilization > 60
                          ? 'var(--status-warning)'
                          : 'linear-gradient(90deg, #6366f1, #06b6d4)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                <span>Available: {Math.max(0, s.capacity - s.activeLeases)} IPs</span>
                <span>Active: {s.activeLeases} Clients</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Leases Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 2 }}>Recent Lease Activity</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Latest DHCP leases granted to client devices
            </p>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate('/leases')}>
            View All Leases ({counts.activeLeases || 0}) →
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>MAC Address</th>
                <th>Hostname</th>
                <th>Status</th>
                <th>Ends At (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentLeases?.length > 0 ? (
                data.recentLeases.map((l) => (
                  <tr key={l.ip}>
                    <td className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {l.ip}
                    </td>
                    <td className="font-mono">{l.mac || 'N/A'}</td>
                    <td>{l.hostname || <span style={{ color: 'var(--text-muted)' }}>Unknown</span>}</td>
                    <td>
                      <span className={`badge ${l.status === 'active' ? 'badge-active' : 'badge-warning'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {l.ends ? new Date(l.ends).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No lease records found
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
