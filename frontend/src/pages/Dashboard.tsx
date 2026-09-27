import React, { useState, useEffect } from 'react';
import {
  Server,
  Network,
  Users,
  Bookmark,
  Activity,
  Layers,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { api } from '../api/client';
import { DashboardSummary } from '../types';
import { PageLoader } from '../components/common/PageLoader';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await api.getSummary();
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(() => fetchSummary(), 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !summary) {
    return <PageLoader message="Loading System Overview..." />;
  }

  const s = summary;
  const isClustered = s?.secondary_node?.status !== 'not_configured' && !!s?.secondary_node?.dhcp_ip;
  const primaryActive = s?.primary_service_status === 'active';
  const secondaryActive = isClustered && s?.secondary_service_status === 'active';

  const myState = s?.failover_status?.my_state || 'unknown';
  const partnerState = s?.failover_status?.partner_state || 'unknown';

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">System Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time node telemetry, failover peer states, and allocation metrics
          </p>
        </div>
        <button
          onClick={() => fetchSummary(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Cluster Nodes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Primary Node */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Primary Node (dhcp1)</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">Master Controller & DHCP</span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                primaryActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              {primaryActive ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">DHCP IP Address</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {s?.primary_node?.dhcp_ip || '192.168.153.159'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Service Status</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {s?.primary_service_status || 'unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Node */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Secondary Node (dhcp2)</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isClustered ? 'Failover Peer Agent' : 'Standalone Mode'}
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                !isClustered
                  ? 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'
                  : secondaryActive
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
              }`}
            >
              {!isClustered ? 'Standalone' : secondaryActive ? 'Active' : 'Offline'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">DHCP IP Address</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {isClustered ? s?.secondary_node?.dhcp_ip : 'Not Configured'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Service Status</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {isClustered ? s?.secondary_service_status : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Failover Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              RFC 3074 DHCP Failover Synchronization Status
            </h3>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border inline-flex items-center gap-1.5 w-fit ${
              !isClustered
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : myState === 'normal' && partnerState === 'normal'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                !isClustered
                  ? 'bg-blue-500'
                  : myState === 'normal' && partnerState === 'normal'
                  ? 'bg-emerald-500'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            {!isClustered
              ? 'STANDALONE (SINGLE NODE)'
              : myState === 'normal' && partnerState === 'normal'
              ? 'NORMAL (HEALTHY)'
              : (myState + ' / ' + partnerState).toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Local Primary Peer State</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 uppercase">
              {!isClustered ? 'standalone' : myState}
            </span>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Partner Secondary Peer State</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200 uppercase">
              {!isClustered ? 'none' : partnerState}
            </span>
          </div>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Scopes / Subnets</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {s?.total_subnets ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Configured networks</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dynamic Pools</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {s?.total_pools ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active address ranges</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Static Leases</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {s?.total_static ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Fixed IP reservations</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Leases</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {s?.active_leases ?? 0}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Currently bound clients</span>
        </div>
      </div>
    </div>
  );
};
