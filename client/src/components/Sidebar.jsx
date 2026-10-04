import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wifi,
  BookmarkCheck,
  Network,
  FileCode,
  Terminal,
  Activity
} from 'lucide-react';

export function Sidebar({ counts }) {
  const location = useLocation();

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isActive: (pathname) => pathname === '/' || pathname === '/dashboard'
    },
    {
      to: '/subnets',
      label: 'Subnet Management',
      icon: Network,
      badge: counts?.subnets,
      isActive: (pathname) => pathname.startsWith('/subnets')
    },
    {
      to: '/static-hosts',
      label: 'Static IP (Hosts)',
      icon: BookmarkCheck,
      badge: counts?.staticHosts,
      isActive: (pathname) => pathname.startsWith('/static-hosts')
    },
    {
      to: '/leases',
      label: 'Lease IP',
      icon: Wifi,
      badge: counts?.activeLeases,
      isActive: (pathname) => pathname.startsWith('/leases')
    },
    {
      to: '/config',
      label: 'DHCP Config',
      icon: FileCode,
      isActive: (pathname) => pathname.startsWith('/config')
    },
    {
      to: '/service',
      label: 'Service & Logs',
      icon: Terminal,
      isActive: (pathname) => pathname.startsWith('/service')
    },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="brand-icon">
          <Activity size={22} />
        </div>
        <div className="brand-text">
          <h1>ISC DHCP UI</h1>
          <span>Control Panel</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(location.pathname);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`nav-item ${active ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge !== null && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <div>ISC DHCP Manager v1.0</div>
          <div>Multi-Page Router</div>
        </div>
      </div>
    </aside>
  );
}
