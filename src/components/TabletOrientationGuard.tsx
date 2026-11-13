import React from 'react';
import { useDeviceOrientation } from '../hooks/useDeviceOrientation';
import { TabletOrientationNotice } from './TabletOrientationNotice';

/**
 * Root-level orientation guard. It is intentionally mounted outside `App` so
 * every screen (outlet picker, kiosk, admin login and admin modal) shares the
 * same tablet rotation policy without duplicating logic in each render branch.
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
