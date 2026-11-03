import React from 'react';
import { type ResourceItem } from '@/db/schema';
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
