import React, { useState, useEffect } from 'react';
import {
  Server,
  Activity,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { api } from '../api/client';
import { ClusterInfo } from '../types';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/common/Toast';
import { PageLoader } from '../components/common/PageLoader';

export const Clustering: React.FC = () => {
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Setup Cluster Modal
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [secondaryIp, setSecondaryIp] = useState('192.168.153.160');
  const [agentPort, setAgentPort] = useState(9443);
  const [apiToken, setApiToken] = useState('dhcp-secret-token-2026');

  // Ping Testing
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { toast } = useToast();

  const fetchCluster = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await api.getCluster();
      setClusterInfo(data);
    } catch (err: any) {
      toast(err.message || 'Failed to fetch cluster status', 'error');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCluster();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testCluster({
        secondary_ip: secondaryIp,
        agent_port: Number(agentPort),
        api_token: apiToken,
      });
      setTestResult({
        success: true,
        message: `Connection successful! Ping latency: ${res.latency_ms ?? 5}ms`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to connect to remote dhcp-agent',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveCluster({
        secondary_ip: secondaryIp,
        agent_port: Number(agentPort),
        api_token: apiToken,
      });
      toast('Failover cluster successfully formed! Go to Deploy to apply.', 'success');
      setSetupModalOpen(false);
      fetchCluster();
    } catch (err: any) {
      toast(err.message || 'Failed to setup cluster', 'error');
    }
  };

  const handleDisbandCluster = async () => {
    if (
      !window.confirm(
        'Are you sure you want to disband this DHCP Failover cluster? The system will return to Standalone mode servicing requests independently.'
      )
    )
      return;

    try {
      await api.deleteCluster();
      toast('Cluster disbanded. System is now in Standalone mode.', 'success');
      fetchCluster();
    } catch (err: any) {
      toast(err.message || 'Failed to disband cluster', 'error');
    }
  };

  if (loading) {
    return <PageLoader message="Querying cluster nodes and agent health..." />;
  }

  const isClustered = clusterInfo?.is_clustered ?? false;
  const p = clusterInfo?.primary_node;
  const s = clusterInfo?.secondary_node;
  const failover = clusterInfo?.failover_status;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">High Availability Clustering</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ISC DHCP RFC 3074 active-active failover partnership and node synchronization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchCluster(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {!isClustered ? (
            <button
              onClick={() => {
                setTestResult(null);
                setSetupModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Setup Failover Cluster</span>
            </button>
          ) : (
            <button
              onClick={handleDisbandCluster}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-xl text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Disband Cluster</span>
            </button>
          )}
        </div>
      </div>

      {/* Standalone Banner */}
      {!isClustered && (
        <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Standalone Mode (Single Node Active)
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                This DHCP server is operating independently without a secondary failover partner. Generated
                configurations will contain standard standalone scopes without failover peer blocks.
                Click <strong>"Setup Failover Cluster"</strong> to pair with a secondary agent.
              </p>
              <button
                onClick={() => {
                  setTestResult(null);
                  setSetupModalOpen(true);
                }}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-500/20"
              >
                Pair with Secondary Node
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cluster Topology View */}
      {isClustered && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Primary Node Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Primary Node</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  MASTER
                </span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">{p?.name || 'dhcp1'}</h4>
              <div className="space-y-1 mt-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                <div>DHCP IP: <span className="font-bold">{p?.dhcp_ip}</span></div>
                <div>Mgmt IP: <span>{p?.management_ip}</span></div>
                <div>Sync Port: <span>647 (TCP)</span></div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Peer State:</span>
                <span className="font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {failover?.my_state || 'normal'}
                </span>
              </div>
            </div>

            {/* Sync Pipe Visual Card */}
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">RFC 3074 Failover Link</span>
              <span className="text-[11px] font-mono text-slate-500 mt-0.5">Port 647 (Failover) &bull; Port 9443 (Agent)</span>
              <span className="mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Bi-Directional Sync Active
              </span>
            </div>

            {/* Secondary Node Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Secondary Node</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                  SLAVE / AGENT
                </span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">{s?.name || 'dhcp2'}</h4>
              <div className="space-y-1 mt-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                <div>DHCP IP: <span className="font-bold">{s?.dhcp_ip}</span></div>
                <div>Agent Port: <span>{s?.agent_port}</span></div>
                <div>Status: <span className="text-emerald-500 font-bold">{s?.status || 'online'}</span></div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Peer State:</span>
                <span className="font-mono font-bold uppercase text-emerald-600 dark:text-emerald-400">
                  {failover?.partner_state || 'normal'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setup Cluster Modal */}
      <Modal
        open={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        title="Setup High Availability Failover Cluster"
        subtitle="Establish an active failover partnership with dhcp-agent on the secondary server"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCluster} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Secondary Node IP Address *
            </label>
            <input
              type="text"
              required
              placeholder="192.168.153.160"
              value={secondaryIp}
              onChange={e => setSecondaryIp(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Agent HTTPS Port
              </label>
              <input
                type="number"
                required
                value={agentPort}
                onChange={e => setAgentPort(parseInt(e.target.value) || 9443)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                API Bearer Token
              </label>
              <input
                type="password"
                required
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Test connection button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !secondaryIp}
              className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 rounded-xl font-semibold flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 transition-colors"
            >
              {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-indigo-500" />}
              <span>{testing ? 'Testing connection...' : 'Test Agent Connection'}</span>
            </button>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSetupModalOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-md shadow-indigo-500/20"
            >
              Save & Pair Node
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
