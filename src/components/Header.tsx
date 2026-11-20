import React from 'react';
import { LogOut, Calculator, ShieldCheck, Users } from 'lucide-react';
import { ShopSettings } from '../types/gold';
import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  settings: ShopSettings;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  lastSyncTime?: string;
  showCalculator?: boolean;
  onToggleCalculator?: () => void;
  /** Buka halaman prestasi staff (butang menggantikan widget jam lama). */
  onOpenStaff?: () => void;
  showStaff?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onLogout,
  onOpenAdmin,
  showCalculator = false,
  onToggleCalculator,
  onOpenStaff,
  showStaff = false,
}) => {
  const staffButtonClass = `inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
    showStaff
      ? 'border-gold bg-gold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)]'
      : 'border-gold/40 bg-transparent text-gold-soft hover:border-gold/60 hover:bg-gold/10 hover:text-gold'
  }`;

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

          {/* Controls — Staff button replaces the old clock/timer widget,
              sitting immediately to the left of the calculator button. */}
          <div className="flex flex-1 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {onOpenStaff && (
              <button
                onClick={onOpenStaff}
                className={staffButtonClass}
                title="Lihat Prestasi Staff"
              >
                <Users size={15} />
                <span className="hidden sm:inline">Staff</span>
              </button>
            )}

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

            {/* Admin login (Supabase Auth) */}
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gold/40 bg-transparent px-2 text-xs font-semibold text-gold-soft transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold"
                title="Log masuk pentadbir"
              >
                <ShieldCheck size={15} className="text-gold" />
              </button>
            )}

            {/* Keluar dari outlet semasa */}
            <button
              onClick={onLogout}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-gold/40 bg-transparent px-2 text-xs font-semibold text-gold-soft transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold"
              title="Tukar outlet"
            >
              <LogOut size={15} className="text-gold" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
