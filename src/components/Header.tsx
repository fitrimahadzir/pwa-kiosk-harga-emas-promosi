import React, { useEffect, useState } from 'react';
import {
  LogOut,
  Calculator,
  ShieldCheck,
  Users,
  Menu,
  X,
  Gem,
  ChevronRight,
} from 'lucide-react';
import { ShopSettings } from '../types/gold';
import { useHideOnScrollDown } from '../hooks/useHideOnScrollDown';
import { useIsCompactDevice } from '../hooks/useIsCompactDevice';
import { useIsPhone } from '../hooks/useIsPhone';
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
  /** Pautan ke katalog tempahan jewelry (`#/katalog`). */
  onOpenCatalog?: () => void;
  showCatalog?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  onLogout,
  onOpenAdmin,
  showCalculator = false,
  onToggleCalculator,
  onOpenStaff,
  showStaff = false,
  onOpenCatalog,
  showCatalog = false,
}) => {
  const isScrollHidden = useHideOnScrollDown();
  const isCompact = useIsCompactDevice();
  const isPhone = useIsPhone();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Phone + tablet kiosk: header is never docked in the layout — by default
  // only a small floating hamburger is visible; tapping it opens the header
  // as a temporary overlay. This gives detail pages the full viewport height.
  useEffect(() => {
    if (!isMenuOpen) return;
    const close = () => setIsMenuOpen(false);
    window.addEventListener('scroll', close, { passive: true });
    return () => window.removeEventListener('scroll', close);
  }, [isMenuOpen]);

  const headerPositionClass = isCompact
    ? isMenuOpen
      ? 'fixed inset-x-0 top-0 z-40 shadow-[0_18px_40px_-20px_rgba(42,4,4,0.85)]'
      : 'hidden'
    : `sticky top-0 z-30 transition-transform duration-300 ease-out will-change-transform ${
        isScrollHidden ? '-translate-y-full' : 'translate-y-0'
      }`;

  const closeMenu = () => setIsMenuOpen(false);

  // Susunan dropdown phone sahaja. Semua butang, label, ikon dan gaya asal
  // dikekalkan — hanya arah susunan dan lebar yang diubah pada phone.
  const mobileStackClass = isPhone ? 'flex-col items-stretch' : '';
  const mobileButtonClass = isPhone ? 'w-full' : '';
  const mobileLabelClass = isPhone ? 'inline' : 'hidden sm:inline';

  const navButtonClass = (isActive: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
      isActive
        ? 'border-gold bg-gold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)]'
        : 'border-gold/40 bg-transparent text-gold-soft hover:border-gold/60 hover:bg-gold/10 hover:text-gold'
    }`;

  const staffButtonClass = navButtonClass(showStaff);

  return (
    <>
      {isCompact && (!isPhone || !isMenuOpen) && (
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-controls="kiosk-header"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Tutup kawalan kiosk' : 'Buka kawalan kiosk'}
          title={isMenuOpen ? 'Tutup kawalan kiosk' : 'Buka kawalan kiosk'}
          className={`fixed right-4 z-50 inline-flex size-9 items-center justify-center rounded-lg border border-gold/50 bg-maroon-deep/95 text-gold shadow-lg backdrop-blur-sm transition active:scale-95 ${
            isMenuOpen
              ? 'top-[calc(env(safe-area-inset-top)_+_4.75rem)]'
              : 'top-[calc(env(safe-area-inset-top)_+_0.75rem)]'
          }`}
        >
          {isMenuOpen ? <X size={17} /> : <Menu size={17} />}
        </button>
      )}

      <header
        id="kiosk-header"
        title={`${settings.shopName} • ${settings.branch} • ${settings.phone}`}
        className={`border-b border-line/40 bg-maroon-deep pt-[env(safe-area-inset-top)] backdrop-blur-md ${headerPositionClass}`}
      >
        <div
          className={`mx-auto flex min-h-16 w-full max-w-[1480px] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8 ${mobileStackClass}`}
        >
          {/* Brand identity — pada phone butang tutup duduk sebaris dengan
              logo (dalam dropdown), dengan jarak yang mencukupi. */}
          <div
            className={
              isPhone
                ? 'mb-2 flex w-full items-center justify-between gap-4 px-1 pb-2 pt-4'
                : 'flex min-w-0 items-center gap-2'
            }
          >
            <BrandLogo subtitle={`Outlet: ${settings.outletName}`} />
            <span className="hidden items-center rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold sm:inline-flex">
              Kiosk
            </span>
            {isPhone && isMenuOpen && (
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Tutup kawalan kiosk"
                title="Tutup kawalan kiosk"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-gold/50 bg-maroon-deep/95 text-gold shadow-lg backdrop-blur-sm transition active:scale-95"
              >
                <X size={17} />
              </button>
            )}
          </div>

          {/* Controls — Staff button replaces the old clock/timer widget,
              sitting immediately to the left of the calculator button. */}
          <div
            className={`flex flex-1 flex-wrap items-center justify-end gap-1.5 sm:gap-2 ${mobileStackClass} ${
              isPhone ? 'justify-start pb-3' : ''
            }`}
          >
            {/* Katalog jewelry — pautan terus ke #/katalog */}
            {onOpenCatalog && (
              <a
                href="#/katalog"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenCatalog();
                  closeMenu();
                }}
                className={`${navButtonClass(showCatalog)} ${mobileButtonClass}`}
                title="Buka Katalog Jewelry"
              >
                <Gem size={15} />
                <span className={mobileLabelClass}>Katalog</span>
                {isPhone && (
                  <ChevronRight
                    size={14}
                    className="ml-auto shrink-0 opacity-60"
                    aria-hidden="true"
                  />
                )}
              </a>
            )}

            {onOpenStaff && (
              <button
                onClick={() => {
                  onOpenStaff?.();
                  closeMenu();
                }}
                className={`${staffButtonClass} ${mobileButtonClass}`}
                title="Lihat Prestasi Staff"
              >
                <Users size={15} />
                <span className={mobileLabelClass}>Staff</span>
                {isPhone && (
                  <ChevronRight
                    size={14}
                    className="ml-auto shrink-0 opacity-60"
                    aria-hidden="true"
                  />
                )}
              </button>
            )}

            {/* Calculator Toggle Button */}
            {onToggleCalculator && (
              <button
                onClick={() => {
                  onToggleCalculator?.();
                  closeMenu();
                }}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors ${
                  showCalculator
                    ? 'border-gold bg-gold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)]'
                    : 'border-gold/40 bg-transparent text-gold-soft hover:border-gold/60 hover:bg-gold/10 hover:text-gold'
                } ${mobileButtonClass}`}
                title={showCalculator ? 'Sembunyikan Kalkulator' : 'Buka Kalkulator Jualan'}
              >
                <Calculator size={15} />
                <span className={mobileLabelClass}>
                  {showCalculator ? 'Tutup' : 'Kalkulator'}
                </span>
                {isPhone && (
                  <ChevronRight
                    size={14}
                    className="ml-auto shrink-0 opacity-60"
                    aria-hidden="true"
                  />
                )}
              </button>
            )}

            {/* Admin login (Supabase Auth) — disembunyikan pada dropdown phone
                untuk mengelakkan butang ikon kosong kelihatan janggal. */}
            {onOpenAdmin && !isPhone && (
              <button
                onClick={() => {
                  onOpenAdmin?.();
                  closeMenu();
                }}
                className={`inline-flex h-9 items-center justify-center rounded-lg border border-gold/40 bg-transparent px-2 text-xs font-semibold text-gold-soft transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold ${mobileButtonClass}`}
                title="Log masuk pentadbir"
              >
                <ShieldCheck size={15} className="text-gold" />
              </button>
            )}

            {/* Keluar dari outlet semasa */}
            <button
              onClick={() => {
                onLogout();
                closeMenu();
              }}
              className={`inline-flex h-9 items-center justify-center rounded-lg border border-gold/40 bg-transparent px-2 text-xs font-semibold text-gold-soft transition-colors hover:border-gold/60 hover:bg-gold/10 hover:text-gold ${
                isPhone
                  ? 'ml-auto w-auto border-rose-400/45 bg-rose-500/10 px-3 text-rose-300 hover:border-rose-400/70 hover:bg-rose-500/20 hover:text-rose-200'
                  : ''
              }`}
              title="Tukar outlet"
            >
              <LogOut size={15} className={isPhone ? 'text-rose-300' : 'text-gold'} />
              {isPhone && <span>Log Keluar</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
