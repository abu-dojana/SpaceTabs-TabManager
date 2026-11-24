import React from 'react';
import { db } from '@/db';
import { type ResourceItem, type ResourceSection } from '@/db/schema';
import { extractDomain } from '@/utils/urlFilter';
import { FileText, Table, Presentation, Globe } from 'lucide-react';

/**
 * Detects the resource document type based on URL patterns
 */
export function detectResourceType(url: string): 'doc' | 'sheet' | 'custom' | 'link' {
  const lower = url.toLowerCase();
  if (lower.includes('docs.google.com/document') || lower.includes('/document/d/')) return 'doc';
  if (lower.includes('docs.google.com/spreadsheets') || lower.includes('/spreadsheets/d/')) return 'sheet';
  if (lower.includes('docs.google.com/presentation') || lower.includes('/presentation/d/')) return 'custom';
  return 'link';
}

/**
 * Ensures a URL has an http/https/chrome protocol prefix
 */
export function normalizeResourceUrl(rawUrl: string): string {
  const cleanUrl = rawUrl.trim();
  if (
    !cleanUrl.startsWith('http://') &&
    !cleanUrl.startsWith('https://') &&
    !cleanUrl.startsWith('chrome://')
  ) {
    return `https://${cleanUrl}`;
  }
  return cleanUrl;
}

/**
 * Render resource icon based on detected type or favicon
 */
export function renderResourceIcon(
  item: ResourceItem,
  showTabFavicons: boolean
): React.ReactNode {
  if (item.type === 'doc') {
    return <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />;
  }
  if (item.type === 'sheet') {
    return <Table className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  }
  if (item.type === 'custom') {
    return <Presentation className="w-4 h-4 text-amber-400 flex-shrink-0" />;
  }

  if (!showTabFavicons) {
    return <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />;
  }

  if (item.favIconUrl && item.favIconUrl.startsWith('http')) {
    return (
      <img
        src={item.favIconUrl}
        alt=""
        className="w-4 h-4 object-contain rounded flex-shrink-0"
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  }

  try {
    const favicon = chrome.runtime.getURL(
      `/_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=32`
    );
    return (
      <img
        src={favicon}
        alt=""
        className="w-4 h-4 object-contain rounded flex-shrink-0"
        onError={(e) => {
          (e.target as HTMLElement).style.display = 'none';
        }}
      />
    );
  } catch {
    return <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
  }
}

/**
 * Reorders a resource item before ('top') or after ('bottom') targetItemId inside targetSectionId,
 * supporting both same-section and cross-section drag-and-drop.
 */
export async function reorderResourceItemToTarget(
  fromItemId: string,
  targetSectionId: string,
  targetItemId: string,
  dropPos: 'top' | 'bottom'
): Promise<void> {
  if (fromItemId === targetItemId) return;
  const draggedItem = await db.resourceItems.get(fromItemId);
  if (!draggedItem) return;

  const now = Date.now();
  const targetSectionItems = (
    await db.resourceItems.where('sectionId').equals(targetSectionId).toArray()
  ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const withoutDragged = targetSectionItems.filter((it) => it.id !== fromItemId);
  const targetIdx = withoutDragged.findIndex((it) => it.id === targetItemId);
  const insertIdx =
    targetIdx === -1
      ? withoutDragged.length
      : dropPos === 'bottom'
      ? targetIdx + 1
      : targetIdx;

  const reorderedTarget = [...withoutDragged];
  reorderedTarget.splice(insertIdx, 0, {
    ...draggedItem,
    sectionId: targetSectionId,
  });

  await Promise.all(
    reorderedTarget.map((it, idx) =>
      db.resourceItems.update(it.id, {
        sectionId: targetSectionId,
        order: idx,
        updatedAt: now,
      })
    )
  );

  if (draggedItem.sectionId !== targetSectionId) {
    const sourceItems = (
      await db.resourceItems.where('sectionId').equals(draggedItem.sectionId).toArray()
    )
      .filter((it) => it.id !== fromItemId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    await Promise.all(
      sourceItems.map((it, idx) =>
        db.resourceItems.update(it.id, { order: idx, updatedAt: now })
      )
    );
  }
}

/**
 * Reorders a resource section before ('top') or after ('bottom') targetSectionId.
 */
export async function reorderResourceSectionToTarget(
  sections: ResourceSection[],
  fromSectionId: string,
  targetSectionId: string,
  dropPos: 'top' | 'bottom'
): Promise<void> {
  if (fromSectionId === targetSectionId) return;
  const fromSection = sections.find((s) => s.id === fromSectionId);
  if (!fromSection) return;

  const withoutDragged = sections.filter((s) => s.id !== fromSectionId);
  const targetIdx = withoutDragged.findIndex((s) => s.id === targetSectionId);
  if (targetIdx === -1) return;

  const insertIdx = dropPos === 'bottom' ? targetIdx + 1 : targetIdx;
  const reordered = [...withoutDragged];
  reordered.splice(insertIdx, 0, fromSection);

  const now = Date.now();
  await Promise.all(
    reordered.map((sec, idx) =>
      db.resourceSections.update(sec.id, { order: idx, updatedAt: now })
    )
  );
}

/**
 * Sorts resource sections alphabetically (A-Z) by title.
 */
export async function sortResourceSectionsAlphabetically(
  sections: ResourceSection[]
): Promise<void> {
  if (sections.length < 2) return;
  const sorted = [...sections].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' })
  );
  const now = Date.now();
  await Promise.all(
    sorted.map((sec, i) => db.resourceSections.update(sec.id, { order: i, updatedAt: now }))
  );
}

/**
 * Sorts resource items inside a section alphabetically (A-Z) by title or by domain.
 */
export async function sortSectionResourceItems(
  sectionId: string,
  by: 'title' | 'domain'
): Promise<void> {
  const sectionItems = (
    await db.resourceItems.where('sectionId').equals(sectionId).toArray()
  ).sort((a, b) => {
    if (by === 'domain') {
      const domA = extractDomain(a.url).toLowerCase();
      const domB = extractDomain(b.url).toLowerCase();
      const cmp = domA.localeCompare(domB, undefined, { numeric: true, sensitivity: 'base' });
      if (cmp !== 0) return cmp;
    }
    return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
  });
  if (sectionItems.length < 2) return;
  const now = Date.now();
  await Promise.all(
    sectionItems.map((it, i) => db.resourceItems.update(it.id, { order: i, updatedAt: now }))
  );
}
