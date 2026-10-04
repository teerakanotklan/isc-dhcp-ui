import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FileCode,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCcw,
  RefreshCw,
  Info
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
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            dhcpd.conf Editor
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Direct configuration viewer, syntax dry-run verification, and snapshot backups
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn ${showBackups ? 'btn-cyan' : 'btn-secondary'}`}
            onClick={() => setShowBackups(!showBackups)}
          >
            <History size={16} />
            Backups ({backups.length})
          </button>
          <button className="btn btn-secondary" onClick={handleValidate} disabled={validating}>
            <CheckCircle2 size={16} />
            {validating ? 'Validating...' : 'Validate Syntax'}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            title={hasChanges ? 'Save changes' : 'No changes to save'}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Validation Message Banner */}
      {validationResult && (
        <div
          style={{
            marginBottom: 20,
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: validationResult.valid ? 'var(--status-active-bg)' : 'var(--status-danger-bg)',
            border: `1px solid ${validationResult.valid ? 'var(--status-active-border)' : 'var(--status-danger-border)'}`,
            color: validationResult.valid ? 'var(--status-active)' : 'var(--status-danger)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '0.88rem',
          }}
        >
          {validationResult.valid ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <div>
            <strong>{validationResult.valid ? 'Syntax Valid' : 'Syntax Error'}:</strong> {validationResult.message}
          </div>
        </div>
      )}

      {/* Layout Split if Backups Open */}
      <div style={{ display: 'grid', gridTemplateColumns: showBackups ? '1fr 340px' : '1fr', gap: 24 }}>
        {/* Editor Card */}
        <div className="glass-card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-tertiary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
              <FileCode size={16} color="var(--accent-cyan)" />
              <span className="font-mono">/etc/dhcp/dhcpd.conf</span>
              {hasChanges && (
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                  Unsaved Changes
                </span>
              )}
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Lines: {content.split('\n').length} | Characters: {content.length}
            </div>
          </div>

          <textarea
            className="font-mono"
            style={{
              width: '100%',
              height: '620px',
              padding: '20px',
              background: '#0a0e1a',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: '0.9rem',
              lineHeight: 1.6,
              resize: 'vertical',
            }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck="false"
          />
        </div>

        {/* Backups Drawer */}
        {showBackups && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Snapshot History</h3>
              <button className="btn-icon" onClick={fetchBackups} title="Refresh backups">
                <RefreshCw size={14} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Snapshots are automatically created before any modification or restore.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
              {backups.map((b) => (
                <div
                  key={b.filename}
                  className="inner-panel"
                  style={{
                    padding: '12px',
                    fontSize: '0.8rem',
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {new Date(b.timestamp).toLocaleString()}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem', marginBottom: 8 }}>
                    {b.note || 'Manual edit snapshot'} ({b.size} bytes)
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.75rem', padding: '5px' }}
                    onClick={() => handleRestore(b.filename)}
                  >
                    <RotateCcw size={12} />
                    Restore this version
                  </button>
                </div>
              ))}

              {backups.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.85rem' }}>
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
