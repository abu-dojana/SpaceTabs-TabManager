import React from 'react';
import { History, Sparkles, Clock, Trash2, X } from 'lucide-react';
import { type SearchResultItem } from '../useGlobalSearch';
import { SearchResultRow } from './SearchResultRow';

interface QuickRecallPanelProps {
  recentSearches: string[];
  recentItems: SearchResultItem[];
  selectedIndex: number;
  isLight: boolean;
  showTabFavicons: boolean;
  onSelectSearchQuery: (query: string) => void;
  onRemoveSearchQuery: (query: string) => void;
  onClearRecentSearches: () => void;
  onDismissRecentItem: (itemId: string) => void;
  onClearRecentItems: () => void;
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
  onRemoveSearchQuery,
  onClearRecentSearches,
  onDismissRecentItem,
  onClearRecentItems,
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
              className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer font-medium"
              title="Clear all recent search queries"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Clear</span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {recentSearches.map((q) => (
              <div
                key={q}
                className={`inline-flex items-center rounded-lg text-xs font-medium border transition ${
                  isLight
                    ? 'bg-slate-100 hover:bg-blue-50 text-slate-700 border-slate-200'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectSearchQuery(q)}
                  className="pl-2.5 pr-1.5 py-1 flex items-center gap-1.5 hover:text-blue-400 transition cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{q}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSearchQuery(q);
                  }}
                  className="pr-2 pl-0.5 py-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                  title={`Remove "${q}"`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
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
          {recentItems.length > 0 ? (
            <button
              type="button"
              onClick={onClearRecentItems}
              className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer font-medium"
              title="Clear recent activity history"
            >
              <Trash2 className="w-2.5 h-2.5" />
              <span>Clear history</span>
            </button>
          ) : (
            <span className="text-[10px] text-slate-500">
              Jump back to what you were just doing
            </span>
          )}
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
                onDismiss={(e) => {
                  e.stopPropagation();
                  onDismissRecentItem(item.id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-xs text-slate-500">
            No recent history shown. Type a space name, topic, or site type (e.g. &ldquo;sheet&rdquo;, &ldquo;colab&rdquo;, &ldquo;video&rdquo;, &ldquo;ai&rdquo;) to search across all workspaces.
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
