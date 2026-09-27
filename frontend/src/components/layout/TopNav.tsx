import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  User
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface TopNavProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenMobile: () => void;
}

const titles: Record<string, string> = {
  '/': 'Dashboard Overview',
  '/dashboard': 'Dashboard Overview',
  '/subnets': 'DHCP Scopes & Subnet Management',
  '/static': 'Static Address Reservations',
  '/leases': 'Active Client Leases Explorer',
  '/clustering': 'High Availability Cluster Management',
  '/deploy': 'Cluster Configuration Deployment & Audit',
  '/settings': 'Global Server Options',
};

export const TopNav: React.FC<TopNavProps> = ({
  collapsed,
  onToggleCollapse,
  onOpenMobile,
}) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const title = titles[location.pathname] || 'DHCP Management Console';

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      {/* Left controls & page title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onOpenMobile}
          className="p-2 -ml-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Desktop collapse button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>

        <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
          {title}
        </h1>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 hover:text-amber-300" />
          ) : (
            <Moon className="w-5 h-5 text-indigo-600 hover:text-indigo-700" />
          )}
        </button>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* User Profile & Logout */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
            admin
          </span>
          <button
            onClick={() => logout()}
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
