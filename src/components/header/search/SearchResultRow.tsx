import React from 'react';
import {
  Globe,
  FileText,
  CheckSquare,
  Square,
  Bookmark,
  ExternalLink,
  Archive,
  X,
} from 'lucide-react';
import { formatDueDateBadge, formatRelativeTime } from '@/utils/time';
import { type SearchResultItem } from '../useGlobalSearch';
import { HighlightText } from './HighlightText';

interface SearchResultRowProps {
  item: SearchResultItem;
  isSelected: boolean;
  isLight: boolean;
  showTabFavicons: boolean;
  searchWords: string[];
  onMouseEnter: () => void;
  onClick: () => void;
  onOpenLinkOnly: (e: React.MouseEvent, url: string) => void;
  onDismiss?: (e: React.MouseEvent) => void;
}

export const SearchResultRow: React.FC<SearchResultRowProps> = ({
  item,
  isSelected,
  isLight,
  showTabFavicons,
  searchWords,
  onMouseEnter,
  onClick,
  onOpenLinkOnly,
  onDismiss,
}) => {
  const highlightTokens = item.matchedWords.length ? item.matchedWords : searchWords;

  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`group flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition ${
        isSelected
          ? isLight
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-blue-500/15 border border-blue-500/30'
          : isLight
          ? 'hover:bg-slate-100 border border-transparent'
          : 'hover:bg-slate-900 border border-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {/* Icon column */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {item.type === 'tab' ? (
            showTabFavicons && item.tab.favIconUrl ? (
              <img
                src={item.tab.favIconUrl}
                alt=""
                className="w-4 h-4 rounded-sm object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Globe className="w-3.5 h-3.5 text-slate-400" />
            )
          ) : item.type === 'note' ? (
            <FileText className="w-3.5 h-3.5 text-amber-400" />
          ) : item.type === 'task' ? (
            item.completed ? (
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-blue-400" />
            )
          ) : item.item.favIconUrl ? (
            <img
              src={item.item.favIconUrl}
              alt=""
              className="w-4 h-4 rounded-sm object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
          )}
        </div>

        {/* Content column */}
        <div className="min-w-0 flex-1">
          <div
            className={`text-xs font-medium truncate flex items-center gap-1.5 ${
              isLight ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            <span className="truncate">
              <HighlightText
                text={
                  item.type === 'tab'
                    ? item.tab.title || item.realUrl
                    : item.type === 'note'
                    ? item.note.title || 'Untitled Note'
                    : item.type === 'task'
                    ? item.task.text
                    : item.item.title || item.realUrl
                }
                words={highlightTokens}
                isLight={isLight}
              />
            </span>
            {item.type === 'task' && item.completed && (
              <span className="text-[10px] text-emerald-400 font-normal">
                (completed)
              </span>
            )}
            {item.isArchived && (
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0 rounded-full font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex-shrink-0">
                <Archive className="w-2.5 h-2.5" />
                Archived
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate mt-0.5">
            {/* Type pill */}
            <span
              className={`inline-flex items-center px-1.5 py-0 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0 ${
                item.type === 'tab'
                  ? 'bg-blue-500/10 text-blue-400'
                  : item.type === 'note'
                  ? 'bg-amber-500/10 text-amber-400'
                  : item.type === 'task'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-indigo-500/10 text-indigo-400'
              }`}
            >
              {item.type}
            </span>

            {/* Space Name Pill */}
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0 rounded text-[10px] font-medium flex-shrink-0 ${
                isLight
                  ? 'bg-slate-200/70 text-slate-700'
                  : 'bg-slate-800/90 text-slate-300'
              }`}
            >
              <span>{item.isUnsaved ? '⚡' : item.spaceIcon}</span>
              <span className="truncate max-w-[100px]">
                <HighlightText
                  text={item.spaceName}
                  words={highlightTokens}
                  isLight={isLight}
                />
              </span>
            </span>

            <span>•</span>

            {/* Secondary detail: URL or Note Snippet or Due Date */}
            {item.type === 'tab' && (
              <span className="truncate font-mono text-[10px]">
                <HighlightText
                  text={item.realUrl}
                  words={highlightTokens}
                  isLight={isLight}
                />
              </span>
            )}
            {item.type === 'note' && (
              <span className="truncate italic text-[11px] text-slate-400">
                <HighlightText
                  text={item.snippet || 'No content preview'}
                  words={highlightTokens}
                  isLight={isLight}
                />
              </span>
            )}
            {item.type === 'task' && (
              <span className="truncate text-[10px]">
                {item.dueDate ? (
                  <span
                    className={
                      formatDueDateBadge(item.dueDate)?.isOverdue
                        ? 'text-rose-400 font-semibold'
                        : 'text-slate-400'
                    }
                  >
                    Due {formatDueDateBadge(item.dueDate)?.label}
                  </span>
                ) : (
                  'No due date'
                )}
              </span>
            )}
            {item.type === 'resource' && (
              <span className="truncate text-[10px]">
                {item.resourceSectionTitle && (
                  <span className="font-semibold mr-1">
                    [{item.resourceSectionTitle}]
                  </span>
                )}
                <span className="font-mono">
                  <HighlightText
                    text={item.realUrl}
                    words={highlightTokens}
                    isLight={isLight}
                  />
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: relative time & quick action for web links */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.updatedAt > 0 && (
          <span className="hidden sm:inline text-[10px] text-slate-500 font-mono group-hover:hidden">
            {formatRelativeTime(item.updatedAt)}
          </span>
        )}
        {(item.type === 'tab' || item.type === 'resource') && (
          <button
            type="button"
            onClick={(e) => onOpenLinkOnly(e, item.realUrl)}
            className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition ${
              isLight
                ? 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-sm'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
            title="Open in new background tab"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[10px] font-medium flex items-center gap-1 transition ${
              isLight
                ? 'bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 border border-slate-200 shadow-sm'
                : 'bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700'
            }`}
            title="Remove from recent history"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
