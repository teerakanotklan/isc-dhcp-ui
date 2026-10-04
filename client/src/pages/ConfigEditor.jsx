import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileCode,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCcw,
  RefreshCw
} from 'lucide-react';

export function ConfigEditor({ setNotification }) {
  const { apiFetch } = useAuth();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [backups, setBackups] = useState([]);
  const [showBackups, setShowBackups] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/config/raw');
      const data = await res.json();
      setContent(data.content);
      setOriginalContent(data.content);
      setValidationResult(null);
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const res = await apiFetch('/api/config/backups');
      const data = await res.json();
      setBackups(data);
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchBackups();
  }, []);

  const handleValidate = async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const res = await apiFetch('/api/config/validate', {
        method: 'POST',
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setValidationResult({ valid: false, message: data.error });
      } else {
        setValidationResult({ valid: true, message: data.message });
      }
    } catch (err) {
      setValidationResult({ valid: false, message: err.message });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!confirm('Are you sure you want to write these changes to dhcpd.conf? An automatic snapshot backup will be created.')) {
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/api/config/raw', {
        method: 'POST',
        body: JSON.stringify({
          content,
          comment: 'Modified via Web UI Config Editor',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: 'success', message: 'dhcpd.conf saved and backed up successfully' });
      setOriginalContent(content);
      setValidationResult(null);
      fetchBackups();
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (filename) => {
    if (!confirm(`Restore configuration from snapshot '${filename}'? Current config will be saved as backup.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/config/restore/${filename}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setNotification({ type: 'success', message: data.message });
      fetchConfig();
      fetchBackups();
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    }
  };

  const hasChanges = content !== originalContent;

  return (
    <div className="page-wrapper space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-1">
            dhcpd.conf Editor
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Direct configuration viewer, syntax dry-run verification, and snapshot backups
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            className={`btn text-xs sm:text-sm ${showBackups ? 'btn-cyan' : 'btn-secondary'}`}
            onClick={() => setShowBackups(!showBackups)}
          >
            <History size={15} />
            Backups ({backups.length})
          </button>
          <button className="btn btn-secondary text-xs sm:text-sm" onClick={handleValidate} disabled={validating}>
            <CheckCircle2 size={15} />
            {validating ? 'Validating...' : 'Validate'}
          </button>
          <button
            className="btn btn-primary text-xs sm:text-sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            title={hasChanges ? 'Save changes' : 'No changes to save'}
          >
            <Save size={15} />
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>

      {/* Validation Message Banner */}
      {validationResult && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
            validationResult.valid
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30'
          }`}
        >
          {validationResult.valid ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertTriangle size={20} className="shrink-0" />}
          <div>
            <strong>{validationResult.valid ? 'Syntax Valid' : 'Syntax Error'}:</strong> {validationResult.message}
          </div>
        </div>
      )}

      {/* Main Grid: Editor & Backups Drawer */}
      <div className={`grid gap-6 ${showBackups ? 'grid-cols-1 lg:grid-cols-[1fr,320px]' : 'grid-cols-1'}`}>
        {/* Editor Card */}
        <div className="glass-card p-0 overflow-hidden flex flex-col">
          <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-black/20 text-xs">
            <div className="flex items-center gap-2">
              <FileCode size={16} className="text-cyan-500 shrink-0" />
              <span className="font-mono text-slate-800 dark:text-slate-200">/etc/dhcp/dhcpd.conf</span>
              {hasChanges && (
                <span className="badge badge-warning text-[10px] py-0 px-2">
                  Unsaved Changes
                </span>
              )}
            </div>

            <div className="text-slate-400 dark:text-slate-500 hidden sm:block">
              Lines: {content.split('\n').length} | Chars: {content.length}
            </div>
          </div>

          <textarea
            className="w-full h-[520px] sm:h-[620px] p-4 sm:p-5 font-mono text-xs sm:text-sm bg-slate-950 text-slate-200 dark:bg-[#0a0e1a] border-0 outline-none leading-relaxed resize-y selection:bg-indigo-500 selection:text-white"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck="false"
          />
        </div>

        {/* Backups Drawer */}
        {showBackups && (
          <div className="glass-card space-y-4 h-fit">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/10">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Snapshot History
              </h3>
              <button className="btn-icon p-1" onClick={fetchBackups} title="Refresh backups">
                <RefreshCw size={14} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Snapshots are automatically created before any modification or rollback.
            </p>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {backups.map((b) => (
                <div key={b.filename} className="inner-panel space-y-2 p-3">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white">
                    {new Date(b.timestamp).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {b.note || 'Manual edit snapshot'} ({b.size} bytes)
                  </div>
                  <button
                    className="btn btn-secondary text-xs w-full py-1.5 justify-center"
                    onClick={() => handleRestore(b.filename)}
                  >
                    <RotateCcw size={12} />
                    Restore this version
                  </button>
                </div>
              ))}

              {backups.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  No backup snapshots recorded yet
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
