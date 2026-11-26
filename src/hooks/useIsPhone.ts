import { useEffect, useState } from 'react';
import { getDeviceProfile } from '../utils/device';

/** Phone sahaja — digunakan untuk susunan dropdown header mudah alih. */
export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(
    () => getDeviceProfile().type === 'phone',
  );

  useEffect(() => {
    const update = () => setIsPhone(getDeviceProfile().type === 'phone');

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isPhone;
}
