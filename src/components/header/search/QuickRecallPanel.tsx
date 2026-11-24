import React from 'react';
import { History, Sparkles, Clock, Trash2 } from 'lucide-react';
import { type SearchResultItem } from '../useGlobalSearch';
import { SearchResultRow } from './SearchResultRow';

interface QuickRecallPanelProps {
  recentSearches: string[];
  recentItems: SearchResultItem[];
  selectedIndex: number;
  isLight: boolean;
  showTabFavicons: boolean;
  onSelectSearchQuery: (query: string) => void;
  onClearRecentSearches: () => void;
  onSelectIndex: (idx: number) => void;
  onNavigateToResult: (item: SearchResultItem) => void;
  onOpenLinkOnly: (e: React.MouseEvent, url: string) => void;
}

export const QuickRecallPanel: React.FC<QuickRecallPanelProps> = ({
  recentSearches,
  recentItems,
  selectedIndex,
  isLight,
  showTabFavicons,
  onSelectSearchQuery,
  onClearRecentSearches,
  onSelectIndex,
  onNavigateToResult,
  onOpenLinkOnly,
}) => {
  return (
    <div className="overflow-y-auto max-h-[64vh] divide-y divide-slate-500/10">
      {/* 1. Recent Searches Chips */}
      {recentSearches.length > 0 && (
        <div className="px-3.5 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <History className="w-3 h-3 text-blue-400" />
              <span>Recent Searches</span>
            </div>
            <button
              type="button"
              onClick={onClearRecentSearches}
              className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
              title="Clear recent search history"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Clear</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {recentSearches.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onSelectSearchQuery(q)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-blue-400 border border-slate-800'
                }`}
              >
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Quick Recall: Recently Active Items */}
      <div className="py-2">
        <div className="px-3.5 py-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <Sparkles className="w-3 h-3" />
            <span>Quick Recall — Recently Active</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Jump back to what you were just doing
          </span>
        </div>

        {recentItems.length > 0 ? (
          <div className="mt-1 space-y-0.5 px-1.5">
            {recentItems.map((item, idx) => (
              <SearchResultRow
                key={item.id}
                item={item}
                isSelected={idx === selectedIndex}
                isLight={isLight}
                showTabFavicons={showTabFavicons}
                searchWords={[]}
                onMouseEnter={() => onSelectIndex(idx)}
                onClick={() => onNavigateToResult(item)}
                onOpenLinkOnly={onOpenLinkOnly}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-slate-500">
            Type a space name, topic, or site type (e.g. &ldquo;sheet&rdquo;, &ldquo;colab&rdquo;, &ldquo;video&rdquo;, &ldquo;ai&rdquo;) to search across all workspaces.
          </div>
        )}
      </div>

      {/* 3. ADHD-Friendly Search Tips Footer */}
      <div
        className={`px-3.5 py-2 text-[10px] flex items-center justify-between ${
          isLight ? 'bg-slate-50 text-slate-500' : 'bg-slate-900/60 text-slate-500'
        }`}
      >
        <span>
          Tip: Forgot the exact title? Try searching by type (<strong>sheet</strong>, <strong>doc</strong>, <strong>colab</strong>, <strong>video</strong>, <strong>ai</strong>) — typos work too!
        </span>
      </div>
    </div>
  );
};
