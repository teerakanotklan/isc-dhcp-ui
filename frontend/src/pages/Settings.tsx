import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { GlobalSettings as SettingsType } from '../types';
import { useToast } from '../components/common/Toast';
import { PageLoader } from '../components/common/PageLoader';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err: any) {
      toast(err.message || 'Failed to fetch global settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await api.saveSettings(settings);
      toast('Global server options saved! Deploy to apply to running services.', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return <PageLoader message="Loading Global Options..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Global Server Options</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure server-wide default options applied across all DHCP scopes unless explicitly overridden
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6">
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Global Domain Name
              </label>
              <input
                type="text"
                placeholder="corp.local"
                value={settings?.domain_name || ''}
                onChange={e => setSettings(prev => prev ? { ...prev, domain_name: e.target.value } : null)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Global DNS Name Servers
              </label>
              <input
                type="text"
                placeholder="192.168.153.2, 8.8.8.8"
                value={settings?.dns_servers || ''}
                onChange={e => setSettings(prev => prev ? { ...prev, dns_servers: e.target.value } : null)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Lease Time (Seconds)
              </label>
              <input
                type="number"
                min="60"
                value={settings?.default_lease_time || 43200}
                onChange={e => setSettings(prev => prev ? { ...prev, default_lease_time: parseInt(e.target.value) || 0 } : null)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">43200 = 12 Hours</span>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Max Lease Time (Seconds)
              </label>
              <input
                type="number"
                min="60"
                value={settings?.max_lease_time || 86400}
                onChange={e => setSettings(prev => prev ? { ...prev, max_lease_time: parseInt(e.target.value) || 0 } : null)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">86400 = 24 Hours</span>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.authoritative || false}
                onChange={e => setSettings(prev => prev ? { ...prev, authoritative: e.target.checked } : null)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Authoritative DHCP Server (Immediately NAK invalid client IP requests)
              </span>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Custom Global Directives / Options
            </label>
            <textarea
              rows={4}
              placeholder="option time-offset -18000;&#10;option ntp-servers 192.168.1.1;"
              value={settings?.custom_options || ''}
              onChange={e => setSettings(prev => prev ? { ...prev, custom_options: e.target.value } : null)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-semibold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Settings...' : 'Save Global Options'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
