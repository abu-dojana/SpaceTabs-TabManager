export const SUSPENDED_URL_PREFIX = '/suspended.html';

/**
 * Builds the URL for a suspended cold-restore placeholder tab
 */
export function buildSuspendedUrl(realUrl: string, title: string): string {
  const base = chrome.runtime.getURL(SUSPENDED_URL_PREFIX);
  const params = new URLSearchParams({
    url: realUrl,
    title: title || realUrl,
  });
  return `${base}?${params.toString()}`;
}
