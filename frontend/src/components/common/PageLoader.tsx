import React from 'react';
import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message = 'Synchronizing DHCP State...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in duration-300">
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20 shadow-inner">
          <Loader2 className="w-7 h-7 text-indigo-600 dark:text-indigo-400 animate-spin" />
        </div>
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{message}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Communicating with local controller and failover peers</p>
    </div>
  );
};
