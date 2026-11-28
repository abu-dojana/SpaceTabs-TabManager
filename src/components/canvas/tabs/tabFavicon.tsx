import React from 'react';
import {
  Puzzle,
  Settings,
  Bookmark,
  Download,
  History,
  Compass,
  Globe,
} from 'lucide-react';

export function getFaviconUrl(url: string, storedFavicon?: string): string {
  if (storedFavicon && storedFavicon.startsWith('http')) return storedFavicon;
  try {
    return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`);
  } catch {
    return '';
  }
}

export function renderTabFavicon(
  showTabFavicons: boolean,
  url: string,
  storedFavicon?: string
): React.ReactNode {
  if (!showTabFavicons) return null;
  const isInternal =
    url.startsWith('chrome://') ||
    url.startsWith('about:') ||
    url.startsWith('edge://') ||
    url.startsWith('brave://');

  if (isInternal) {
    if (url.includes('extension')) return <Puzzle className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    if (url.includes('setting')) return <Settings className="w-4 h-4 text-slate-400 flex-shrink-0" />;
    if (url.includes('bookmark')) return <Bookmark className="w-4 h-4 text-amber-400 flex-shrink-0" />;
    if (url.includes('download')) return <Download className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
    if (url.includes('history')) return <History className="w-4 h-4 text-purple-400 flex-shrink-0" />;
    return <Compass className="w-4 h-4 text-slate-400 flex-shrink-0" />;
  }

  const favicon = getFaviconUrl(url, storedFavicon);
  if (favicon) {
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
  }
  return <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
}
