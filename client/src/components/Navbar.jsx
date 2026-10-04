import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Moon, Sun, Server, LogOut, RefreshCw, Menu } from 'lucide-react';

export function Navbar({ serviceStatus, onRefreshService, theme, toggleTheme, onOpenMobileMenu }) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left side: Hamburger button + Service status */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Mobile Hamburger toggle */}
        <button
          className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2.5">
          <Server size={18} className="text-cyan-500" />
          <span className="font-semibold text-sm tracking-tight text-slate-800 dark:text-slate-200">
            isc-dhcp-server
          </span>
        </div>

        {serviceStatus && (
          <div
            className={`badge cursor-pointer ${serviceStatus.active ? 'badge-active' : 'badge-danger'}`}
            onClick={onRefreshService}
            title="Click to refresh service status"
          >
            <span className="pulse-dot" />
            <span className="text-xs">{serviceStatus.active ? 'Active' : 'Stopped'}</span>
            {serviceStatus.pid && (
              <span className="hidden md:inline opacity-70 text-[11px]">PID: {serviceStatus.pid}</span>
            )}
            <RefreshCw size={11} className="ml-1 opacity-70 hover:opacity-100 transition-opacity" />
          </div>
        )}

        {serviceStatus?.isMock && (
          <span className="badge badge-info hidden sm:inline-flex" title="Running in simulated mock mode for Windows/Dev">
            Mock Mode
          </span>
        )}
      </div>

      {/* Right side: Theme Switcher & Admin User Info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <button
          className="btn-icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-slate-600" />}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-white/10">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {user?.name || user?.username}
            </span>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">
              ADMINISTRATOR
            </span>
          </div>
          <button
            className="btn-icon text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
            onClick={logout}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
