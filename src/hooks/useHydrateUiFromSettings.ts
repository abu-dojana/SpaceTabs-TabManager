import React from 'react';
import { getUserSettings, type UserSettings } from '@/services/settings';
import { useUIStore } from '@/store/uiStore';

/**
 * Hydrates UI store appearance/layout preferences from persisted user settings.
 */
export function useHydrateUiFromSettings(
  onLoaded?: (settings: UserSettings) => void,
  trigger = true
): void {
  const {
    setSidebarTheme,
    setDashboardTheme,
    setAccentColor,
    setDarkPalette,
    setLightPalette,
    setSidebarWidth,
    setPatreonUrl,
  } = useUIStore();

  const onLoadedRef = React.useRef(onLoaded);
  React.useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  React.useEffect(() => {
    if (!trigger) return;
    let mounted = true;
    getUserSettings().then((loaded) => {
      if (!mounted) return;
      if (loaded.sidebarTheme) setSidebarTheme(loaded.sidebarTheme);
      if (loaded.dashboardTheme) setDashboardTheme(loaded.dashboardTheme);
      if (loaded.accentColor) setAccentColor(loaded.accentColor);
      if (loaded.darkPalette) setDarkPalette(loaded.darkPalette);
      if (loaded.lightPalette) setLightPalette(loaded.lightPalette);
      if (loaded.sidebarWidth) setSidebarWidth(loaded.sidebarWidth);
      if (loaded.patreonUrl) setPatreonUrl(loaded.patreonUrl);
      onLoadedRef.current?.(loaded);
    });
    return () => {
      mounted = false;
    };
  }, [
    trigger,
    setSidebarTheme,
    setDashboardTheme,
    setAccentColor,
    setDarkPalette,
    setLightPalette,
    setSidebarWidth,
    setPatreonUrl,
  ]);
}
