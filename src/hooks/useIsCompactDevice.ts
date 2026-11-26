import { useEffect, useState } from 'react';
import { getDeviceProfile } from '../utils/device';

/**
 * Phone dan tablet sama-sama guna header overlay — hidden secara lalai dan
 * dibuka melalui butang hamburger terapung. Desktop kekalkan header sticky.
 * Profile stabil untuk satu sesi, tetapi semak semula pada resize/orientasi
 * supaya devtools dan split-screen dikesan dengan betul.
 */
export function useIsCompactDevice() {
  const [isCompact, setIsCompact] = useState(() => {
    const type = getDeviceProfile().type;
    return type === 'phone' || type === 'tablet';
  });

  useEffect(() => {
    const update = () => {
      const type = getDeviceProfile().type;
      setIsCompact(type === 'phone' || type === 'tablet');
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isCompact;
}
