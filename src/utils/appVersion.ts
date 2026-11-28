/**
 * Returns the runtime extension version from manifest.json.
 */
export function getAppVersion(): string {
  try {
    return chrome.runtime?.getManifest?.()?.version || '1.6.0';
  } catch {
    return '1.6.0';
  }
}

export const APP_VERSION = getAppVersion();
