import React from 'react';
import {
  getUserSettings,
  DEFAULT_SETTINGS,
  type UserSettings,
} from '@/services/settings';

const SETTINGS_STORAGE_KEY = 'spacetabs_user_settings';

/**
 * Reactively loads user settings from chrome.storage.local and subscribes to live changes.
 */
export function useUserSettings(): UserSettings {
  const [settings, setSettings] = React.useState<UserSettings>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    let mounted = true;
    getUserSettings().then((loaded) => {
      if (mounted) setSettings(loaded);
    });

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes[SETTINGS_STORAGE_KEY]?.newValue) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...changes[SETTINGS_STORAGE_KEY].newValue,
        });
      }
    };

    chrome.storage?.onChanged?.addListener(handleStorageChange);
    return () => {
      mounted = false;
      chrome.storage?.onChanged?.removeListener(handleStorageChange);
    };
  }, []);

  return settings;
}
