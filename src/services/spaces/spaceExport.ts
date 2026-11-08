import { db } from '@/db';
import { type DriveDataExport, UNSAVED_SPACE_ID } from '@/db/schema';
import { getAppVersion } from '@/utils/appVersion';
import { downloadFile } from '@/utils/download';
import { decodeRealUrl } from '@/utils/urlFilter';

export type ExportFormat = 'json' | 'html';

export interface SpaceExportPayload {
  app: string;
  version: string;
  exportedAt: string;
  space: {
    name: string;
    icon?: string;
    description?: string;
    section?: string;
  };
  tabs: {
    title: string;
    url: string;
    favIconUrl?: string;
    order: number;
  }[];
  notes: {
    title: string;
    content: string;
  }[];
  tasks: {
    text: string;
    completed: boolean;
    order: number;
    dueDate?: number;
  }[];
  resources: {
    title: string;
    order: number;
    items: {
      title: string;
      url: string;
      type: string;
    }[];
  }[];
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/<\//g, '<\\/');
}

const HTML_EXPORT_STYLES = `
  :root { color-scheme: dark light; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
    background: #0f172a;
    color: #f1f5f9;
    max-width: 880px;
    margin: 0 auto;
    padding: 36px 24px 64px;
    line-height: 1.5;
  }
  .st-header {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 14px;
    padding: 20px 24px;
    margin-bottom: 24px;
  }
  h1 {
    margin: 0 0 6px;
    font-size: 22px;
    color: #f8fafc;
  }
  .st-meta {
    font-size: 12px;
    color: #94a3b8;
  }
  .st-desc {
    margin-top: 8px;
    font-size: 13px;
    color: #cbd5e1;
  }
  dl {
    margin: 0;
    padding: 0;
  }
  dt {
    list-style: none;
    margin: 6px 0;
  }
  h3 {
    margin: 22px 0 10px;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #60a5fa;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 6px;
  }
  a {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    color: #e2e8f0;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    transition: border-color 0.15s, background 0.15s;
  }
  a:hover {
    background: #26354d;
    border-color: #3b82f6;
    color: #ffffff;
  }
  .st-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 12px 16px;
    margin: 8px 0;
    font-size: 13px;
  }
  .st-card-title {
    font-weight: 600;
    color: #f8fafc;
    margin-bottom: 4px;
  }
  .st-card-body {
    white-space: pre-wrap;
    color: #cbd5e1;
    font-size: 12px;
  }
  .st-task-done {
    text-decoration: line-through;
    color: #64748b;
  }
`;

/**
 * Builds a single-space JSON export payload.
 */
export async function buildSpaceExport(
  spaceId: string | null,
  fallbackName = 'Unsaved Session'
): Promise<SpaceExportPayload> {
  const targetId = spaceId || UNSAVED_SPACE_ID;
  const space = spaceId ? await db.spaces.get(spaceId) : undefined;
  const spaceName = space?.name || fallbackName;

  const [spaceTabs, notes, tasks, sections] = await Promise.all([
    db.tabs.where('spaceId').equals(targetId).sortBy('order'),
    db.notes.where('spaceId').equals(targetId).toArray(),
    db.tasks.where('spaceId').equals(targetId).sortBy('order'),
    db.resourceSections.where('spaceId').equals(targetId).sortBy('order'),
  ]);

  const resourcesData = [];
  for (const sec of sections) {
    const items = await db.resourceItems.where('sectionId').equals(sec.id).toArray();
    resourcesData.push({
      title: sec.title,
      order: sec.order,
      items: items.map((it) => ({
        title: it.title,
        url: decodeRealUrl(it.url),
        type: it.type,
      })),
    });
  }

  return {
    app: 'SpaceTabs',
    version: getAppVersion(),
    exportedAt: new Date().toISOString(),
    space: {
      name: spaceName,
      icon: space?.icon,
      description: space?.description,
      section: space?.section,
    },
    tabs: spaceTabs.map((t) => ({
      title: t.title,
      url: decodeRealUrl(t.url),
      favIconUrl: t.favIconUrl,
      order: t.order,
    })),
    notes: notes.map((n) => ({
      title: n.title,
      content: n.content,
    })),
    tasks: tasks.map((tk) => ({
      text: tk.text,
      completed: tk.completed,
      order: tk.order,
      dueDate: tk.dueDate,
    })),
    resources: resourcesData,
  };
}

/**
 * Builds a styled, clickable, Netscape Bookmark-compatible HTML document for a single space.
 */
export function buildSpaceHtml(payload: SpaceExportPayload): string {
  const addDateSec = Math.floor(Date.now() / 1000);
  const icon = payload.space.icon || '📁';
  const title = escapeHtml(payload.space.name);
  const desc = payload.space.description ? `<div class="st-desc">${escapeHtml(payload.space.description)}</div>` : '';

  const tabLinks = payload.tabs
    .map((t) => {
      const href = escapeHtml(decodeRealUrl(t.url));
      const label = escapeHtml(t.title || t.url);
      const fav = t.favIconUrl ? ` ICON="${escapeHtml(t.favIconUrl)}"` : '';
      return `      <DT><A HREF="${href}" ADD_DATE="${addDateSec}"${fav}>${label}</A>`;
    })
    .join('\n');

  const resourceFolders = payload.resources
    .filter((r) => r.items && r.items.length > 0)
    .map((r) => {
      const itemsHtml = r.items
        .map(
          (it) =>
            `      <DT><A HREF="${escapeHtml(decodeRealUrl(it.url))}" ADD_DATE="${addDateSec}">${escapeHtml(
              it.title || it.url
            )}</A>`
        )
        .join('\n');
      return `    <DT><H3 ADD_DATE="${addDateSec}">${escapeHtml(r.title)}</H3>\n    <DL><p>\n${itemsHtml}\n    </DL><p>`;
    })
    .join('\n');

  const notesHtml =
    payload.notes.length > 0
      ? `<h3>Notes (${payload.notes.length})</h3>\n` +
        payload.notes
          .map(
            (n) =>
              `<div class="st-card"><div class="st-card-title">${escapeHtml(
                n.title || 'Untitled Note'
              )}</div><div class="st-card-body">${escapeHtml(n.content)}</div></div>`
          )
          .join('\n')
      : '';

  const tasksHtml =
    payload.tasks.length > 0
      ? `<h3>Tasks (${payload.tasks.length})</h3>\n` +
        payload.tasks
          .map(
            (tk) =>
              `<div class="st-card ${tk.completed ? 'st-task-done' : ''}">${
                tk.completed ? '☑' : '☐'
              } ${escapeHtml(tk.text)}</div>`
          )
          .join('\n')
      : '';

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file by SpaceTabs.
     It can be opened directly in any browser or imported into SpaceTabs / browser bookmarks. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>${title} — SpaceTabs</TITLE>
<STYLE>${HTML_EXPORT_STYLES}</STYLE>
<script id="spacetabs-space-data" type="application/json">${safeJsonForScript(payload)}</script>
<div class="st-header">
  <H1>${escapeHtml(icon)} ${title}</H1>
  <div class="st-meta">Exported from SpaceTabs v${escapeHtml(payload.version)} on ${escapeHtml(
    new Date(payload.exportedAt).toLocaleString()
  )} • ${payload.tabs.length} tab(s)</div>
  ${desc}
</div>
<DL><p>
  <DT><H3 ADD_DATE="${addDateSec}" LAST_MODIFIED="${addDateSec}">${title}</H3>
  <DL><p>
${tabLinks}
${resourceFolders}
  </DL><p>
</DL><p>
${notesHtml}
${tasksHtml}
`;
}

/**
 * Builds a styled, clickable, Netscape Bookmark-compatible HTML document for a full workspace backup.
 */
export function buildWorkspaceHtml(payload: DriveDataExport): string {
  const addDateSec = Math.floor((payload.exportedAt || Date.now()) / 1000);
  const spaceFolders = payload.spaces
    .map((sp) => {
      const spTabs = payload.tabs
        .filter((t) => t.spaceId === sp.id)
        .sort((a, b) => a.order - b.order);
      const links = spTabs
        .map(
          (t) =>
            `      <DT><A HREF="${escapeHtml(decodeRealUrl(t.url))}" ADD_DATE="${addDateSec}">${escapeHtml(
              t.title || t.url
            )}</A>`
        )
        .join('\n');
      return `  <DT><H3 ADD_DATE="${addDateSec}">${escapeHtml(sp.icon || '📁')} ${escapeHtml(
        sp.name
      )} (${spTabs.length})</H3>\n  <DL><p>\n${links}\n  </DL><p>`;
    })
    .join('\n');

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>SpaceTabs Workspace Backup</TITLE>
<STYLE>${HTML_EXPORT_STYLES}</STYLE>
<script id="spacetabs-workspace-data" type="application/json">${safeJsonForScript(payload)}</script>
<div class="st-header">
  <H1>🗂️ SpaceTabs Workspace Backup</H1>
  <div class="st-meta">Exported on ${escapeHtml(
    new Date(payload.exportedAt).toLocaleString()
  )} • ${payload.spaces.length} space(s) • ${payload.tabs.length} tab(s)</div>
</div>
<DL><p>
${spaceFolders}
</DL><p>
`;
}

/**
 * Exports a single space to a downloadable JSON or HTML file.
 */
export async function exportSpaceToFile(
  spaceId: string | null,
  fallbackName = 'Unsaved Session',
  format: ExportFormat = 'json'
): Promise<void> {
  const payload = await buildSpaceExport(spaceId, fallbackName);
  const safeName =
    payload.space.name
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/^_+|_+$/g, '') || 'space';

  if (format === 'html') {
    const htmlContent = buildSpaceHtml(payload);
    downloadFile(htmlContent, `${safeName}-space.html`, 'text/html;charset=utf-8');
  } else {
    downloadFile(JSON.stringify(payload, null, 2), `${safeName}-space.json`, 'application/json;charset=utf-8');
  }
}
