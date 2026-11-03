import { type GoogleUserProfile, STORAGE_KEY_TOKEN } from './types';
import {
  getCloudSyncSettings,
  setGoogleProfile,
  updateCloudSyncSettings,
  updateSyncMeta,
} from './storage';
import { setSyncStatus, resetSyncStatus } from './status';
import { DRIVE_SYNC_ALARM, setupDriveSyncAlarm } from './alarm';
import { syncNow } from './sync';

export const WEB_OAUTH_CLIENT_ID =
  '406048483721-mpfdo15c5v7ras28kovgurkcoiqbq1l4.apps.googleusercontent.com';

export async function invalidateAuthToken(token?: string): Promise<void> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY_TOKEN);
    const tokenToRemove = token || stored[STORAGE_KEY_TOKEN];
    if (tokenToRemove && chrome?.identity?.removeCachedAuthToken) {
      await new Promise<void>((resolve) => {
        chrome.identity.removeCachedAuthToken({ token: tokenToRemove }, () => resolve());
      });
    }
  } catch (e) {
    console.warn('[SpaceTabs] Failed to remove cached auth token:', e);
  }
  try {
    await chrome.storage.local.remove([STORAGE_KEY_TOKEN]);
  } catch {}
}

/**
 * Detects whether the current environment is strictly official Google Chrome (which supports native GAIA getAuthToken)
 * or an alternative/privacy Chromium browser (Brave, Vivaldi, Helium, Edge, Opera, Arc) which does not.
 */
async function isOfficialGoogleChrome(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined') return false;

    if ((navigator as any)?.brave && typeof (navigator as any).brave.isBrave === 'function') {
      const isBrave = await (navigator as any).brave.isBrave();
      if (isBrave) return false;
    }

    if (
      (typeof window !== 'undefined' && (window as any).vivaldi) ||
      navigator.userAgent.includes('Vivaldi')
    ) {
      return false;
    }

    const ua = navigator.userAgent || '';
    if (
      ua.includes('Edg/') ||
      ua.includes('OPR/') ||
      (typeof window !== 'undefined' && (window as any).opr)
    ) {
      return false;
    }

    const brands = (navigator as any)?.userAgentData?.brands;
    if (Array.isArray(brands)) {
      const isBrandChrome = brands.some((b: any) => b.brand === 'Google Chrome');
      if (!isBrandChrome) return false;
    } else {
      if (navigator.vendor !== 'Google Inc.') return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Universal Chrome Identity & WebAuthFlow token retriever.
 */
export async function getAuthToken(interactive = true): Promise<string> {
  const settings = await getCloudSyncSettings();

  if (settings.customClientId && settings.customClientId.trim().length > 0) {
    return launchCustomOAuthFlow(settings.customClientId.trim(), interactive);
  }

  const isChrome = await isOfficialGoogleChrome();
  if (isChrome && chrome?.identity?.getAuthToken) {
    try {
      const nativeTokenPromise = new Promise<string>((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive }, (res) => {
          if (chrome.runtime.lastError || !res) {
            return reject(
              new Error(chrome.runtime.lastError?.message || 'No token returned from getAuthToken')
            );
          }
          resolve(res);
        });
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Native getAuthToken timeout')), 1500);
      });

      return await Promise.race([nativeTokenPromise, timeoutPromise]);
    } catch (err: any) {
      console.warn(
        '[SpaceTabs] Native getAuthToken unavailable, timed out, or failed. Falling back to Web OAuth flow:',
        err?.message
      );
    }
  }

  return launchCustomOAuthFlow(WEB_OAUTH_CLIENT_ID, interactive);
}

/**
 * Runs an authenticated Drive operation with automatic token invalidation and single-retry on HTTP 401.
 */
export async function runWithAuthRetry<T>(
  operation: (token: string) => Promise<T>,
  interactive = false
): Promise<T> {
  let token = await getAuthToken(interactive);
  try {
    return await operation(token);
  } catch (err: any) {
    if (err?.status === 401 || (typeof err?.message === 'string' && err.message.includes('401'))) {
      console.warn('[SpaceTabs] 401 Unauthorized encountered. Invalidating token and retrying...');
      await invalidateAuthToken(token);
      token = await getAuthToken(interactive);
      return await operation(token);
    }
    throw err;
  }
}

/**
 * WebAuthFlow for custom client IDs in unpacked extensions
 */
async function launchCustomOAuthFlow(clientId: string, interactive: boolean): Promise<string> {
  const redirectUri = chrome.identity.getRedirectURL();
  const scopes = encodeURIComponent(
    'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
  );
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive }, (redirectUrl) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message || 'OAuth WebFlow error'));
      }
      if (!redirectUrl) {
        return reject(new Error('OAuth flow was cancelled or returned empty URL'));
      }
      try {
        const url = new URL(redirectUrl);
        const hash = url.hash.substring(1);
        const params = new URLSearchParams(hash);
        const token = params.get('access_token');
        if (token) {
          resolve(token);
        } else {
          reject(new Error('No access_token found in OAuth redirect callback'));
        }
      } catch (err: any) {
        reject(new Error(`Failed to parse OAuth redirect URL: ${err.message}`));
      }
    });
  });
}

/**
 * Signs in with Google account and stores profile
 */
export async function signInWithGoogle(
  interactive = true
): Promise<{ success: boolean; profile?: GoogleUserProfile; error?: string }> {
  try {
    setSyncStatus('syncing');
    const token = await getAuthToken(interactive);

    let profile: GoogleUserProfile = {
      id: 'google_user',
      email: 'Google Account',
      name: 'Google User',
      connectedAt: Date.now(),
    };

    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        profile = {
          id: data.id || profile.id,
          email: data.email || profile.email,
          name: data.name || data.email?.split('@')[0] || profile.name,
          picture: data.picture,
          connectedAt: Date.now(),
        };
      }
    } catch (e) {
      console.warn('Could not fetch userinfo, using fallback profile info:', e);
    }

    await setGoogleProfile(profile);
    const updatedSettings = await updateCloudSyncSettings({ enabled: true });
    await chrome.storage.local.set({ [STORAGE_KEY_TOKEN]: token });
    await setupDriveSyncAlarm(updatedSettings.syncIntervalMinutes);
    setSyncStatus('synced');

    syncNow().catch((e) => console.warn('Initial Drive sync error:', e));

    return { success: true, profile };
  } catch (err: any) {
    const errorMsg = err?.message || 'Google sign-in failed';
    setSyncStatus('error', errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Signs out and disconnects Google Drive sync
 */
export async function signOutGoogle(): Promise<void> {
  await invalidateAuthToken();

  await setGoogleProfile(null);
  await updateCloudSyncSettings({ enabled: false });
  await updateSyncMeta({ lastError: null });
  await chrome.storage.local.remove(['spacetabs_mock_drive_data']);
  if (chrome?.alarms) {
    await chrome.alarms.clear(DRIVE_SYNC_ALARM).catch(() => {});
  }
  resetSyncStatus();
}
