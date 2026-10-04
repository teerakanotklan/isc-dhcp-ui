import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Edit2,
  Trash2,
  Network,
  Globe,
  RefreshCw,
  Sliders
} from 'lucide-react';

export function Subnets({ setNotification }) {
  const { apiFetch } = useAuth();
  const [subnets, setSubnets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubnets = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/subnets');
      const data = await res.json();
      setSubnets(data);
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubnets();
  }, []);

  const handleDelete = async (subnet) => {
    if (!confirm(`Are you sure you want to remove subnet ${subnet}? This will erase its DHCP pool configuration.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/subnets/${subnet}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setNotification({ type: 'success', message: `Subnet ${subnet} deleted successfully` });
      fetchSubnets();
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    }
  };

  return (
    <div className="page-wrapper space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            Subnet Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Configure network subnets, IP allocation pools, gateways, and DNS resolvers
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button className="btn btn-secondary text-xs sm:text-sm" onClick={fetchSubnets}>
            <RefreshCw size={15} />
            Refresh
          </button>
          <Link to="/subnets/add" className="btn btn-primary text-xs sm:text-sm">
            <Plus size={16} />
            Add Subnet
          </Link>
        </div>
      </div>

      {/* Subnet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {subnets.map((sub) => (
          <div key={sub.subnet} className="glass-card flex flex-col justify-between space-y-4">
            <div>
              {/* Card Title & Actions */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Network size={22} />
                  </div>
                  <div>
                    <h3 className="font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {sub.subnet}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Netmask: {sub.netmask}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Link
                    to={`/subnets/${encodeURIComponent(sub.subnet)}/edit`}
                    className="btn-icon"
                    title="Edit Subnet"
                  >
                    <Edit2 size={14} />
                  </Link>
                  <button
                    className="btn-icon text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    onClick={() => handleDelete(sub.subnet)}
                    title="Delete Subnet"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Parameters list */}
              <div className="inner-panel grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">
                    IP POOL RANGE
                  </span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold truncate block">
                    {sub.rangeStart && sub.rangeEnd ? `${sub.rangeStart} - ${sub.rangeEnd}` : 'No dynamic range'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">
                    DEFAULT GATEWAY
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate block">
                    {sub.routers || 'None'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">
                    DNS SERVERS
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate block">
                    {sub.domainNameServers || 'None'}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block mb-0.5">
                    DEFAULT LEASE
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {sub.defaultLeaseTime ? `${sub.defaultLeaseTime}s` : 'Global'}
                  </span>
                </div>
              </div>

              {sub.domainName && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 mb-2">
                  <Globe size={13} className="text-cyan-500" />
                  <span>Domain: <strong className="text-slate-800 dark:text-slate-200">{sub.domainName}</strong></span>
                </div>
              )}
            </div>

            {/* Additional DHCP Options Badges */}
            {Array.isArray(sub.customOptions) && sub.customOptions.length > 0 && (
              <div className="pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders size={12} className="text-cyan-500" />
                  <span>ADDITIONAL DHCP OPTIONS ({sub.customOptions.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sub.customOptions.map((opt, idx) => (
                    <span
                      key={idx}
                      className="font-mono text-[11px] px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-slate-800 dark:text-slate-200 truncate max-w-full"
                      title={`${opt.name}: ${opt.value}`}
                    >
                      <strong className="text-cyan-600 dark:text-cyan-400">{opt.name}</strong>: {opt.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {subnets.length === 0 && !loading && (
          <div className="glass-card col-span-full text-center py-16 text-slate-500 dark:text-slate-400 space-y-4">
            <Network size={44} className="mx-auto text-slate-400 opacity-60" />
            <div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">No Subnets Configured</h3>
              <p className="text-sm mt-1">Add a subnet to begin leasing dynamic IP addresses</p>
            </div>
            <Link to="/subnets/add" className="btn btn-primary text-sm inline-flex">
              <Plus size={16} /> Add First Subnet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
