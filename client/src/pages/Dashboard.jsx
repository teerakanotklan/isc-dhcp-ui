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
      <div className="page-wrapper text-center py-24">
        <RefreshCw className="pulse-dot mx-auto mb-4 text-indigo-500" size={32} />
        <div className="text-slate-500 dark:text-slate-400 font-medium">
          Loading Dashboard Overview...
        </div>
      </div>
    );
  }

  const counts = data?.counts || {};
  const service = data?.service || {};

  return (
    <div className="page-wrapper space-y-6 sm:space-y-8">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            DHCP Server Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Real-time status, address pool utilization, and lease statistics
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            className="btn btn-secondary text-xs sm:text-sm"
            onClick={fetchDashboardData}
            disabled={actionLoading}
          >
            <RefreshCw size={15} className={actionLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Service Status & Quick Control Card */}
      <div className="glass-card service-status-card flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-5 sm:p-6">
        <div className="flex items-start sm:items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              service.active
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30'
            }`}
          >
            {service.active ? <Activity size={24} /> : <AlertCircle size={24} />}
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                isc-dhcp-server
              </span>
              <span className={`badge ${service.active ? 'badge-active' : 'badge-danger'}`}>
                <span className="pulse-dot" />
                {service.active ? 'Active (Running)' : 'Stopped'}
              </span>
              {service.isMock && (
                <span className="badge badge-info">Mock Mode (Simulated)</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {service.pid && (
                <span>
                  PID: <strong className="text-slate-800 dark:text-slate-200">{service.pid}</strong>
                </span>
              )}
              {service.since && (
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  Uptime: {new Date(service.since).toLocaleTimeString()} ({new Date(service.since).toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Service Control Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-3 lg:pt-0 border-t border-slate-200/80 dark:border-white/10 lg:border-none">
          <button
            className="btn btn-secondary text-xs sm:text-sm flex-1 sm:flex-initial"
            onClick={() => handleServiceAction('restart')}
            disabled={actionLoading}
            title="Restart the DHCP daemon"
          >
            <RotateCw size={14} className="text-cyan-500" />
            Restart
          </button>
          <button
            className="btn btn-secondary text-xs sm:text-sm flex-1 sm:flex-initial"
            onClick={() => handleServiceAction('reload')}
            disabled={actionLoading || !service.active}
            title="Reload configuration without dropping active connections"
          >
            <RefreshCw size={14} className="text-amber-500" />
            Reload
          </button>
          {service.active ? (
            <button
              className="btn btn-danger text-xs sm:text-sm flex-1 sm:flex-initial"
              onClick={() => handleServiceAction('stop')}
              disabled={actionLoading}
            >
              <Power size={14} />
              Stop
            </button>
          ) : (
            <button
              className="btn btn-primary text-xs sm:text-sm flex-1 sm:flex-initial"
              onClick={() => handleServiceAction('start')}
              disabled={actionLoading}
            >
              <Power size={14} />
              Start
            </button>
          )}
        </div>
      </div>

      {/* Top 4 Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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

      {/* Subnet Pool Utilization Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Subnet Pool Utilization
          </h2>
          <button
            className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            onClick={() => navigate('/subnets')}
          >
            Manage Subnets →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {data?.subnetStats?.map((s) => (
            <div key={s.subnet} className="glass-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="font-bold text-base text-slate-900 dark:text-white font-mono">
                      {s.subnet}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Netmask: {s.netmask}
                    </div>
                  </div>
                  <span
                    className={`badge ${
                      s.utilization > 85 ? 'badge-danger' : s.utilization > 60 ? 'badge-warning' : 'badge-active'
                    }`}
                  >
                    {s.utilization}% Used
                  </span>
                </div>

                <div className="space-y-1.5 my-3">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-mono truncate">{s.range}</span>
                    <span className="font-semibold text-slate-900 dark:text-white shrink-0 ml-2">
                      {s.activeLeases} / {s.capacity} IPs
                    </span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className={`progress-bar-fill ${
                        s.utilization > 85
                          ? 'bg-rose-500'
                          : s.utilization > 60
                          ? 'bg-amber-500'
                          : 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                      }`}
                      style={{ width: `${s.utilization}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/80 dark:border-white/10 mt-2">
                <span>Available: {Math.max(0, s.capacity - s.activeLeases)} IPs</span>
                <span>Active: {s.activeLeases} Clients</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Leases Table */}
      <div className="glass-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Recent Lease Activity
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              Latest DHCP leases granted to client devices
            </p>
          </div>
          <button
            className="btn btn-secondary text-xs sm:text-sm self-start sm:self-auto"
            onClick={() => navigate('/leases')}
          >
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
                    <td className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      {l.ip}
                    </td>
                    <td className="font-mono text-slate-600 dark:text-slate-400">
                      {l.mac || 'N/A'}
                    </td>
                    <td className="font-medium">
                      {l.hostname || <span className="text-slate-400 italic">Unknown</span>}
                    </td>
                    <td>
                      <span className={`badge ${l.status === 'active' ? 'badge-active' : 'badge-warning'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500 dark:text-slate-400">
                      {l.ends ? new Date(l.ends).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-slate-500 dark:text-slate-400">
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
