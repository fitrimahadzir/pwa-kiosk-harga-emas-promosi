import React, { useState, useEffect } from 'react';
import { Clock, LogOut, Calculator } from 'lucide-react';
import { ShopSettings } from '../types/gold';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  settings: ShopSettings;
  onLogout: () => void;
  lastSyncTime?: string;
  showCalculator?: boolean;
  onToggleCalculator?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onLogout,
  showCalculator = false,
  onToggleCalculator,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Digital clock update every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date in Malay format (e.g. "Khamis, 6 November 2026")
  const formattedDate = currentTime.toLocaleDateString('ms-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const formattedTime = currentTime.toLocaleTimeString('ms-MY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <>
      <header
        title={`${settings.shopName} • ${settings.branch} • ${settings.phone}`}
        className="sticky top-0 z-30 border-b border-line/40 bg-maroon-deep pt-[env(safe-area-inset-top)] backdrop-blur-md"
      >
        <div className="mx-auto flex min-h-16 w-full max-w-[1480px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
          {/* Brand identity */}
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo subtitle={`Outlet: ${settings.outletName}`} />
            <span className="hidden items-center rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold sm:inline-flex">
              Kiosk
            </span>
          </div>

          {/* Live Clock & Controls */}
          <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {/* Clock Widget - icon only */}
            <div className="flex items-center justify-center rounded-lg border border-line/60 bg-maroon/30 px-1.5 py-1">
              <Clock size={15} className="text-gold" />
            </div>

            {/* Calculator Toggle Button */}
            {onToggleCalculator && (
              <button
                onClick={onToggleCalculator}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  showCalculator
                    ? 'border-gold bg-gold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)]'
                    : 'border-gold/40 bg-transparent text-gold-soft hover:border-gold/60 hover:bg-gold/10 hover:text-gold'
                }`}
                title={showCalculator ? 'Sembunyikan Kalkulator' : 'Buka Kalkulator Jualan'}
              >
                <Calculator size={15} />
                <span className="hidden sm:inline">
                  {showCalculator ? 'Tutup' : 'Kalkulator'}
                </span>
              </button>
            )}

            {/* Logout Button - icon only */}
            <button
              onClick={onLogout}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-gold/40 bg-transparent px-2 text-xs font-semibold text-gold-soft transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold"
              title="Keluar dari outlet semasa"
            >
              <LogOut size={15} className="text-gold" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
