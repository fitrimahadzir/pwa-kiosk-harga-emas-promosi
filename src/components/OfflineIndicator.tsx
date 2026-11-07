import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-xl bg-amber-900/90 border border-amber-600/70 px-3.5 py-2 text-xs font-semibold text-amber-200 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      <WifiOff size={14} className="text-amber-400" />
      <span>Mod Luar Talian — Paparan menggunakan data harga & poster tersimpan.</span>
    </div>
  );
};
