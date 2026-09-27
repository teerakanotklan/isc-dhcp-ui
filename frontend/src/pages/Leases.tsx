import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, Clock, Laptop } from 'lucide-react';
import { api } from '../api/client';
import { ActiveLease } from '../types';
import { useToast } from '../components/common/Toast';
import { PageLoader } from '../components/common/PageLoader';

export const Leases: React.FC = () => {
  const [leases, setLeases] = useState<ActiveLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const fetchLeases = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await api.getActiveLeases();
      setLeases(data || []);
    } catch (err: any) {
      toast(err.message || 'Failed to fetch active leases', 'error');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeases();
    const interval = setInterval(() => fetchLeases(), 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = leases.filter(l => {
    const q = search.toLowerCase();
    return (
      (l.ip && l.ip.toLowerCase().includes(q)) ||
      (l.mac && l.mac.toLowerCase().includes(q)) ||
      (l.client_hostname && l.client_hostname.toLowerCase().includes(q)) ||
      (l.binding_state && l.binding_state.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return <PageLoader message="Scanning dhcpd.leases database..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Client Leases</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time dynamically bound IP leases parsed from /var/lib/dhcp/dhcpd.leases
          </p>
        </div>
        <button
          onClick={() => fetchLeases(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-fit"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search / Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by IP, MAC, hostname, or binding state..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-400">
          Showing {filtered.length} of {leases.length} active leases
        </span>
      </div>

      {/* Leases Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Active Leases</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search ? 'No client leases match your search filter.' : 'No dynamic IP leases are currently registered in the database.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">IP Address</th>
                  <th className="px-5 py-3.5">Client Hostname</th>
                  <th className="px-5 py-3.5">Hardware MAC</th>
                  <th className="px-5 py-3.5">Binding State</th>
                  <th className="px-5 py-3.5">Lease Start</th>
                  <th className="px-5 py-3.5">Lease Expiration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filtered.map((l, idx) => {
                  const isActive = l.binding_state === 'active';
                  return (
                    <tr key={`${l.ip}-${idx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {l.ip}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        <Laptop className="w-3.5 h-3.5 text-slate-400" />
                        <span>{l.client_hostname || 'Unknown'}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {l.mac}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                          }`}
                        >
                          {l.binding_state || 'active'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">
                        {l.starts ? new Date(l.starts).toLocaleString() : '-'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500 text-[11px]">
                        {l.ends ? new Date(l.ends).toLocaleString() : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
