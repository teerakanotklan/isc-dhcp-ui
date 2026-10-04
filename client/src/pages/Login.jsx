import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Server, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glowing orbs */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
          top: '15%',
          left: '20%',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 450,
          height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)',
          bottom: '15%',
          right: '20%',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="glass-card"
        style={{
          maxWidth: 440,
          width: '100%',
          padding: '40px 32px',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          zIndex: 1,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--gradient-brand)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: 'var(--shadow-glow)',
              marginBottom: 16,
            }}
          >
            <Server size={28} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 6 }}>
            ISC DHCP Server
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Sign in to access Web Management Console
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              border: '1px solid var(--status-danger-border)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              marginBottom: 20,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-text"
                style={{ paddingLeft: 40 }}
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <User
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="input-text"
                style={{ paddingLeft: 40 }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In as Administrator'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div
          className="inner-panel"
          style={{
            marginTop: 28,
            padding: '14px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <ShieldCheck size={20} color="var(--accent-cyan)" />
          <div>
            Default Admin: <strong style={{ color: 'var(--text-primary)' }}>admin</strong> / <strong style={{ color: 'var(--text-primary)' }}>admin123</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
