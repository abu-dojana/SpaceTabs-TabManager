import { getCloudSyncSettings, getGoogleProfile } from './storage';

export const DRIVE_SYNC_ALARM = 'spacetabs-drive-sync-alarm';

export async function setupDriveSyncAlarm(intervalMinutes = 15): Promise<void> {
  if (!chrome?.alarms) return;
  try {
    await chrome.alarms.clear(DRIVE_SYNC_ALARM);
    const settings = await getCloudSyncSettings();
    const profile = await getGoogleProfile();

    if (settings.enabled && settings.autoSync && profile) {
      chrome.alarms.create(DRIVE_SYNC_ALARM, {
        periodInMinutes: Math.max(5, intervalMinutes),
        delayInMinutes: 2,
      });
    }
  } catch (err) {
    console.warn('Failed to configure drive sync alarm:', err);
  }
}
