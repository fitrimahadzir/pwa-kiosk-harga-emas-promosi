import { useEffect, useState } from 'react';

const DEFAULT_THRESHOLD = 80;
const MIN_DELTA = 4;

/**
 * Hidden state for a sticky header: hides once the user scrolls down past
 * `threshold`, and reveals it again on any upward scroll or near the top.
 */
export function useHideOnScrollDown(threshold = DEFAULT_THRESHOLD) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastY;

      if (currentY <= threshold || delta < -MIN_DELTA) {
        setHidden(false);
      } else if (delta > MIN_DELTA) {
        setHidden(true);
      }

      lastY = currentY;
    };

    const handleScroll = () => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [threshold]);

  return hidden;
}
