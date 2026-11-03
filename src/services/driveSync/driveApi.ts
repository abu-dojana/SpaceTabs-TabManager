import { type DriveDataExport } from '@/db/schema';

const DRIVE_FOLDER_NAME = 'SpaceTabs_Data';
const DATA_FILE_NAME = 'data.json';

export function createHttpError(action: string, status: number): Error {
  const err: any = new Error(`${action}: HTTP ${status}`);
  err.status = status;
  return err;
}

/**
 * Ensures the dedicated `SpaceTabs_Data` folder exists in Google Drive
 */
export async function ensureDriveFolder(
  token: string
): Promise<{ folderId: string; folderUrl: string }> {
  const query = encodeURIComponent(
    `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    throw createHttpError('Failed to locate Drive folder', searchRes.status);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existing = searchData.files[0];
    const folderUrl =
      existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`;
    return { folderId: existing.id, folderUrl };
  }

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Dedicated SpaceTabs workspace cloud sync folder',
    }),
  });

  if (!createRes.ok) {
    throw createHttpError('Failed to create Drive folder', createRes.status);
  }

  const created = await createRes.json();
  const folderUrl = `https://drive.google.com/drive/folders/${created.id}`;
  return { folderId: created.id, folderUrl };
}

/**
 * Finds the `data.json` file inside the `SpaceTabs_Data` folder
 */
export async function findDataFile(
  token: string,
  folderId: string
): Promise<{ fileId: string; modifiedTime?: string } | null> {
  const query = encodeURIComponent(
    `name = '${DATA_FILE_NAME}' and '${folderId}' in parents and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)`;

  const res = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw createHttpError('Failed to check Drive data.json', res.status);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return { fileId: data.files[0].id, modifiedTime: data.files[0].modifiedTime };
  }
  return null;
}

/**
 * Downloads and parses `data.json` content from Google Drive
 */
export async function downloadRemoteData(token: string, fileId: string): Promise<DriveDataExport> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw createHttpError('Failed to download data.json', res.status);
  }

  return (await res.json()) as DriveDataExport;
}

/**
 * Uploads `DriveDataExport` to Google Drive (updates existing file or creates new multipart file)
 */
export async function uploadDataToDrive(
  token: string,
  folderId: string,
  fileId: string | null,
  payload: DriveDataExport
): Promise<{ fileId: string }> {
  const jsonContent = JSON.stringify(payload, null, 2);

  if (fileId) {
    const patchUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonContent,
    });

    if (!res.ok) {
      throw createHttpError('Failed to update data.json', res.status);
    }

    const data = await res.json();
    return { fileId: data.id || fileId };
  }

  const boundary = '-------SpaceTabsMultipartBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: DATA_FILE_NAME,
    parents: [folderId],
    mimeType: 'application/json',
    description: 'SpaceTabs workspace synchronized backup file',
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    jsonContent +
    closeDelimiter;

  const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    throw createHttpError('Failed to create data.json in Drive', res.status);
  }

  const created = await res.json();
  return { fileId: created.id };
}
