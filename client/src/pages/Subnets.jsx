import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const navigate = useNavigate();
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
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>
            Subnet Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Configure network subnets, IP allocation pools, gateways, and DNS resolvers
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={fetchSubnets}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <Link to="/subnets/add" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Plus size={16} />
            Add Subnet
          </Link>
        </div>
      </div>

      {/* Subnet Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
        {subnets.map((sub) => (
          <div key={sub.subnet} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(99, 102, 241, 0.15)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Network size={22} />
                </div>
                <div>
                  <h3 className="font-mono" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                    {sub.subnet}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Netmask: {sub.netmask}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <Link
                  to={`/subnets/${encodeURIComponent(sub.subnet)}/edit`}
                  className="btn-icon"
                  title="Edit Subnet"
                  style={{ textDecoration: 'none' }}
                >
                  <Edit2 size={15} />
                </Link>
                <button
                  className="btn-icon"
                  style={{ color: 'var(--status-danger)' }}
                  onClick={() => handleDelete(sub.subnet)}
                  title="Delete Subnet"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* Parameters list */}
            <div
              className="inner-panel"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                padding: '14px',
                fontSize: '0.83rem',
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>IP POOL RANGE</span>
                <span className="font-mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                  {sub.rangeStart && sub.rangeEnd ? `${sub.rangeStart} - ${sub.rangeEnd}` : 'No dynamic range'}
                </span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>DEFAULT GATEWAY</span>
                <span className="font-mono">{sub.routers || 'None'}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>DNS SERVERS</span>
                <span className="font-mono">{sub.domainNameServers || 'None'}</span>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.72rem' }}>DEFAULT LEASE</span>
                <span>{sub.defaultLeaseTime ? `${sub.defaultLeaseTime}s` : 'Global'}</span>
              </div>
            </div>

            {sub.domainName && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Globe size={14} color="var(--accent-cyan)" />
                <span>Domain: <strong>{sub.domainName}</strong></span>
              </div>
            )}

            {/* Additional DHCP Options Badges */}
            {Array.isArray(sub.customOptions) && sub.customOptions.length > 0 && (
              <div style={{ paddingTop: '4px', borderTop: '1px dashed var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sliders size={12} color="var(--accent-cyan)" />
                  <span>ADDITIONAL DHCP OPTIONS ({sub.customOptions.length})</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {sub.customOptions.map((opt, idx) => (
                    <span
                      key={idx}
                      className="font-mono"
                      style={{
                        fontSize: '0.74rem',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        color: 'var(--text-primary)',
                      }}
                      title={`${opt.name}: ${opt.value}`}
                    >
                      <strong style={{ color: 'var(--accent-cyan)' }}>{opt.name}</strong>: {opt.value}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {subnets.length === 0 && !loading && (
          <div
            className="glass-card"
            style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}
          >
            <Network size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <h3>No Subnets Configured</h3>
            <p style={{ fontSize: '0.88rem', marginTop: 4, marginBottom: 16 }}>
              Add a subnet to begin leasing dynamic IP addresses
            </p>
            <Link to="/subnets/add" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
              <Plus size={16} /> Add First Subnet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
