// In-app browser detection. Instagram / TikTok / Facebook in-app browsers
// break MediaRecorder, navigator.share, and sometimes localStorage. We
// detect them server-side from the User-Agent and offer a "open in
// Safari/Chrome" banner.

export type InAppBrowser = 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'linkedin' | null;

export function detectInAppBrowser(ua: string | null | undefined): InAppBrowser {
  if (!ua) return null;
  const u = ua.toLowerCase();
  if (u.includes('instagram')) return 'instagram';
  if (u.includes('tiktok') || u.includes('musical_ly')) return 'tiktok';
  if (u.includes('fban') || u.includes('fbav') || u.includes('fb_iab')) return 'facebook';
  if (u.includes('twitter')) return 'twitter';
  if (u.includes('linkedinapp')) return 'linkedin';
  return null;
}

/** Detect iOS so we can pick the right "open in browser" deep link format. */
export function isIOS(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return /iPad|iPhone|iPod/.test(ua) && !/Windows/.test(ua);
}

/** Build a deep link that nudges iOS / Android into the system browser. */
export function externalOpenLink(currentUrl: string, isIOSDevice: boolean): string {
  if (isIOSDevice) {
    // Safari-specific scheme — mostly works, gracefully ignored otherwise.
    return currentUrl.replace(/^https?:\/\//, 'x-safari-https://');
  }
  // Chrome intent for Android.
  const stripped = currentUrl.replace(/^https?:\/\//, '');
  return `intent://${stripped}#Intent;scheme=https;package=com.android.chrome;end`;
}
