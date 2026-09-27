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
  ServerCrash,
  X
} from 'lucide-react';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  clusterState?: string;
  isClustered?: boolean;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  open,
  onClose,
  clusterState = 'STANDALONE',
  isClustered = false,
}) => {
  if (!open) return null;

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
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <ServerCrash className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm text-slate-900 dark:text-white">ISC DHCP</span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Web Manager</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Strip */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Cluster Status</span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1.5 ${
              !isClustered
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                : clusterState.toLowerCase() === 'normal'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
            }`}
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
            {clusterState}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
