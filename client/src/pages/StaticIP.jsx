import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, BookmarkCheck, Search, Copy, Check, RefreshCw } from 'lucide-react';

export function StaticIP({ setNotification }) {
  const { apiFetch } = useAuth();
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchHosts = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/static-hosts');
      const data = await res.json();
      setHosts(data);
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts();
  }, []);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDelete = async (name) => {
    if (!confirm(`Are you sure you want to remove host reservation '${name}'?`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/static-hosts/${name}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setNotification({ type: 'success', message: `Host '${name}' reservation deleted` });
      fetchHosts();
    } catch (err) {
      setNotification({ type: 'danger', message: err.message });
    }
  };

  const filteredHosts = hosts.filter((h) => {
    const q = search.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.mac.toLowerCase().includes(q) ||
      h.ip.includes(q) ||
      (h.description && h.description.toLowerCase().includes(q))
    );
  });

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Static IP Reservations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Bind MAC physical addresses to dedicated fixed IP allocations
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchHosts}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <Link to="/static-hosts/add" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={16} />
            Add Static Host
          </Link>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="glass-card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
            <input
              type="text"
              className="input-text"
              style={{ paddingLeft: 38 }}
              placeholder="Search by Hostname, MAC, or IP address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: 13,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
          </div>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Showing <strong>{filteredHosts.length}</strong> of <strong>{hosts.length}</strong> reservations
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0 }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Host Identifier</th>
                <th>MAC Address</th>
                <th>Fixed IP Address</th>
                <th>Description / Purpose</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHosts.map((h) => (
                <tr key={h.name}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <BookmarkCheck size={16} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{h.name}</span>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {h.mac}
                      </span>
                      <button
                        className="btn-icon"
                        style={{ padding: 4 }}
                        onClick={() => handleCopy(h.mac, `mac-${h.name}`)}
                        title="Copy MAC"
                      >
                        {copiedKey === `mac-${h.name}` ? <Check size={12} color="var(--status-active)" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="font-mono" style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        {h.ip}
                      </span>
                      <button
                        className="btn-icon"
                        style={{ padding: 4 }}
                        onClick={() => handleCopy(h.ip, `ip-${h.name}`)}
                        title="Copy IP"
                      >
                        {copiedKey === `ip-${h.name}` ? <Check size={12} color="var(--status-active)" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </td>

                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {h.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <Link
                        to={`/static-hosts/${encodeURIComponent(h.name)}/edit`}
                        className="btn-icon"
                        title="Edit Host"
                        style={{ textDecoration: 'none' }}
                      >
                        <Edit2 size={14} />
                      </Link>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--status-danger)' }}
                        onClick={() => handleDelete(h.name)}
                        title="Delete Host"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredHosts.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                    No static host reservations match your query
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
