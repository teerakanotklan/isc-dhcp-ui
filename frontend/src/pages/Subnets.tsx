import React, { useState, useEffect } from 'react';
import {
  Network,
  Plus,
  Edit2,
  Trash2,
  Layers,
  ChevronDown,
  ChevronUp,
  Server,
  AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { Subnet, Pool } from '../types';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/common/Toast';
import { PageLoader } from '../components/common/PageLoader';

export const Subnets: React.FC = () => {
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubnet, setExpandedSubnet] = useState<number | null>(null);

  // Subnet Modal State
  const [subnetModalOpen, setSubnetModalOpen] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState<Partial<Subnet> | null>(null);

  // Pool Modal State
  const [poolModalOpen, setPoolModalOpen] = useState(false);
  const [editingPool, setEditingPool] = useState<Partial<Pool> | null>(null);
  const [selectedSubnetIdForPool, setSelectedSubnetIdForPool] = useState<number | null>(null);

  const { toast } = useToast();

  const fetchSubnets = async () => {
    try {
      const data = await api.getSubnets();
      setSubnets(data || []);
      if (data && data.length > 0 && expandedSubnet === null) {
        setExpandedSubnet(data[0].id);
      }
    } catch (err: any) {
      toast(err.message || 'Failed to load subnets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubnets();
  }, []);

  // Subnet Handlers
  const handleOpenAddSubnet = () => {
    setEditingSubnet({
      network: '',
      netmask: '255.255.255.0',
      routers: '',
      domain_name_servers: '192.168.153.2, 8.8.8.8',
      domain_name: 'local',
      lease_hours: 12,
      lease_minutes: 0,
      custom_options: '',
    });
    setSubnetModalOpen(true);
  };

  const handleOpenEditSubnet = (subnet: Subnet) => {
    setEditingSubnet({ ...subnet });
    setSubnetModalOpen(true);
  };

  const handleSaveSubnet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubnet) return;
    try {
      const payload = {
        ...editingSubnet,
        default_lease_time: ((editingSubnet.lease_hours || 0) * 3600) + ((editingSubnet.lease_minutes || 0) * 60) || 43200,
        max_lease_time: (((editingSubnet.lease_hours || 0) * 3600) + ((editingSubnet.lease_minutes || 0) * 60)) * 2 || 86400,
      };
      await api.saveSubnet(payload);
      toast(editingSubnet.id ? 'Subnet updated successfully' : 'Subnet created successfully', 'success');
      setSubnetModalOpen(false);
      fetchSubnets();
    } catch (err: any) {
      toast(err.message || 'Failed to save subnet', 'error');
    }
  };

  const handleDeleteSubnet = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this subnet and all its associated pools?')) return;
    try {
      await api.deleteSubnet(id);
      toast('Subnet deleted', 'success');
      fetchSubnets();
    } catch (err: any) {
      toast(err.message || 'Failed to delete subnet', 'error');
    }
  };

  // Pool Handlers
  const handleOpenAddPool = (subnetId: number) => {
    setSelectedSubnetIdForPool(subnetId);
    setEditingPool({
      subnet_id: subnetId,
      range_start: '',
      range_end: '',
      deny_unknown_clients: false,
      failover_peer_name: 'dhcp-failover',
    });
    setPoolModalOpen(true);
  };

  const handleOpenEditPool = (pool: Pool) => {
    setSelectedSubnetIdForPool(pool.subnet_id);
    setEditingPool({ ...pool });
    setPoolModalOpen(true);
  };

  const handleSavePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPool || !selectedSubnetIdForPool) return;
    try {
      await api.savePool({
        ...editingPool,
        subnet_id: selectedSubnetIdForPool,
      });
      toast(editingPool.id ? 'Dynamic pool updated' : 'Dynamic pool added', 'success');
      setPoolModalOpen(false);
      fetchSubnets();
    } catch (err: any) {
      toast(err.message || 'Failed to save pool', 'error');
    }
  };

  const handleDeletePool = async (id: number) => {
    if (!window.confirm('Delete this dynamic address range?')) return;
    try {
      await api.deletePool(id);
      toast('Dynamic pool removed', 'success');
      fetchSubnets();
    } catch (err: any) {
      toast(err.message || 'Failed to delete pool', 'error');
    }
  };

  if (loading) {
    return <PageLoader message="Loading DHCP Scopes & Subnets..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">DHCP Scopes & Subnets</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure networks, dynamic IP pools, gateway routers, and lease durations
          </p>
        </div>
        <button
          onClick={handleOpenAddSubnet}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>New Scope / Subnet</span>
        </button>
      </div>

      {/* Subnet List */}
      {subnets.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Network className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Scopes Configured</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create your first DHCP subnet scope to begin allocating IP addresses to network clients.
          </p>
          <button
            onClick={handleOpenAddSubnet}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
          >
            Create Scope
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {subnets.map(subnet => {
            const isExpanded = expandedSubnet === subnet.id;
            return (
              <div
                key={subnet.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Header Strip */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                      <Network className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                          {subnet.network}
                        </span>
                        <span className="text-xs font-mono text-slate-500">/ {subnet.netmask}</span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Gateway: <span className="font-mono font-medium">{subnet.routers || 'None'}</span> &bull; Lease: {subnet.lease_hours ?? 12}h {subnet.lease_minutes ?? 0}m
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleOpenAddPool(subnet.id)}
                      className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Pool</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditSubnet(subnet)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit Subnet"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubnet(subnet.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      title="Delete Subnet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedSubnet(isExpanded ? null : subnet.id)}
                      className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Subnet Body */}
                {isExpanded && (
                  <div className="p-5 space-y-4">
                    {/* Scope Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <span className="text-slate-500 dark:text-slate-400 block mb-0.5">DNS Servers</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {subnet.domain_name_servers || 'Using Global Defaults'}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Domain Name</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                          {subnet.domain_name || 'local'}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                        <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Custom Directives</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate block">
                          {subnet.custom_options || 'None'}
                        </span>
                      </div>
                    </div>

                    {/* Dynamic Pools List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Dynamic Address Pools</span>
                        </h4>
                      </div>

                      {(!subnet.pools || subnet.pools.length === 0) ? (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-center text-xs text-slate-500">
                          No dynamic pools defined for this subnet. Static-only allocation.
                        </div>
                      ) : (
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                          {subnet.pools.map(pool => (
                            <div
                              key={pool.id}
                              className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {pool.range_start} &rarr; {pool.range_end}
                                </span>
                                {pool.deny_unknown_clients && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    Deny Unknown
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleOpenEditPool(pool)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeletePool(pool.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Subnet Modal */}
      <Modal
        open={subnetModalOpen}
        onClose={() => setSubnetModalOpen(false)}
        title={editingSubnet?.id ? 'Edit Scope & Subnet' : 'Create New Scope & Subnet'}
        subtitle="Configure network address, default gateway, DNS, and lease time"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveSubnet} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Network Address *
              </label>
              <input
                type="text"
                required
                placeholder="192.168.10.0"
                value={editingSubnet?.network || ''}
                onChange={e => setEditingSubnet(prev => ({ ...prev, network: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subnet Netmask *
              </label>
              <input
                type="text"
                required
                placeholder="255.255.255.0"
                value={editingSubnet?.netmask || ''}
                onChange={e => setEditingSubnet(prev => ({ ...prev, netmask: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Router / Default Gateway
            </label>
            <input
              type="text"
              placeholder="192.168.10.1"
              value={editingSubnet?.routers || ''}
              onChange={e => setEditingSubnet(prev => ({ ...prev, routers: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Domain Name Servers
              </label>
              <input
                type="text"
                placeholder="8.8.8.8, 1.1.1.1"
                value={editingSubnet?.domain_name_servers || ''}
                onChange={e => setEditingSubnet(prev => ({ ...prev, domain_name_servers: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Domain Name
              </label>
              <input
                type="text"
                placeholder="corp.local"
                value={editingSubnet?.domain_name || ''}
                onChange={e => setEditingSubnet(prev => ({ ...prev, domain_name: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Lease Time (Windows Server DHCP Style) */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Client Lease Duration (Windows Server Style)
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Hours</label>
                <input
                  type="number"
                  min="0"
                  max="8760"
                  value={editingSubnet?.lease_hours ?? 12}
                  onChange={e => setEditingSubnet(prev => ({ ...prev, lease_hours: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Minutes</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={editingSubnet?.lease_minutes ?? 0}
                  onChange={e => setEditingSubnet(prev => ({ ...prev, lease_minutes: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Custom Subnet Options / Directives
            </label>
            <textarea
              rows={2}
              placeholder="option ntp-servers 192.168.1.1;"
              value={editingSubnet?.custom_options || ''}
              onChange={e => setEditingSubnet(prev => ({ ...prev, custom_options: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSubnetModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-500/20"
            >
              Save Subnet
            </button>
          </div>
        </form>
      </Modal>

      {/* Pool Modal */}
      <Modal
        open={poolModalOpen}
        onClose={() => setPoolModalOpen(false)}
        title={editingPool?.id ? 'Edit Dynamic Address Pool' : 'Add Dynamic Address Pool'}
        subtitle="Define a starting and ending IPv4 range for dynamic DHCP leasing"
        maxWidth="md"
      >
        <form onSubmit={handleSavePool} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Range Start *
              </label>
              <input
                type="text"
                required
                placeholder="192.168.10.100"
                value={editingPool?.range_start || ''}
                onChange={e => setEditingPool(prev => ({ ...prev, range_start: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Range End *
              </label>
              <input
                type="text"
                required
                placeholder="192.168.10.200"
                value={editingPool?.range_end || ''}
                onChange={e => setEditingPool(prev => ({ ...prev, range_end: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="deny_unknown"
              checked={editingPool?.deny_unknown_clients || false}
              onChange={e => setEditingPool(prev => ({ ...prev, deny_unknown_clients: e.target.checked }))}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <label htmlFor="deny_unknown" className="font-semibold text-slate-700 dark:text-slate-300">
              Deny Unknown Clients (MAC Reservation Whitelist Only)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPoolModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-500/20"
            >
              Save Pool
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
