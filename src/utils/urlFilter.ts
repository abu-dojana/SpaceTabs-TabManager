/**
 * URL Utilities for Tab Manager
 */

export function isSystemOrExtensionUrl(url?: string): boolean {
  if (!url) return false;
  // Suspended placeholder tabs represent real tabs
  if (url.includes('/suspended.html')) return false;

  const lower = url.toLowerCase();

  // Filter out the extension's own dashboard tab so it doesn't list itself as a space tab
  if (lower.includes('/dashboard.html')) return true;

  // Filter out DevTools inspector tabs/windows
  if (lower.startsWith('devtools://')) return true;

  // Internal tabs (chrome://extensions, chrome://newtab, about:blank, etc.) are now allowed
  return false;
}

export function decodeRealUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('/suspended.html')) {
    try {
      const parsed = new URL(url);
      const target = parsed.searchParams.get('url');
      if (target) return target;
    } catch {
      // Fallback to raw URL
    }
  }
  return url;
}

export function extractDomain(url?: string): string {
  if (!url) return 'other';
  try {
    const real = decodeRealUrl(url);
    if (
      real.startsWith('chrome://') ||
      real.startsWith('edge://') ||
      real.startsWith('brave://')
    ) {
      const match = real.match(/^[a-z]+:\/\/([a-z0-9_-]+)/i);
      return match ? match[1] : 'chrome';
    }
    if (real.startsWith('about:')) {
      return 'newtab';
    }
    const parsed = new URL(real);
    return parsed.hostname.replace(/^www\./, '') || 'other';
  } catch {
    return 'other';
  }
}
