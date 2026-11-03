import React from 'react';
import {
  getDriveSyncInfo,
  subscribeSyncStatus,
  type DriveSyncInfo,
} from '@/services/driveSync';

/**
 * Loads initial Google Drive sync info and subscribes to live status updates.
 */
export function useDriveSyncInfo(enabled = true): DriveSyncInfo | null {
  const [syncInfo, setSyncInfo] = React.useState<DriveSyncInfo | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    getDriveSyncInfo().then((info) => {
      if (mounted) setSyncInfo(info);
    });
    const unsub = subscribeSyncStatus((info) => {
      if (mounted) setSyncInfo(info);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [enabled]);

  return syncInfo;
}
