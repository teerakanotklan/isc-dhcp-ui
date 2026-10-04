import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, Server, LogOut, RefreshCw } from 'lucide-react';

export function Navbar({ serviceStatus, onRefreshService, theme, toggleTheme }) {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Server size={20} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>isc-dhcp-server</span>
        </div>

        {serviceStatus && (
          <div
            className={`badge ${serviceStatus.active ? 'badge-active' : 'badge-danger'}`}
            style={{ cursor: 'pointer' }}
            onClick={onRefreshService}
            title="Click to refresh service status"
          >
            <span className="pulse-dot" />
            <span>{serviceStatus.active ? 'Active (Running)' : 'Stopped / Error'}</span>
            {serviceStatus.pid && (
              <span style={{ opacity: 0.7, fontSize: '0.7rem' }}>PID: {serviceStatus.pid}</span>
            )}
            <RefreshCw size={12} style={{ marginLeft: 4 }} />
          </div>
        )}

        {serviceStatus?.isMock && (
          <span className="badge badge-info" title="Running in simulated mock mode for Windows/Dev">
            Mock Mode
          </span>
        )}
      </div>

      <div className="navbar-right">
        {/* Theme Toggle */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Info & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name || user?.username}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--status-active)', fontWeight: 600, letterSpacing: '0.04em' }}>
              ADMINISTRATOR
            </div>
          </div>
          <button className="btn-icon" onClick={logout} title="Sign Out">
            <LogOut size={16} color="var(--status-danger)" />
          </button>
        </div>
      </div>
    </header>
  );
}
