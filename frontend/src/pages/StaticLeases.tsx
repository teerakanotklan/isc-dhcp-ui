import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { api } from '../api/client';
import { StaticLease, Subnet } from '../types';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/common/Toast';
import { PageLoader } from '../components/common/PageLoader';

export const StaticLeases: React.FC = () => {
  const [leases, setLeases] = useState<StaticLease[]>([]);
  const [subnets, setSubnets] = useState<Subnet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<Partial<StaticLease> | null>(null);

  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [lData, sData] = await Promise.all([
        api.getStaticLeases(),
        api.getSubnets(),
      ]);
      setLeases(lData || []);
      setSubnets(sData || []);
    } catch (err: any) {
      toast(err.message || 'Failed to load reservations', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingLease({
      subnet_id: subnets.length > 0 ? subnets[0].id : 0,
      hostname: '',
      ip_address: '',
      mac_address: '',
      description: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (l: StaticLease) => {
    setEditingLease({ ...l });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLease) return;
    try {
      await api.saveStaticLease(editingLease);
      toast(editingLease.id ? 'Reservation updated' : 'Reservation added', 'success');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to save reservation', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this static lease reservation?')) return;
    try {
      await api.deleteStaticLease(id);
      toast('Reservation deleted', 'success');
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to delete reservation', 'error');
    }
  };

  const filtered = leases.filter(l => {
    const q = search.toLowerCase();
    return (
      l.hostname.toLowerCase().includes(q) ||
      l.ip_address.toLowerCase().includes(q) ||
      l.mac_address.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return <PageLoader message="Loading Static Reservations..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Static Address Reservations</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Bind fixed IPv4 addresses to client network hardware MAC addresses
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by IP, MAC, hostname, or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-400">
          Showing {filtered.length} of {leases.length} reservations
        </span>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Bookmark className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">No Reservations Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search ? 'No static leases match your search filter.' : 'Add your first static MAC-to-IP reservation.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Hostname</th>
                  <th className="px-5 py-3.5">Assigned IP</th>
                  <th className="px-5 py-3.5">MAC Address</th>
                  <th className="px-5 py-3.5">Subnet Scope</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filtered.map(l => {
                  const s = subnets.find(sub => sub.id === l.subnet_id);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                        {l.hostname}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {l.ip_address}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {l.mac_address}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500">
                        {s ? `${s.network}/${s.netmask}` : `Scope #${l.subnet_id}`}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 truncate max-w-xs">
                        {l.description || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(l)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(l.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLease?.id ? 'Edit Static Reservation' : 'New Address Reservation'}
        subtitle="Associate a static IPv4 address with a network client's MAC address"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Client Hostname *
            </label>
            <input
              type="text"
              required
              placeholder="printer-dept1"
              value={editingLease?.hostname || ''}
              onChange={e => setEditingLease(prev => ({ ...prev, hostname: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                IP Address *
              </label>
              <input
                type="text"
                required
                placeholder="192.168.10.50"
                value={editingLease?.ip_address || ''}
                onChange={e => setEditingLease(prev => ({ ...prev, ip_address: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hardware MAC Address *
              </label>
              <input
                type="text"
                required
                placeholder="00:11:22:33:44:55"
                value={editingLease?.mac_address || ''}
                onChange={e => setEditingLease(prev => ({ ...prev, mac_address: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Subnet Scope *
            </label>
            <select
              required
              value={editingLease?.subnet_id || ''}
              onChange={e => setEditingLease(prev => ({ ...prev, subnet_id: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {subnets.map(s => (
                <option key={s.id} value={s.id}>
                  {s.network}/{s.netmask} {s.routers ? `(GW: ${s.routers})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description / Asset Tag
            </label>
            <input
              type="text"
              placeholder="Finance HP LaserJet 400"
              value={editingLease?.description || ''}
              onChange={e => setEditingLease(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-500/20"
            >
              Save Reservation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
