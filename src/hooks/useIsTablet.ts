import { useEffect, useState } from 'react';
import { getDeviceProfile } from '../utils/device';

/**
 * Device profile is stable for a session, but re-check on resize/orientation
 * events so tablet detection also works in browser devtools and split-screen.
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(
    () => getDeviceProfile().type === 'tablet',
  );

  useEffect(() => {
    const update = () => setIsTablet(getDeviceProfile().type === 'tablet');

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isTablet;
}
