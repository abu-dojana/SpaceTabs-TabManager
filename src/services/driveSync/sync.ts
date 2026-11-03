import { db } from '@/db';
import { type DriveDataExport, UNSAVED_SPACE_ID } from '@/db/schema';
import { withSyncLock, stripRuntimeTabFields } from './lock';
import { getGoogleProfile, getSyncMeta, updateSyncMeta, setTombstones } from './storage';
import { setSyncStatus } from './status';
import { runWithAuthRetry } from './auth';
import {
  ensureDriveFolder,
  findDataFile,
  downloadRemoteData,
  uploadDataToDrive,
} from './driveApi';
import { buildLocalExport, mergeRemoteAndLocal } from './merge';

/**
 * Bi-directional Sync:
 * Pulls remote changes from Google Drive, merges locally, and pushes back the merged state.
 */
export async function syncNow(): Promise<{
  success: boolean;
  message: string;
  stats?: { spaces: number; tabs: number; notes: number; tasks: number; resources: number };
}> {
  return withSyncLock(async () => {
    const profile = await getGoogleProfile();
    if (!profile) {
      return { success: false, message: 'Google account is not connected.' };
    }

    setSyncStatus('syncing');

    try {
      const mergedPayload = await runWithAuthRetry(async (token) => {
        const { folderId, folderUrl } = await ensureDriveFolder(token);
        const existingFile = await findDataFile(token, folderId);

        const remoteData = existingFile
          ? await downloadRemoteData(token, existingFile.fileId)
          : null;
        const localData = await buildLocalExport();
        const payload = remoteData
          ? await mergeRemoteAndLocal(remoteData, localData)
          : localData;

        const uploadRes = await uploadDataToDrive(
          token,
          folderId,
          existingFile?.fileId || null,
          payload
        );

        const now = Date.now();
        await updateSyncMeta({
          lastSyncTime: now,
          folderId,
          fileId: uploadRes.fileId,
          folderUrl,
          lastError: null,
        });

        return payload;
      }, false);

      setSyncStatus('synced');
      return {
        success: true,
        message: 'Synced successfully with Google Drive!',
        stats: {
          spaces: mergedPayload.spaces.length,
          tabs: mergedPayload.tabs.length,
          notes: mergedPayload.notes.length,
          tasks: mergedPayload.tasks.length,
          resources: mergedPayload.resourceItems.length,
        },
      };
    } catch (err: any) {
      const errorMsg = err?.message || 'Sync failed';
      setSyncStatus('error', errorMsg);
      await updateSyncMeta({ lastError: errorMsg });
      return { success: false, message: errorMsg };
    }
  });
}

/**
 * Force Push: Overwrites Google Drive data with current local workspace state
 */
export async function forcePushToDrive(): Promise<{ success: boolean; message: string }> {
  return withSyncLock(async () => {
    const profile = await getGoogleProfile();
    if (!profile) return { success: false, message: 'Google account is not connected.' };

    setSyncStatus('syncing');

    try {
      const localData = await buildLocalExport();

      await runWithAuthRetry(async (token) => {
        const { folderId, folderUrl } = await ensureDriveFolder(token);
        const existingFile = await findDataFile(token, folderId);

        const uploadRes = await uploadDataToDrive(
          token,
          folderId,
          existingFile?.fileId || null,
          localData
        );

        await updateSyncMeta({
          lastSyncTime: Date.now(),
          folderId,
          fileId: uploadRes.fileId,
          folderUrl,
          lastError: null,
        });
      }, false);

      setSyncStatus('synced');
      return { success: true, message: 'Workspace data uploaded to Google Drive!' };
    } catch (err: any) {
      const msg = err?.message || 'Failed to upload to Drive';
      setSyncStatus('error', msg);
      return { success: false, message: msg };
    }
  });
}

/**
 * Force Pull: Overwrites local saved workspaces with Google Drive backup while preserving
 * all local-only Unsaved sessions and their tabs, notes, tasks, and resources.
 */
export async function forcePullFromDrive(): Promise<{ success: boolean; message: string }> {
  return withSyncLock(async () => {
    const profile = await getGoogleProfile();
    if (!profile) return { success: false, message: 'Google account is not connected.' };

    setSyncStatus('syncing');

    try {
      const restoredCount = await runWithAuthRetry(async (token) => {
        const meta = await getSyncMeta();
        let fileId = meta.fileId;

        if (!fileId) {
          const { folderId } = await ensureDriveFolder(token);
          const existing = await findDataFile(token, folderId);
          fileId = existing?.fileId;
        }

        if (!fileId) {
          throw new Error('No backup file found in your Google Drive folder.');
        }

        const remoteData: DriveDataExport = await downloadRemoteData(token, fileId);

        if (!remoteData || !Array.isArray(remoteData.spaces)) {
          throw new Error('Remote backup file is empty or invalid.');
        }

        const remoteSavedSpaces = remoteData.spaces.filter((s) => !s.isUnsaved);
        const remoteSavedSpaceIds = new Set(remoteSavedSpaces.map((s) => s.id));

        await db.transaction(
          'rw',
          [
            db.spaces,
            db.tabs,
            db.resourceSections,
            db.resourceItems,
            db.notes,
            db.tasks,
          ],
          async () => {
            const currentSpaces = await db.spaces.toArray();
            const localOnlySpaceIds = new Set<string>([
              UNSAVED_SPACE_ID,
              ...currentSpaces.filter((s) => !!s.isUnsaved).map((s) => s.id),
            ]);
            const isLocalOnlySpace = (spaceId: string) => localOnlySpaceIds.has(spaceId);

            const currentTabs = await db.tabs.toArray();
            const localTabBindings = new Map<string, { chromeTabId?: number; windowId?: number }>();
            for (const ct of currentTabs) {
              if (ct.chromeTabId !== undefined || ct.windowId !== undefined) {
                localTabBindings.set(ct.id, {
                  chromeTabId: ct.chromeTabId,
                  windowId: ct.windowId,
                });
              }
            }

            const savedSpaceIdsToDelete = currentSpaces
              .filter((s) => !s.isUnsaved)
              .map((s) => s.id);
            if (savedSpaceIdsToDelete.length > 0) {
              await db.spaces.bulkDelete(savedSpaceIdsToDelete);
            }

            const savedTabIdsToDelete = currentTabs
              .filter((t) => !isLocalOnlySpace(t.spaceId))
              .map((t) => t.id);
            if (savedTabIdsToDelete.length > 0) {
              await db.tabs.bulkDelete(savedTabIdsToDelete);
            }

            const currentSections = await db.resourceSections.toArray();
            const localOnlySectionIds = new Set(
              currentSections.filter((s) => isLocalOnlySpace(s.spaceId)).map((s) => s.id)
            );
            const savedSectionIdsToDelete = currentSections
              .filter((s) => !isLocalOnlySpace(s.spaceId))
              .map((s) => s.id);
            if (savedSectionIdsToDelete.length > 0) {
              await db.resourceSections.bulkDelete(savedSectionIdsToDelete);
            }

            const currentItems = await db.resourceItems.toArray();
            const savedItemIdsToDelete = currentItems
              .filter((i) => !localOnlySectionIds.has(i.sectionId))
              .map((i) => i.id);
            if (savedItemIdsToDelete.length > 0) {
              await db.resourceItems.bulkDelete(savedItemIdsToDelete);
            }

            const currentNotes = await db.notes.toArray();
            const savedNoteIdsToDelete = currentNotes
              .filter((n) => !isLocalOnlySpace(n.spaceId))
              .map((n) => n.id);
            if (savedNoteIdsToDelete.length > 0) {
              await db.notes.bulkDelete(savedNoteIdsToDelete);
            }

            const currentTasks = await db.tasks.toArray();
            const savedTaskIdsToDelete = currentTasks
              .filter((t) => !isLocalOnlySpace(t.spaceId))
              .map((t) => t.id);
            if (savedTaskIdsToDelete.length > 0) {
              await db.tasks.bulkDelete(savedTaskIdsToDelete);
            }

            if (remoteSavedSpaces.length > 0) {
              await db.spaces.bulkPut(remoteSavedSpaces);
            }
            if (remoteData?.tabs?.length) {
              const savedTabs = remoteData.tabs
                .filter(
                  (t) =>
                    t.spaceId !== UNSAVED_SPACE_ID &&
                    !localOnlySpaceIds.has(t.spaceId) &&
                    remoteSavedSpaceIds.has(t.spaceId)
                )
                .map((t) => {
                  const clean = stripRuntimeTabFields(t);
                  const binding = localTabBindings.get(clean.id);
                  return binding ? { ...clean, ...binding } : clean;
                });
              if (savedTabs.length > 0) await db.tabs.bulkPut(savedTabs);
            }

            const validRemoteSections = (remoteData?.resourceSections || []).filter(
              (s) => !localOnlySpaceIds.has(s.spaceId) && remoteSavedSpaceIds.has(s.spaceId)
            );
            const validRemoteSectionIds = new Set(validRemoteSections.map((s) => s.id));
            if (validRemoteSections.length > 0) {
              await db.resourceSections.bulkPut(validRemoteSections);
            }

            if (remoteData?.resourceItems?.length) {
              const validRemoteItems = remoteData.resourceItems.filter((i) =>
                validRemoteSectionIds.has(i.sectionId)
              );
              if (validRemoteItems.length > 0) {
                await db.resourceItems.bulkPut(validRemoteItems);
              }
            }

            if (remoteData?.notes?.length) {
              const validRemoteNotes = remoteData.notes.filter(
                (n) => !localOnlySpaceIds.has(n.spaceId) && remoteSavedSpaceIds.has(n.spaceId)
              );
              if (validRemoteNotes.length > 0) await db.notes.bulkPut(validRemoteNotes);
            }

            if (remoteData?.tasks?.length) {
              const validRemoteTasks = remoteData.tasks.filter(
                (t) => !localOnlySpaceIds.has(t.spaceId) && remoteSavedSpaceIds.has(t.spaceId)
              );
              if (validRemoteTasks.length > 0) await db.tasks.bulkPut(validRemoteTasks);
            }
          }
        );

        const remoteTombstones = Array.isArray(remoteData.deletedIds) ? remoteData.deletedIds : [];
        await setTombstones(remoteTombstones);

        await updateSyncMeta({ lastSyncTime: Date.now(), lastError: null });
        return remoteSavedSpaces.length;
      }, false);

      setSyncStatus('synced');
      return {
        success: true,
        message: `Restored ${restoredCount} spaces from Google Drive!`,
      };
    } catch (err: any) {
      const msg = err?.message || 'Failed to pull from Drive';
      setSyncStatus('error', msg);
      return { success: false, message: msg };
    }
  });
}
