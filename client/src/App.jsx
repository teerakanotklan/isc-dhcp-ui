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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Apply theme instantly without transition lag/delay
  useEffect(() => {
    document.documentElement.classList.add('disable-transitions');
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dhcp_theme', theme);

    // Force reflow and remove transition suppression in next animation frame
    window.getComputedStyle(document.documentElement).opacity;
    requestAnimationFrame(() => {
      document.documentElement.classList.remove('disable-transitions');
    });
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
      <div className="min-h-screen bg-slate-50 dark:bg-[#070a13] flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">
          Initializing ISC DHCP Management...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070a13] flex text-slate-900 dark:text-slate-100">
      {/* Sidebar with responsive mobile drawer */}
      <Sidebar
        counts={counts}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Navbar
          serviceStatus={serviceStatus}
          onRefreshService={fetchServiceAndCounts}
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="flex-1 pb-16">
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
            className={`toast ${
              notification.type === 'danger'
                ? 'border-rose-500/40'
                : 'border-emerald-500/40'
            }`}
          >
            {notification.type === 'danger' ? (
              <AlertTriangle size={20} className="text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
            )}
            <div className="flex-1 text-sm font-medium">{notification.message}</div>
            <button
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded transition-colors"
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
            >
              <X size={15} />
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
