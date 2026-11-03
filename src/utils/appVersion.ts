/**
 * Returns the runtime extension version from manifest.json.
 */
export function getAppVersion(): string {
  try {
    return chrome.runtime?.getManifest?.()?.version || '1.2.2';
  } catch {
    return '1.2.2';
  }
}

export const APP_VERSION = getAppVersion();
