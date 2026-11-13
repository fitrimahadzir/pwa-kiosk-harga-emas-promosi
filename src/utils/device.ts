/**
 * Device classification helpers.
 *
 * User-agent strings alone are unreliable (iPadOS now identifies as a Mac,
 * Android tablets often omit the "Mobile" token, and desktop browsers can be
 * resized to any width). The classifier therefore combines:
 *   - touch capability (`maxTouchPoints`)
 *   - screen dimensions and the short/long edge aspect ratio
 *   - user-agent platform hints (iPad, Android tablet, Samsung SM-T/X/P, ...)
 *   - Chromium's User-Agent Client Hints `mobile` flag when available
 */

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface DeviceSignals {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  userAgentDataMobile?: boolean;
}

export interface DeviceProfile {
  type: DeviceType;
  isTouch: boolean;
  isIOS: boolean;
  isIPad: boolean;
  shortestSide: number;
  aspectRatio: number;
  isInstalledPwa: boolean;
}

interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
  };
  standalone?: boolean;
}

/** iPad, Android tablets and common Samsung Galaxy Tab model prefixes. */
const TABLET_UA_HINT =
  /\b(?:ipad|tablet|playbook|silk|kindle|sm-[txp]\d+|nexus (?:7|9|10))\b/i;

/** Explicit phone markers. `Mobile` is omitted by most Android tablets. */
const PHONE_UA_HINT =
  /\b(?:iphone|ipod|windows phone|blackberry|bb10|opera mini|iemobile|mobile)\b/i;

/** Desktop/laptop platforms that also happen to have a touch screen. */
const DESKTOP_PLATFORM_HINT = /windows nt|macintosh|linux x86_64|x11|win32|win64/i;

function positiveNumber(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Pure classifier — exported separately so it can be unit tested without a DOM.
 */
export function classifyDevice(signals: DeviceSignals): DeviceType {
  const userAgent = (signals.userAgent || '').toLowerCase();
  const platform = (signals.platform || '').toLowerCase();
  const touchPoints = Number.isFinite(signals.maxTouchPoints)
    ? Math.max(0, signals.maxTouchPoints)
    : 0;
  const hasTouch = touchPoints > 0;

  const width = positiveNumber(
    signals.screenWidth,
    positiveNumber(signals.viewportWidth, 0),
  );
  const height = positiveNumber(
    signals.screenHeight,
    positiveNumber(signals.viewportHeight, 0),
  );
  const shortestSide = width > 0 && height > 0 ? Math.min(width, height) : 0;
  const longestSide = Math.max(width, height);
  const aspectRatio = shortestSide > 0 ? longestSide / shortestSide : 1;

  // Modern iPadOS reports itself as "Macintosh"/"macOS"; the touch point count
  // is the reliable tell. The size check also covers devtools emulation.
  const isMacPlatform =
    platform === 'macintel' ||
    platform === 'macos' ||
    /\bmacintosh\b/.test(userAgent);
  const isIPad =
    /\bipad\b/.test(userAgent) ||
    (isMacPlatform && (touchPoints > 1 || (hasTouch && shortestSide >= 600)));

  if (isIPad) return 'tablet';
  if (/\b(?:iphone|ipod)\b/.test(userAgent)) return 'phone';

  // Explicit tablet model/UA hints win over the generic `Mobile` token, which
  // some Samsung/Android tablets still include.
  if (TABLET_UA_HINT.test(userAgent)) return 'tablet';

  // Chromium exposes this even when the UA string is reduced/frozen.
  if (signals.userAgentDataMobile === true) return 'phone';
  if (
    signals.userAgentDataMobile === false &&
    /\bandroid\b/.test(userAgent)
  ) {
    return 'tablet';
  }

  // Most Android tablets do not include the "Mobile" UA token; Android phones
  // always do. This is a hint, never the only signal.
  if (/\bandroid\b/.test(userAgent) && !/\bmobile\b/.test(userAgent)) {
    return 'tablet';
  }

  if (PHONE_UA_HINT.test(userAgent)) return 'phone';
  if (!hasTouch) return 'desktop';

  // Touch-only fallback. A phone's shortest edge stays below ~600 CSS px even
  // when it is a large flagship; using the short edge prevents a wide phone in
  // landscape from being mistaken for a tablet.
  const looksTabletSized = shortestSide >= 600 && aspectRatio <= 1.85;
  const looksLikeDesktopPlatform = DESKTOP_PLATFORM_HINT.test(
    `${userAgent} ${platform}`,
  );

  if (looksTabletSized && !looksLikeDesktopPlatform) return 'tablet';
  if (shortestSide >= 600) return 'desktop';
  return 'phone';
}

export function readDeviceSignals(): DeviceSignals {
  if (typeof window === 'undefined') {
    return {
      userAgent: '',
      platform: '',
      maxTouchPoints: 0,
      screenWidth: 0,
      screenHeight: 0,
      viewportWidth: 0,
      viewportHeight: 0,
    };
  }

  const navigatorWithUAData = window.navigator as NavigatorWithUAData;
  const viewportWidth =
    window.innerWidth || document.documentElement?.clientWidth || 0;
  const viewportHeight =
    window.innerHeight || document.documentElement?.clientHeight || 0;

  return {
    userAgent: navigatorWithUAData.userAgent || '',
    platform: navigatorWithUAData.userAgentData?.platform || navigatorWithUAData.platform || '',
    maxTouchPoints: navigatorWithUAData.maxTouchPoints || 0,
    screenWidth: window.screen?.width || viewportWidth,
    screenHeight: window.screen?.height || viewportHeight,
    viewportWidth,
    viewportHeight,
    userAgentDataMobile: navigatorWithUAData.userAgentData?.mobile,
  };
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;

  const navigatorWithStandalone = window.navigator as NavigatorWithUAData;
  if (navigatorWithStandalone.standalone === true) return true;

  if (typeof window.matchMedia !== 'function') return false;

  return ['standalone', 'fullscreen', 'minimal-ui'].some((mode) =>
    window.matchMedia(`(display-mode: ${mode})`).matches,
  );
}

export function getDeviceProfile(): DeviceProfile {
  const signals = readDeviceSignals();
  const userAgent = signals.userAgent.toLowerCase();
  const platform = signals.platform.toLowerCase();
  const isMacPlatform =
    platform === 'macintel' ||
    platform === 'macos' ||
    /\bmacintosh\b/.test(userAgent);
  const shortestSide = Math.min(
    positiveNumber(signals.screenWidth, 0),
    positiveNumber(signals.screenHeight, 0),
  );
  const longestSide = Math.max(
    positiveNumber(signals.screenWidth, 0),
    positiveNumber(signals.screenHeight, 0),
  );

  return {
    type: classifyDevice(signals),
    isTouch: signals.maxTouchPoints > 0,
    isIOS: /\b(?:iphone|ipad|ipod)\b/.test(userAgent) || isMacPlatform,
    isIPad:
      /\bipad\b/.test(userAgent) ||
      (isMacPlatform && signals.maxTouchPoints > 1),
    shortestSide,
    aspectRatio: shortestSide > 0 ? longestSide / shortestSide : 1,
    isInstalledPwa: isStandalonePwa(),
  };
}
