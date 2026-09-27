import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Network,
  Bookmark,
  Users,
  Server,
  Rocket,
  Sliders,
  ServerCrash
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  clusterState?: string;
  isClustered?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, clusterState = 'STANDALONE', isClustered = false }) => {
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/subnets', label: 'Subnets & Scopes', icon: Network },
    { to: '/static', label: 'Static Leases', icon: Bookmark },
    { to: '/leases', label: 'Active Leases', icon: Users },
    { to: '/clustering', label: 'Clustering', icon: Server },
    { to: '/deploy', label: 'Deploy & Audit', icon: Rocket },
    { to: '/settings', label: 'Global Settings', icon: Sliders },
  ];

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800 justify-between shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
            <ServerCrash className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white truncate">
                ISC DHCP
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold">
                Web Manager
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cluster Status Strip */}
      <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} text-xs`}>
          {!collapsed && (
            <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">
              Cluster Status
            </span>
          )}
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1.5 ${
              !isClustered
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : clusterState.toLowerCase() === 'normal'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
            title={collapsed ? clusterState : undefined}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                !isClustered
                  ? 'bg-blue-500'
                  : clusterState.toLowerCase() === 'normal'
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500 animate-pulse'
              }`}
            />
            {!collapsed && clusterState}
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm shadow-indigo-500/5'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-center shrink-0">
        {!collapsed ? (
          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            ISC DHCP Server 4.4.3-P1
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            4.4
          </div>
        )}
      </div>
    </aside>
  );
};
