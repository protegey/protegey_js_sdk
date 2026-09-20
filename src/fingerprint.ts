import type { DeviceAttributes } from './types.js';

/** True only in a real browser (window + document both exist) — ThumbmarkJS needs a DOM
 * (canvas, WebGL, navigator, screen) and would throw or return garbage anywhere else. */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

/**
 * Computes a stable device/session fingerprint and whatever attributes are safely available in
 * the current environment. In a browser: a real fingerprint from ThumbmarkJS (MIT-licensed,
 * wrapped here — never exposed in this package's public API) plus browser-derived attributes.
 * Outside a browser (Node.js, React Native without a WebView): there's no DOM to fingerprint, so
 * this falls back to a fresh random id — callers on those platforms should pass their own stable
 * `visitorId` (e.g. one they persist via AsyncStorage) through `identify({ visitorId })` instead
 * of relying on this fallback, which is NOT stable across calls.
 */
export async function computeFingerprint(): Promise<{ visitorId: string; attributes: DeviceAttributes }> {
  if (isBrowser()) {
    return computeBrowserFingerprint();
  }
  return {
    visitorId: randomId(),
    attributes: {},
  };
}

async function computeBrowserFingerprint(): Promise<{ visitorId: string; attributes: DeviceAttributes }> {
  const { getFingerprint } = await import('@thumbmarkjs/thumbmarkjs');
  const visitorId = await getFingerprint();

  const attributes: DeviceAttributes = {
    platform: 'Web',
    userAgent: navigator.userAgent,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    isEmulator: detectHeadlessOrAutomation(),
  };

  return { visitorId, attributes };
}

/** Heuristic only, never a hard guarantee — the same convention DeviceAttributesDto documents
 * server-side. Flags the common signs of a headless browser or automation tooling. */
function detectHeadlessOrAutomation(): boolean {
  const nav = navigator as Navigator & { webdriver?: boolean };
  if (nav.webdriver) return true;
  if (/HeadlessChrome/.test(navigator.userAgent)) return true;
  return false;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Extremely defensive fallback for an environment with neither a DOM nor crypto.randomUUID —
  // not cryptographically strong, only needs to be unlikely-to-collide for this one event.
  return `fallback-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
