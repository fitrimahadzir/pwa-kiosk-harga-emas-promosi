import React from 'react';
import { RefreshCw, RotateCw, Tablet } from 'lucide-react';
import type { OrientationLockStatus } from '../hooks/useDeviceOrientation';

interface TabletOrientationNoticeProps {
  show: boolean;
  lockStatus: OrientationLockStatus;
  canRetryLock: boolean;
  onRetryLock: () => void;
}

/**
 * Full-screen fallback shown only on tablets in portrait when the browser
 * cannot lock the tablet to landscape. Phones and desktops never see this.
 */
export function TabletOrientationNotice({
  show,
  lockStatus,
  canRetryLock,
  onRetryLock,
}: TabletOrientationNoticeProps) {
  if (!show) return null;

  const hideAutomaticNote =
    lockStatus === 'checking' ||
    lockStatus === 'pending' ||
    lockStatus === 'locked' ||
    lockStatus === 'not-applicable';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="tablet-orientation-title"
      aria-describedby="tablet-orientation-description"
      className="fixed inset-0 z-[100] flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-y-auto bg-maroon-deep px-8 py-10 text-center text-cream"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(212,161,58,0.18),transparent_55%)]"
      />

      <div className="relative flex w-full max-w-md flex-col items-center gap-6">
        <div className="relative grid size-28 place-items-center rounded-[2rem] border border-gold/30 bg-maroon/40 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]">
          <Tablet size={56} className="-rotate-90 text-gold-soft" />
          <span className="absolute -bottom-2 -right-2 grid size-11 place-items-center rounded-full border border-gold-soft/40 bg-gold text-maroon-deep shadow-lg">
            <RotateCw size={21} />
          </span>
        </div>

        <div>
          <p className="gr-kicker">Paparan Tablet</p>
          <h1
            id="tablet-orientation-title"
            className="mt-2 font-serif text-2xl font-bold leading-tight text-cream sm:text-3xl"
          >
            Sila putarkan peranti ke landskap
          </h1>
          <p
            id="tablet-orientation-description"
            className="mt-3 text-sm leading-relaxed text-cream/75"
          >
            Aplikasi kaunter menggunakan susun atur melintang supaya papan harga
            dan poster promosi dipaparkan dengan lebih jelas.
          </p>
        </div>

        {!hideAutomaticNote && (
          <p className="rounded-xl border border-gold/20 bg-maroon/30 px-4 py-3 text-xs leading-relaxed text-gold-soft/80">
            {lockStatus === 'failed'
              ? 'Kunci orientasi automatik tidak berjaya. Sila putar peranti secara manual.'
              : 'Pelayar ini tidak menyokong kunci orientasi automatik. Sila putar peranti secara manual.'}
          </p>
        )}

        {canRetryLock && (
          <button
            type="button"
            onClick={onRetryLock}
            className="inline-flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-maroon-deep shadow-[0_16px_36px_-26px_rgba(212,161,58,0.75)] transition hover:bg-gold-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-soft active:scale-[0.99]"
          >
            <RefreshCw size={16} />
            Cuba kunci landskap
          </button>
        )}

        <p className="text-[11px] leading-relaxed text-gold-soft/45">
          Paparan akan kembali normal apabila peranti diletakkan dalam kedudukan
          melintang.
        </p>
      </div>
    </div>
  );
}
