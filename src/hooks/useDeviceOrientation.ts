import { useEffect, useState } from 'react';

export type DeviceOrientation = 'portrait' | 'landscape';

/**
 * Kekal dieksport untuk keserasian komponen lama. Kini tiada kunci orientasi
 * dipaksa — semua peranti, termasuk tablet, dibenarkan berputar.
 */
export type OrientationLockStatus =
  | 'checking'
  | 'pending'
  | 'locked'
  | 'unsupported'
  | 'failed'
  | 'not-applicable';

function readOrientation(): DeviceOrientation {
  if (typeof window === 'undefined') return 'landscape';

  const orientationType = window.screen?.orientation?.type;
  if (orientationType) {
    if (orientationType.startsWith('portrait')) return 'portrait';
    if (orientationType.startsWith('landscape')) return 'landscape';
  }

  if (typeof window.matchMedia === 'function') {
    if (window.matchMedia('(orientation: portrait)').matches) return 'portrait';
    if (window.matchMedia('(orientation: landscape)').matches) return 'landscape';
  }

  return (window.innerHeight || 0) >= (window.innerWidth || 0)
    ? 'portrait'
    : 'landscape';
}

/**
 * Lepaskan sebarang kunci orientasi lama (daripada manifest lama, fullscreen,
 * atau sesi sebelumnya) supaya peranti benar-benar bebas berputar.
 */
function unlockOrientation(): void {
  if (typeof window === 'undefined') return;

  const nativeApi = window.screen?.orientation as
    | { unlock?: () => void }
    | undefined;
  if (nativeApi && typeof nativeApi.unlock === 'function') {
    try {
      nativeApi.unlock();
    } catch {
      // Pelayar mungkin tidak membenarkan unlock di luar standalone/fullscreen.
    }
  }

  const legacy = window.screen as unknown as
    | {
        unlockOrientation?: () => void;
        mozUnlockOrientation?: () => void;
        msUnlockOrientation?: () => void;
      }
    | undefined;
  const legacyUnlock =
    legacy?.unlockOrientation ??
    legacy?.mozUnlockOrientation ??
    legacy?.msUnlockOrientation;
  if (legacyUnlock) {
    try {
      legacyUnlock.call(window.screen);
    } catch {
      // No-op.
    }
  }
}

/**
 * Rotation dibenarkan pada semua peranti termasuk tablet.
 *
 * Hook ini hanya:
 *  - memantau orientasi semasa (untuk keperluan layout responsif);
 *  - melepaskan kunci orientasi lama semasa boot / install / fullscreen.
 *
 * Tiada lagi `screen.orientation.lock('landscape')` dan tiada skrin arahan
 * "Sila putarkan peranti ke landskap".
 */
export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<DeviceOrientation>(() =>
    readOrientation(),
  );

  useEffect(() => {
    const update = () => setOrientation(readOrientation());
    const orientationApi = window.screen?.orientation;
    const hasOrientationEvents =
      typeof orientationApi?.addEventListener === 'function';

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('fullscreenchange', update);
    if (hasOrientationEvents) {
      orientationApi.addEventListener('change', update);
    }

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('fullscreenchange', update);
      if (hasOrientationEvents) {
        orientationApi.removeEventListener('change', update);
      }
    };
  }, []);

  useEffect(() => {
    const release = () => unlockOrientation();
    release();

    window.addEventListener('appinstalled', release);
    document.addEventListener('fullscreenchange', release);
    return () => {
      window.removeEventListener('appinstalled', release);
      document.removeEventListener('fullscreenchange', release);
    };
  }, []);

  return {
    orientation,
    lockStatus: 'not-applicable' as OrientationLockStatus,
    showRotateNotice: false,
    canRetryLock: false,
    retryLock: () => {},
  };
}
