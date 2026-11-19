/**
 * Returns the runtime extension version from manifest.json.
 */
export function getAppVersion(): string {
  try {
    return chrome.runtime?.getManifest?.()?.version || '1.4.3';
  } catch {
    return '1.4.3';
  }
}

export const APP_VERSION = getAppVersion();
