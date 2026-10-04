import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Subnets } from './pages/Subnets';
import { SubnetForm } from './pages/subnets/SubnetForm';
import { StaticIP } from './pages/StaticIP';
import { StaticIPForm } from './pages/static-hosts/StaticIPForm';
import { Leases } from './pages/Leases';
import { ConfigEditor } from './pages/ConfigEditor';
import { ServiceLogs } from './pages/ServiceLogs';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export function AppContent() {
  const { user, loading, apiFetch } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem('dhcp_theme') || 'dark');
  const [serviceStatus, setServiceStatus] = useState(null);
  const [counts, setCounts] = useState({ subnets: 0, staticHosts: 0, activeLeases: 0 });
  const [notification, setNotification] = useState(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('dhcp_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Auto-dismiss notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchServiceAndCounts = async () => {
    if (!user) return;
    try {
      const [resStatus, resDash] = await Promise.all([
        apiFetch('/api/service/status'),
        apiFetch('/api/dashboard'),
      ]);
      const statusData = await resStatus.json();
      const dashData = await resDash.json();

      setServiceStatus(statusData);
      if (dashData?.counts) {
        setCounts({
          subnets: dashData.counts.subnets,
          staticHosts: dashData.counts.staticHosts,
          activeLeases: dashData.counts.activeLeases,
        });
      }
    } catch (e) {
      // background poll errors can fail gracefully
    }
  };

  useEffect(() => {
    if (user) {
      fetchServiceAndCounts();
      const interval = setInterval(fetchServiceAndCounts, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Initializing ISC DHCP Management...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <Sidebar counts={counts} />

      <div className="main-content">
        <Navbar
          serviceStatus={serviceStatus}
          onRefreshService={fetchServiceAndCounts}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        <main>
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<Dashboard setNotification={setNotification} />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />

            {/* Subnets Multi-Page */}
            <Route path="/subnets" element={<Subnets setNotification={setNotification} />} />
            <Route path="/subnets/add" element={<SubnetForm setNotification={setNotification} />} />
            <Route path="/subnets/:id/edit" element={<SubnetForm setNotification={setNotification} />} />

            {/* Static IP Multi-Page */}
            <Route path="/static-hosts" element={<StaticIP setNotification={setNotification} />} />
            <Route path="/static-hosts/add" element={<StaticIPForm setNotification={setNotification} />} />
            <Route path="/static-hosts/:name/edit" element={<StaticIPForm setNotification={setNotification} />} />

            {/* Leases, Config, Service */}
            <Route path="/leases" element={<Leases setNotification={setNotification} />} />
            <Route path="/config" element={<ConfigEditor setNotification={setNotification} />} />
            <Route path="/service" element={<ServiceLogs setNotification={setNotification} />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Toast Notification */}
      {notification && (
        <div className="toast-container">
          <div
            className="toast"
            style={{
              borderColor:
                notification.type === 'danger'
                  ? 'var(--status-danger-border)'
                  : 'var(--status-active-border)',
            }}
          >
            {notification.type === 'danger' ? (
              <AlertTriangle size={20} color="var(--status-danger)" />
            ) : (
              <CheckCircle2 size={20} color="var(--status-active)" />
            )}
            <div style={{ flex: 1, fontSize: '0.88rem' }}>{notification.message}</div>
            <button
              className="btn-icon"
              style={{ padding: 2, border: 'none', background: 'transparent' }}
              onClick={() => setNotification(null)}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
