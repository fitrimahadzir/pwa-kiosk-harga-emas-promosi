import React from 'react';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { TabletOrientationNotice } from './TabletOrientationNotice';

/**
 * Root-level orientation unlocker. Mounted outside `App` so every screen
 * (outlet picker, kiosk, admin login and admin modal) releases any stale
 * orientation lock. Rotation is now ALLOWED on tablets — no rotate notice.
 */
export function TabletOrientationGuard() {
  const {
    lockStatus,
    showRotateNotice,
    canRetryLock,
    retryLock,
  } = useDeviceOrientation();

  return (
    <TabletOrientationNotice
      show={showRotateNotice}
      lockStatus={lockStatus}
      canRetryLock={canRetryLock}
      onRetryLock={retryLock}
    />
  );
}
