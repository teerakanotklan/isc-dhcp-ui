import React, { useState, useEffect } from 'react';
import {
  Rocket,
  FileCode,
  History,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Terminal
} from 'lucide-react';
import { api } from '../api/client';
import { ConfigPreview, DeploymentHistory } from '../types';
import { useToast } from '../components/common/Toast';
import { PageLoader } from '../components/common/PageLoader';
import { Modal } from '../components/ui/Modal';

export const Deploy: React.FC = () => {
  const [preview, setPreview] = useState<ConfigPreview | null>(null);
  const [history, setHistory] = useState<DeploymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [commitMessage, setCommitMessage] = useState('Scope and lease configuration update');
  const [activeDiffTab, setActiveDiffTab] = useState<'primary' | 'secondary'>('primary');

  // Log Modal
  const [selectedLog, setSelectedLog] = useState<DeploymentHistory | null>(null);

  const { toast } = useToast();

  const fetchData = async () => {
    try {
      const [prevData, histData] = await Promise.all([
        api.getConfigPreview(),
        api.getDeployments(),
      ]);
      setPreview(prevData);
      setHistory(histData || []);
    } catch (err: any) {
      toast(err.message || 'Failed to load deployment data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMessage.trim()) {
      toast('Please enter a commit message for audit history', 'error');
      return;
    }

    setDeploying(true);
    try {
      await api.deployConfig(commitMessage);
      toast('Configuration successfully deployed and services restarted!', 'success');
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Deployment validation or rollout failed', 'error');
    } finally {
      setDeploying(false);
    }
  };

  if (loading) {
    return <PageLoader message="Validating DHCP syntax & preparing diff..." />;
  }

  const currentDiff = activeDiffTab === 'primary' ? preview?.primary_diff : preview?.secondary_diff;
  const currentConf = activeDiffTab === 'primary' ? preview?.primary_conf : preview?.secondary_conf;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configuration Deployment & Audit</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit candidate dhcpd.conf files, validate ISC DHCP syntax, and push synchronized rollouts
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-fit"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Preview</span>
        </button>
      </div>

      {/* Deployment Action Bar Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <form onSubmit={handleDeploy} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              required
              placeholder="Audit log commit message (e.g. Added 192.168.20.0 subnet for VoIP)"
              value={commitMessage}
              onChange={e => setCommitMessage(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={deploying}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
          >
            {deploying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Rocket className="w-4 h-4" />
            )}
            <span>{deploying ? 'Deploying to Cluster...' : 'Validate & Deploy to Cluster'}</span>
          </button>
        </form>
      </div>

      {/* Visual Diff Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Diff Tabs */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveDiffTab('primary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeDiffTab === 'primary'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Primary (dhcp1) Configuration
            </button>
            {preview?.is_clustered && (
              <button
                onClick={() => setActiveDiffTab('secondary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeDiffTab === 'secondary'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Secondary (dhcp2) Configuration
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {activeDiffTab === 'primary' ? '/etc/dhcp/dhcpd.conf' : 'Remote dhcpd.conf via Agent'}
          </span>
        </div>

        {/* Diff or Code Viewer */}
        <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-[450px]">
          {currentDiff ? (
            <pre className="text-slate-300 whitespace-pre">
              {currentDiff.split('\n').map((line, idx) => {
                let color = 'text-slate-400';
                if (line.startsWith('+')) color = 'text-emerald-400 bg-emerald-950/30';
                if (line.startsWith('-')) color = 'text-rose-400 bg-rose-950/30';
                if (line.startsWith('@@')) color = 'text-cyan-400';
                return (
                  <div key={idx} className={`px-2 py-0.5 rounded ${color}`}>
                    {line}
                  </div>
                );
              })}
            </pre>
          ) : currentConf ? (
            <pre className="text-slate-300 whitespace-pre leading-relaxed">
              {currentConf}
            </pre>
          ) : (
            <div className="p-6 text-center text-slate-500">
              No configuration diff detected. Candidate matches running configuration.
            </div>
          )}
        </div>
      </div>

      {/* Deployment Audit History */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <History className="w-4 h-4 text-indigo-500" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Deployment Audit Trail</h3>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No deployments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3">Commit Message</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {history.map(item => {
                  const isSuccess = item.status === 'success';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-3 font-mono text-slate-500 text-[11px]">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-slate-800 dark:text-slate-200 font-semibold">
                        {item.deployed_by}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {item.commit_message}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            isSuccess
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="View Execution Log"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Modal */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Deployment Execution Log"
        subtitle={`Commit: ${selectedLog?.commit_message} (ID #${selectedLog?.id})`}
        maxWidth="2xl"
      >
        <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-slate-300 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap leading-relaxed">
            {selectedLog?.log_detail || 'No detailed log recorded.'}
          </pre>
        </div>
      </Modal>
    </div>
  );
};
