export const SUSPENDED_URL_PREFIX = '/suspended.html';

/**
 * Builds the URL for a suspended cold-restore placeholder tab.
 * Places the clean, unencoded original URL after '#' at the end so it remains
 * directly readable and copyable even in browser history or if the extension is removed.
 */
export function buildSuspendedUrl(
  realUrl: string,
  title: string,
  favIconUrl?: string
): string {
  const base = chrome.runtime.getURL(SUSPENDED_URL_PREFIX);
  const params = new URLSearchParams({
    title: title || realUrl,
  });
  if (favIconUrl && favIconUrl.startsWith('http')) {
    params.set('fav', favIconUrl);
  }
  return `${base}?${params.toString()}#${realUrl}`;
}
