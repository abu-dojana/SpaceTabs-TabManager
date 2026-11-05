/**
 * Returns the runtime extension version from manifest.json.
 */
export function getAppVersion(): string {
  try {
    return chrome.runtime?.getManifest?.()?.version || '1.3.1';
  } catch {
    return '1.3.1';
  }
}

export const APP_VERSION = getAppVersion();
