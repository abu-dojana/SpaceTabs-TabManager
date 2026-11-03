import React from 'react';
import { useUIStore } from '@/store/uiStore';
import {
  getAllWindowSpaces,
  locateOrOpenTab,
  openSpaceInNewWindow,
  switchWindowToSpace,
  focusOrOpenTab,
} from '@/services/tabManager';
import { getUserSettings } from '@/services/settings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useClickOutside } from '@/hooks/useClickOutside';
import { getHostWindowId } from '@/utils/chromeWindow';
import { formatDueDateBadge } from '@/utils/time';
import {
  useGlobalSearch,
  type SearchCategory,
  type SearchResultItem,
} from './useGlobalSearch';
import {
  Search,
  X,
  Globe,
  Layers,
  FileText,
  CheckSquare,
  Square,
  Bookmark,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';

interface GlobalSearchBarProps {
  isLight: boolean;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const HighlightText: React.FC<{
  text: string;
  words: string[];
  isLight: boolean;
}> = ({ text, words, isLight }) => {
  if (!text || words.length === 0) return <>{text}</>;

  const validWords = Array.from(new Set(words.filter(Boolean))).sort(
    (a, b) => b.length - a.length
  );
  if (validWords.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${validWords.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, idx) => {
        const isMatch = validWords.some((w) => w.toLowerCase() === part.toLowerCase());
        if (!isMatch) return <React.Fragment key={idx}>{part}</React.Fragment>;
        return (
          <mark
            key={idx}
            className={`rounded px-0.5 font-semibold ${
              isLight
                ? 'bg-amber-200/90 text-slate-950'
                : 'bg-amber-500/25 text-amber-300 border-b border-amber-400/50'
            }`}
          >
            {part}
          </mark>
        );
      })}
    </>
  );
};

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ isLight }) => {
  const {
    activeSpaceId,
    setActiveSpaceId,
    setActiveView,
    setPendingNoteId,
    searchQuery,
    setSearchQuery,
  } = useUIStore();
  const { showTabFavicons } = useUserSettings();

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useClickOutside([containerRef], () => setIsOpen(false), isOpen, true);

  const { searchWords, groups, flatItems, counts, activeCategory, setActiveCategory } =
    useGlobalSearch(searchQuery, activeSpaceId);

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, activeCategory]);

  const navigateToResult = async (item: SearchResultItem) => {
    try {
      setIsOpen(false);
      const currentTarget = activeSpaceId || null;

      // 1. Switch space if different
      if (item.spaceId !== currentTarget) {
        const hostWinId = await getHostWindowId();
        const winSpaces = await getAllWindowSpaces();

        // Check if target space is already open in another window
        if (item.spaceId) {
          for (const [wId, sId] of winSpaces.entries()) {
            if (sId === item.spaceId && wId !== hostWinId) {
              try {
                await chrome.windows.update(wId, { focused: true });
                break;
              } catch {}
            }
          }
        }

        const settings = await getUserSettings();
        if (settings.defaultOpenInNewWindow && item.spaceId) {
          await openSpaceInNewWindow(item.spaceId);
        } else {
          setActiveSpaceId(item.spaceId);
          if (hostWinId) {
            await switchWindowToSpace(hostWinId, item.spaceId);
          }
        }
      }

      // 2. Switch to the appropriate canvas view and activate target item
      if (item.type === 'tab') {
        setActiveView('tabs');
        await locateOrOpenTab(item.tab);
      } else if (item.type === 'note') {
        setPendingNoteId(item.note.id);
        setActiveView('notes');
      } else if (item.type === 'task') {
        setActiveView('tasks');
      } else if (item.type === 'resource') {
        setActiveView('resources');
      }
    } catch (err) {
      console.error('Failed to navigate to search result:', err);
    }
  };

  const handleOpenLinkOnly = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    setIsOpen(false);
    await focusOrOpenTab(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (!isOpen && searchWords.length > 0 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }
    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = flatItems[selectedIndex] || flatItems[0];
      if (selected) {
        navigateToResult(selected);
      }
    }
  };

  const showDropdown = isOpen && searchWords.length > 0;
  let runningFlatIndex = -1;

  const categoryPills: { id: SearchCategory; label: string; count: number; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', count: counts.all, icon: null },
    { id: 'tabs', label: 'Tabs', count: counts.tabs, icon: <Layers className="w-3 h-3" /> },
    { id: 'notes', label: 'Notes', count: counts.notes, icon: <FileText className="w-3 h-3" /> },
    { id: 'tasks', label: 'Tasks', count: counts.tasks, icon: <CheckSquare className="w-3 h-3" /> },
    { id: 'resources', label: 'Resources', count: counts.resources, icon: <Bookmark className="w-3 h-3" /> },
  ];

  return (
    <div
      ref={containerRef}
      className="w-44 sm:w-60 md:w-72 lg:w-80 max-w-sm min-w-[150px] flex-shrink-0 relative transition-all duration-150 focus-within:w-60 sm:focus-within:w-72 md:focus-within:w-88"
    >
      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onFocus={() => {
          if (searchQuery.trim().length > 0) setIsOpen(true);
        }}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search tabs, notes, tasks, resources..."
        className={`w-full rounded-full pl-10 pr-8 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
          isLight
            ? 'bg-slate-100/80 hover:bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500'
            : 'bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:border-blue-500'
        }`}
      />
      {searchQuery && (
        <button
          type="button"
          onClick={() => {
            setSearchQuery('');
            setIsOpen(false);
            inputRef.current?.focus();
          }}
          className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition ${
            isLight
              ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
              : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Floating Results Dropdown */}
      {showDropdown && (
        <div
          className={`absolute right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-[500px] md:w-[560px] max-w-[calc(100vw-32px)] max-h-[75vh] flex flex-col rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            isLight
              ? 'bg-white border-slate-200 shadow-slate-400/30 text-slate-900'
              : 'bg-slate-950 border-slate-800 shadow-black/80 text-slate-100'
          }`}
        >
          {/* Category Filter Pills Bar */}
          <div
            className={`px-3 py-2 border-b flex items-center justify-between gap-1 overflow-x-auto select-none flex-shrink-0 ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-slate-900/90 border-slate-800/80'
            }`}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              {categoryPills.map((pill) => {
                const isActive = activeCategory === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setActiveCategory(pill.id)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : isLight
                        ? 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    {pill.icon}
                    <span>{pill.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0 rounded-full font-mono font-bold ${
                        isActive
                          ? 'bg-blue-700 text-blue-100'
                          : isLight
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 font-mono flex-shrink-0 ml-1">
              <span>↑↓ to navigate</span>
            </div>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto divide-y divide-slate-500/10 max-h-[64vh]">
            {groups.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search className="w-7 h-7 mx-auto mb-2 text-slate-500 opacity-50" />
                <p className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  No results matched &ldquo;{searchQuery.trim()}&rdquo;
                  {activeCategory !== 'all' ? ` in ${activeCategory}` : ''}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Searched across all saved Spaces and Unsaved sessions.
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.groupKey} className="py-1.5">
                  {/* Space Group Header */}
                  <div
                    onClick={() => {
                      if (group.spaceId !== activeSpaceId) {
                        setActiveSpaceId(group.spaceId);
                      }
                      setIsOpen(false);
                    }}
                    className={`px-3.5 py-1.5 flex items-center justify-between cursor-pointer transition ${
                      isLight ? 'hover:bg-slate-100/80' : 'hover:bg-slate-900/70'
                    }`}
                    title={`Go to ${group.spaceName}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {group.isUnsaved ? (
                        <Layers className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      ) : (
                        <span className="text-sm flex-shrink-0">{group.spaceIcon}</span>
                      )}
                      {group.sectionName && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex-shrink-0 ${
                            isLight
                              ? 'bg-slate-200/80 text-slate-600'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {group.sectionName}
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold truncate ${
                          isLight ? 'text-slate-900' : 'text-slate-100'
                        }`}
                      >
                        <HighlightText
                          text={group.spaceName}
                          words={searchWords}
                          isLight={isLight}
                        />
                      </span>
                      {group.isCurrentSpace && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                            isLight
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          Current Space
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 flex-shrink-0">
                      <span>
                        {group.items.length} item{group.items.length === 1 ? '' : 's'}
                      </span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Matching Items in this Space */}
                  <div className="mt-0.5 space-y-0.5 px-1.5">
                    {group.items.map((item) => {
                      runningFlatIndex += 1;
                      const itemIndex = runningFlatIndex;
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          onClick={() => navigateToResult(item)}
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
                                    words={searchWords}
                                    isLight={isLight}
                                  />
                                </span>
                                {item.type === 'task' && item.completed && (
                                  <span className="text-[10px] text-emerald-400 font-normal">
                                    (completed)
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
                                      words={searchWords}
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
                                      words={searchWords}
                                      isLight={isLight}
                                    />
                                  </span>
                                )}
                                {item.type === 'note' && (
                                  <span className="truncate italic text-[11px] text-slate-400">
                                    <HighlightText
                                      text={item.snippet || 'No content preview'}
                                      words={searchWords}
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
                                        words={searchWords}
                                        isLight={isLight}
                                      />
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick action for web links */}
                          {(item.type === 'tab' || item.type === 'resource') && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenLinkOnly(e, item.realUrl)}
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
