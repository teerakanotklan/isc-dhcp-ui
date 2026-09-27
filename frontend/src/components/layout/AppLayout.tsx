import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { MobileDrawer } from './MobileDrawer';
import { RouteProgressBar } from './RouteProgressBar';
import { api } from '../../api/client';
import { ClusterInfo } from '../../types';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('dhcp_sidebar_collapsed') === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null);

  const fetchCluster = async () => {
    try {
      const data = await api.getCluster();
      setClusterInfo(data);
    } catch {
      // Ignored if unauthenticated or network error
    }
  };

  useEffect(() => {
    fetchCluster();
    const interval = setInterval(fetchCluster, 10000);
    return () => clearInterval(interval);
  }, []);

  const toggleCollapse = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('dhcp_sidebar_collapsed', String(next));
      return next;
    });
  };

  let clusterState = 'STANDALONE';
  const isClustered = clusterInfo?.is_clustered ?? false;
  if (isClustered && clusterInfo?.failover_status) {
    const { my_state, partner_state } = clusterInfo.failover_status;
    if (my_state === 'normal' && partner_state === 'normal') {
      clusterState = 'NORMAL';
    } else if (my_state === 'partner-down' || partner_state === 'partner-down') {
      clusterState = 'PARTNER DOWN';
    } else {
      clusterState = (my_state || 'UNKNOWN').toUpperCase();
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <RouteProgressBar />

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          collapsed={collapsed}
          clusterState={clusterState}
          isClustered={isClustered}
        />
      </div>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        clusterState={clusterState}
        isClustered={isClustered}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <TopNav
          collapsed={collapsed}
          onToggleCollapse={toggleCollapse}
          onOpenMobile={() => setMobileOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
