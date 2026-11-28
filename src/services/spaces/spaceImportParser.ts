import { type DriveDataExport } from '@/db/schema';
import { decodeRealUrl } from '@/utils/urlFilter';
import { type SpaceExportPayload } from './spaceExport';

export type ParsedImportFile =
  | { kind: 'workspace'; data: Partial<DriveDataExport> }
  | { kind: 'single_space'; data: SpaceExportPayload };

export function isSafeImportUrl(url: string): boolean {
  const trimmed = (url || '').trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('vbscript:')
  ) {
    return false;
  }
  return true;
}

export function deriveSpaceNameFromFilename(fileName?: string): string {
  if (!fileName) return 'Imported Space';
  return (
    fileName
      .replace(/\.(json|html|htm)$/i, '')
      .replace(/-space$/i, '')
      .replace(/[_-]+/g, ' ')
      .trim() || 'Imported Space'
  );
}

/**
 * Parses either a JSON or HTML export/bookmark file into a normalized import structure.
 */
export function parseImportFileContent(fileText: string, fileName?: string): ParsedImportFile {
  const trimmed = (fileText || '').trim();
  if (!trimmed) {
    throw new Error('The selected file is empty.');
  }

  // 1. Try JSON first if it starts with '{' or '['
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let parsed: any;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error('Invalid JSON file format.');
    }

    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.spaces)) {
        return { kind: 'workspace', data: parsed as Partial<DriveDataExport> };
      }
      if (parsed.space && typeof parsed.space === 'object' && Array.isArray(parsed.tabs)) {
        return { kind: 'single_space', data: parsed as SpaceExportPayload };
      }
      if (Array.isArray(parsed.tabs)) {
        return {
          kind: 'single_space',
          data: {
            app: 'SpaceTabs',
            version: '1.5.1',
            exportedAt: new Date().toISOString(),
            space: { name: deriveSpaceNameFromFilename(fileName), icon: '📁' },
            tabGroups: Array.isArray(parsed.tabGroups) ? parsed.tabGroups : undefined,
            tabs: parsed.tabs,
            notes: Array.isArray(parsed.notes) ? parsed.notes : [],
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            resources: Array.isArray(parsed.resources) ? parsed.resources : [],
          },
        };
      }
    }
    throw new Error('Unrecognized JSON backup structure.');
  }

  // 2. Parse HTML (SpaceTabs HTML with embedded JSON or generic Netscape Bookmark HTML)
  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'text/html');

  const workspaceScript = doc.getElementById('spacetabs-workspace-data');
  if (workspaceScript?.textContent) {
    try {
      const workspaceData = JSON.parse(workspaceScript.textContent);
      if (workspaceData && Array.isArray(workspaceData.spaces)) {
        return { kind: 'workspace', data: workspaceData };
      }
    } catch {}
  }

  const spaceScript = doc.getElementById('spacetabs-space-data');
  if (spaceScript?.textContent) {
    try {
      const spaceData = JSON.parse(spaceScript.textContent);
      if (spaceData && spaceData.space && Array.isArray(spaceData.tabs)) {
        return { kind: 'single_space', data: spaceData as SpaceExportPayload };
      }
    } catch {}
  }

  // 3. Fallback: Standard Browser Bookmark / Generic HTML link extraction
  const anchorNodes = Array.from(doc.querySelectorAll('a[href]'));
  const extractedTabs: SpaceExportPayload['tabs'] = [];

  for (const a of anchorNodes) {
    const rawHref = a.getAttribute('href') || '';
    const cleanUrl = decodeRealUrl(rawHref).trim();
    if (!isSafeImportUrl(cleanUrl)) continue;
    const title = (a.textContent || '').trim() || cleanUrl;
    const iconAttr = a.getAttribute('icon') || undefined;
    extractedTabs.push({
      title,
      url: cleanUrl,
      favIconUrl: iconAttr && iconAttr.startsWith('http') ? iconAttr : undefined,
      order: extractedTabs.length,
    });
  }

  if (extractedTabs.length === 0) {
    throw new Error('No valid links or SpaceTabs data found in the HTML file.');
  }

  const headingText =
    doc.querySelector('dl dt h3')?.textContent?.trim() ||
    doc.querySelector('h1')?.textContent?.trim() ||
    doc.querySelector('title')?.textContent?.replace(/—\s*SpaceTabs$/i, '').trim() ||
    deriveSpaceNameFromFilename(fileName);

  return {
    kind: 'single_space',
    data: {
      app: 'SpaceTabs',
      version: '1.5.1',
      exportedAt: new Date().toISOString(),
      space: {
        name: headingText || 'Imported Bookmarks',
        icon: '📁',
      },
      tabs: extractedTabs,
      notes: [],
      tasks: [],
      resources: [],
    },
  };
}
