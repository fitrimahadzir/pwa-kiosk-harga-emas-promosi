import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getDeviceProfile,
  type DeviceProfile,
} from '../utils/device';

export type DeviceOrientation = 'portrait' | 'landscape';

export type OrientationLockStatus =
  | 'checking'
  | 'pending'
  | 'locked'
  | 'unsupported'
  | 'failed'
  | 'not-applicable';

interface ScreenOrientationWithLock {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
}

interface LegacyScreenOrientation {
  lockOrientation?: (orientation: string) => boolean;
  mozLockOrientation?: (orientation: string) => boolean;
  msLockOrientation?: (orientation: string) => boolean;
  unlockOrientation?: () => void;
  mozUnlockOrientation?: () => void;
  msUnlockOrientation?: () => void;
}

interface LockAttemptResult {
  status: 'locked' | 'unsupported' | 'failed';
}

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

function getNativeOrientationApi(): ScreenOrientationWithLock | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.screen?.orientation as unknown as
    | ScreenOrientationWithLock
    | undefined;
}

function getLegacyOrientationApi(): LegacyScreenOrientation | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.screen as unknown as LegacyScreenOrientation | undefined;
}

function getLegacyLock(): ((orientation: string) => boolean) | undefined {
  const legacy = getLegacyOrientationApi();
  return legacy?.lockOrientation ?? legacy?.mozLockOrientation ?? legacy?.msLockOrientation;
}

function getLegacyUnlock(): (() => void) | undefined {
  const legacy = getLegacyOrientationApi();
  return (
    legacy?.unlockOrientation ??
    legacy?.mozUnlockOrientation ??
    legacy?.msUnlockOrientation
  );
}

export function canLockOrientation(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof getNativeOrientationApi()?.lock === 'function' ||
    typeof getLegacyLock() === 'function'
  );
}

async function attemptLandscapeLock(): Promise<LockAttemptResult> {
  const nativeApi = getNativeOrientationApi();

  if (nativeApi && typeof nativeApi.lock === 'function') {
    try {
      await nativeApi.lock('landscape');
      return { status: 'locked' };
    } catch {
      // Includes SecurityError (not installed/fullscreen) and NotSupportedError.
      return { status: 'failed' };
    }
  }

  const legacyLock = getLegacyLock();
  if (legacyLock) {
    try {
      const locked = legacyLock.call(window.screen, 'landscape');
      return { status: locked === false ? 'failed' : 'locked' };
    } catch {
      return { status: 'failed' };
    }
  }

  return { status: 'unsupported' };
}

function unlockOrientation(): void {
  const nativeApi = getNativeOrientationApi();
  if (nativeApi && typeof nativeApi.unlock === 'function') {
    try {
      nativeApi.unlock();
    } catch {
      // No-op: the browser may already be unlocked or restricted by the OS.
    }
  }

  const legacyUnlock = getLegacyUnlock();
  if (legacyUnlock) {
    try {
      legacyUnlock.call(window.screen);
    } catch {
      // No-op.
    }
  }
}

function isDocumentFullscreen(): boolean {
  return (
    typeof document !== 'undefined' && Boolean(document.fullscreenElement)
  );
}

/**
 * Tablet-only orientation management.
 *
 * - Tablets: attempts `screen.orientation.lock('landscape')` when the installed
 *   PWA launches (or when it enters fullscreen). Failures are reported, never
 *   thrown, and the caller can show a manual rotate instruction.
 * - Phones: never locks landscape. If the manifest launches an installed phone
 *   PWA in landscape, we release the orientation so the phone can stay portrait.
 * - Desktops: untouched.
 */
export function useDeviceOrientation() {
  const [profile, setProfile] = useState<DeviceProfile>(() => getDeviceProfile());
  const [orientation, setOrientation] = useState<DeviceOrientation>(() =>
    readOrientation(),
  );
  const [lockStatus, setLockStatus] = useState<OrientationLockStatus>(() => {
    if (typeof window === 'undefined') return 'not-applicable';
    return getDeviceProfile().type === 'tablet' ? 'checking' : 'not-applicable';
  });

  const mountedRef = useRef(true);
  const attemptIdRef = useRef(0);

  // Keep orientation state in sync across both API and legacy events.
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

  const requestLock = useCallback(async (manual = false): Promise<boolean> => {
    const latestProfile = getDeviceProfile();
    setProfile(latestProfile);

    if (latestProfile.type !== 'tablet') {
      setLockStatus('not-applicable');
      return false;
    }

    const canAttempt =
      manual ||
      latestProfile.isInstalledPwa ||
      isDocumentFullscreen();

    if (!canAttempt) {
      setLockStatus('unsupported');
      return false;
    }

    const attemptId = attemptIdRef.current + 1;
    attemptIdRef.current = attemptId;
    setLockStatus('pending');

    const result = await attemptLandscapeLock();

    // Ignore stale results after unmount or a newer lock attempt.
    if (!mountedRef.current || attemptId !== attemptIdRef.current) {
      return result.status === 'locked';
    }

    setLockStatus(result.status);
    return result.status === 'locked';
  }, []);

  // Automatic lock policy: installed tablet PWA (or tablet fullscreen) only.
  useEffect(() => {
    if (profile.type === 'tablet') {
      if (profile.isInstalledPwa || isDocumentFullscreen()) {
        void requestLock();
      } else {
        // Browser tab: the Screen Orientation API needs standalone/fullscreen.
        setLockStatus('unsupported');
      }
      return;
    }

    if (profile.type === 'phone' && profile.isInstalledPwa) {
      // A landscape manifest orientation may have launched a phone sideways.
      // Release it so the phone follows its physical portrait orientation.
      unlockOrientation();
    }

    setLockStatus('not-applicable');
  }, [profile.type, profile.isInstalledPwa, requestLock]);

  // Re-evaluate after installation or when the user enters fullscreen.
  useEffect(() => {
    const refresh = () => {
      const latestProfile = getDeviceProfile();
      setProfile(latestProfile);

      if (latestProfile.type !== 'tablet') return;

      if (latestProfile.isInstalledPwa || isDocumentFullscreen()) {
        void requestLock();
        return;
      }

      // Left fullscreen on a browser tab: the browser releases the lock, so
      // reflect that here instead of leaving a stale "locked" state.
      unlockOrientation();
      setLockStatus('unsupported');
    };

    const handleAppInstalled = () => refresh();
    const handleFullscreenChange = () => refresh();

    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [requestLock]);

  // Release any lock and invalidate in-flight attempts when this guard unmounts.
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      attemptIdRef.current += 1;
      unlockOrientation();
    };
  }, []);

  const retryLock = useCallback(() => {
    void requestLock(true);
  }, [requestLock]);

  const showRotateNotice =
    profile.type === 'tablet' &&
    orientation === 'portrait' &&
    lockStatus !== 'checking' &&
    lockStatus !== 'pending' &&
    lockStatus !== 'locked';

  const canRetryLock =
    profile.type === 'tablet' &&
    profile.isInstalledPwa &&
    canLockOrientation();

  return {
    profile,
    orientation,
    lockStatus,
    showRotateNotice,
    canRetryLock,
    retryLock,
  };
}
