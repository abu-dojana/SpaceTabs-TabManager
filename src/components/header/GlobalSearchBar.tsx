import React from 'react';
import { useUIStore } from '@/store/uiStore';
import {
  getAllWindowSpaces,
  locateOrOpenTab,
  openSpaceInNewWindow,
  switchWindowToSpace,
  focusOrOpenTab,
  restoreSpace,
} from '@/services/tabManager';
import { getUserSettings, updateUserSettings } from '@/services/settings';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useClickOutside } from '@/hooks/useClickOutside';
import { getHostWindowId } from '@/utils/chromeWindow';
import {
  useGlobalSearch,
  type SearchCategory,
  type SearchResultItem,
  type SpaceSearchResultItem,
  type NavigableSearchResult,
} from './useGlobalSearch';
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  getQuickRecallClearedAt,
  clearQuickRecallHistory,
  getDismissedQuickRecallIds,
  dismissQuickRecallItem,
} from './search/searchScoring';
import { SpaceResultsBlock, SpaceGroupSection } from './search/SpaceResultsBlock';
import { QuickRecallPanel } from './search/QuickRecallPanel';
import {
  Search,
  X,
  Folder,
  Layers,
  FileText,
  CheckSquare,
  Bookmark,
  Archive,
} from 'lucide-react';

interface GlobalSearchBarProps {
  isLight: boolean;
}

const DEFAULT_GROUP_ITEM_LIMIT = 5;
const DEFAULT_SPACE_RESULT_LIMIT = 5;

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ isLight }) => {
  const {
    activeSpaceId,
    setActiveSpaceId,
    setActiveView,
    setPendingNoteId,
    searchQuery,
    setSearchQuery,
  } = useUIStore();
  const { showTabFavicons, searchInArchive } = useUserSettings();
  const includeArchived = Boolean(searchInArchive);

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [showAllSpaces, setShowAllSpaces] = React.useState(false);
  const [recentSearches, setRecentSearches] = React.useState<string[]>(() =>
    getRecentSearches()
  );
  const [quickRecallClearedAt, setQuickRecallClearedAt] = React.useState<number>(() =>
    getQuickRecallClearedAt()
  );
  const [dismissedRecallIds, setDismissedRecallIds] = React.useState<Set<string>>(() =>
    getDismissedQuickRecallIds()
  );

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useClickOutside([containerRef], () => setIsOpen(false), isOpen, true);

  // Global keyboard shortcut: Ctrl+K / Cmd+K (or '/' when not typing in an input) focuses search
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setRecentSearches(getRecentSearches());
        setIsOpen(true);
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        inputRef.current?.focus();
        setRecentSearches(getRecentSearches());
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const {
    searchWords,
    spaceResults,
    groups,
    counts,
    recentItems,
    activeCategory,
    setActiveCategory,
  } = useGlobalSearch(
    searchQuery,
    activeSpaceId,
    includeArchived,
    isOpen,
    quickRecallClearedAt,
    dismissedRecallIds
  );

  React.useEffect(() => {
    setSelectedIndex(0);
    setExpandedGroups(new Set());
    setShowAllSpaces(false);
  }, [searchQuery, activeCategory, includeArchived]);

  const visibleSpaceResults = React.useMemo(() => {
    if (activeCategory === 'spaces' || showAllSpaces) {
      return spaceResults;
    }
    return spaceResults.slice(0, DEFAULT_SPACE_RESULT_LIMIT);
  }, [spaceResults, activeCategory, showAllSpaces]);

  // Build flat navigable items list matching the exact rendered rows for ArrowUp / ArrowDown / Enter
  const flatItems = React.useMemo<NavigableSearchResult[]>(() => {
    if (searchWords.length === 0) {
      return recentItems;
    }
    const list: NavigableSearchResult[] = [...visibleSpaceResults];
    for (const g of groups) {
      const isExpanded = expandedGroups.has(g.groupKey);
      const visibleGroupItems = isExpanded
        ? g.items
        : g.items.slice(0, DEFAULT_GROUP_ITEM_LIMIT);
      list.push(...visibleGroupItems);
    }
    return list;
  }, [searchWords.length, recentItems, visibleSpaceResults, groups, expandedGroups]);

  const recordQueryIfPresent = () => {
    if (searchQuery.trim().length >= 2) {
      setRecentSearches(saveRecentSearch(searchQuery));
    }
  };

  const activateSpaceInWindow = async (
    targetSpaceId: string | null,
    isArchivedSpace = false
  ) => {
    if (isArchivedSpace && targetSpaceId) {
      await restoreSpace(targetSpaceId);
    }

    const currentTarget = activeSpaceId || null;
    if (targetSpaceId === currentTarget) return;

    const hostWinId = await getHostWindowId();
    const winSpaces = await getAllWindowSpaces();

    if (targetSpaceId) {
      for (const [wId, sId] of winSpaces.entries()) {
        if (sId === targetSpaceId && wId !== hostWinId) {
          try {
            await chrome.windows.update(wId, { focused: true });
            return;
          } catch {}
        }
      }
    }

    const settings = await getUserSettings();
    if (settings.defaultOpenInNewWindow && targetSpaceId) {
      await openSpaceInNewWindow(targetSpaceId);
    } else {
      setActiveSpaceId(targetSpaceId);
      if (hostWinId) {
        await switchWindowToSpace(hostWinId, targetSpaceId);
      }
    }
  };

  const navigateToSpaceResult = async (spaceItem: SpaceSearchResultItem) => {
    try {
      recordQueryIfPresent();
      setIsOpen(false);
      await activateSpaceInWindow(spaceItem.spaceId, spaceItem.isArchived);
      setActiveView('tabs');
    } catch (err) {
      console.error('Failed to navigate to space result:', err);
    }
  };

  const handleOpenSpaceInNewWindow = async (
    e: React.MouseEvent,
    spaceItem: SpaceSearchResultItem
  ) => {
    e.stopPropagation();
    recordQueryIfPresent();
    setIsOpen(false);
    if (spaceItem.isArchived) {
      await restoreSpace(spaceItem.spaceId);
    }
    await openSpaceInNewWindow(spaceItem.spaceId);
  };

  const navigateToResult = async (item: SearchResultItem) => {
    try {
      recordQueryIfPresent();
      setIsOpen(false);
      await activateSpaceInWindow(item.spaceId, item.isArchived);

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
    recordQueryIfPresent();
    setIsOpen(false);
    await focusOrOpenTab(url);
  };

  const handleToggleIncludeArchive = async () => {
    await updateUserSettings({ searchInArchive: !includeArchived });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
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
      if (!selected) return;
      if (selected.type === 'space') {
        navigateToSpaceResult(selected);
      } else {
        navigateToResult(selected);
      }
    }
  };

  const showQuickRecall = isOpen && searchWords.length === 0;
  const showSearchResults = isOpen && searchWords.length > 0;
  let runningFlatIndex = visibleSpaceResults.length - 1;

  const categoryPills: {
    id: SearchCategory;
    label: string;
    count: number;
    icon: React.ReactNode;
  }[] = [
    { id: 'all', label: 'All', count: counts.all, icon: null },
    {
      id: 'spaces',
      label: 'Spaces',
      count: counts.spaces,
      icon: <Folder className="w-3 h-3" />,
    },
    {
      id: 'tabs',
      label: 'Tabs',
      count: counts.tabs,
      icon: <Layers className="w-3 h-3" />,
    },
    {
      id: 'notes',
      label: 'Notes',
      count: counts.notes,
      icon: <FileText className="w-3 h-3" />,
    },
    {
      id: 'tasks',
      label: 'Tasks',
      count: counts.tasks,
      icon: <CheckSquare className="w-3 h-3" />,
    },
    {
      id: 'resources',
      label: 'Resources',
      count: counts.resources,
      icon: <Bookmark className="w-3 h-3" />,
    },
  ];

  return (
    <div
      ref={containerRef}
      className="w-48 sm:w-64 md:w-72 lg:w-80 max-w-sm min-w-[160px] flex-shrink-0 relative transition-all duration-150 focus-within:w-64 sm:focus-within:w-76 md:focus-within:w-88"
    >
      <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onFocus={() => {
          setRecentSearches(getRecentSearches());
          setIsOpen(true);
        }}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setIsOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search spaces, tabs, notes, tasks..."
        className={`w-full rounded-full pl-10 pr-14 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
          isLight
            ? 'bg-slate-100/80 hover:bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500'
            : 'bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:border-blue-500'
        }`}
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => {
            setSearchQuery('');
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
      ) : (
        <span
          className={`hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 border ${
            isLight
              ? 'bg-white/80 text-slate-400 border-slate-200'
              : 'bg-slate-800/70 text-slate-500 border-slate-700/60'
          }`}
        >
          Ctrl+K
        </span>
      )}

      {/* Quick Recall Panel (When focused with empty query) */}
      {showQuickRecall && (
        <div
          className={`absolute right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-[500px] md:w-[560px] max-w-[calc(100vw-32px)] max-h-[75vh] flex flex-col rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            isLight
              ? 'bg-white border-slate-200 shadow-slate-400/30 text-slate-900'
              : 'bg-slate-950 border-slate-800 shadow-black/80 text-slate-100'
          }`}
        >
          <QuickRecallPanel
            recentSearches={recentSearches}
            recentItems={recentItems}
            selectedIndex={selectedIndex}
            isLight={isLight}
            showTabFavicons={showTabFavicons}
            onSelectSearchQuery={(q) => {
              setSearchQuery(q);
              inputRef.current?.focus();
            }}
            onRemoveSearchQuery={(q) => setRecentSearches(removeRecentSearch(q))}
            onClearRecentSearches={() => {
              clearRecentSearches();
              setRecentSearches([]);
            }}
            onDismissRecentItem={(id) =>
              setDismissedRecallIds(dismissQuickRecallItem(id))
            }
            onClearRecentItems={() => {
              setQuickRecallClearedAt(clearQuickRecallHistory());
              setDismissedRecallIds(new Set());
            }}
            onSelectIndex={setSelectedIndex}
            onNavigateToResult={navigateToResult}
            onOpenLinkOnly={handleOpenLinkOnly}
          />
        </div>
      )}

      {/* Floating Search Results Dropdown */}
      {showSearchResults && (
        <div
          className={`absolute right-0 top-full mt-2 w-[calc(100vw-32px)] sm:w-[520px] md:w-[580px] max-w-[calc(100vw-32px)] max-h-[78vh] flex flex-col rounded-2xl border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
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

              {/* Archive Search Toggle Pill */}
              <button
                type="button"
                onClick={handleToggleIncludeArchive}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition cursor-pointer border ${
                  includeArchived
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                    : isLight
                    ? 'bg-white text-slate-400 hover:text-slate-700 border-slate-200'
                    : 'bg-slate-900 text-slate-500 hover:text-slate-300 border-slate-800'
                }`}
                title={
                  includeArchived
                    ? 'Archived spaces are included in search (click to hide)'
                    : 'Archived spaces are hidden (click to search in Archive too)'
                }
              >
                <Archive className="w-3 h-3" />
                <span>{includeArchived ? 'Archive: On' : 'Archive'}</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-500 font-mono flex-shrink-0 ml-1">
              <span>↑↓ to navigate</span>
            </div>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto divide-y divide-slate-500/10 max-h-[66vh]">
            {visibleSpaceResults.length === 0 && groups.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search className="w-7 h-7 mx-auto mb-2 text-slate-500 opacity-50" />
                <p
                  className={`text-xs font-semibold ${
                    isLight ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  No results matched &ldquo;{searchQuery.trim()}&rdquo;
                  {activeCategory !== 'all' ? ` in ${activeCategory}` : ''}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {includeArchived
                    ? 'Searched across all saved, archived, and unsaved workspaces.'
                    : 'Searched across all active Spaces and Unsaved sessions.'}
                </p>
                {!includeArchived && (
                  <button
                    type="button"
                    onClick={handleToggleIncludeArchive}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Also search in Archived Spaces</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* 1. First-Class Matching Spaces Block */}
                <SpaceResultsBlock
                  spaces={visibleSpaceResults}
                  totalSpacesCount={spaceResults.length}
                  showAllSpaces={showAllSpaces || activeCategory === 'spaces'}
                  selectedIndex={selectedIndex}
                  startFlatIndex={0}
                  searchWords={searchWords}
                  isLight={isLight}
                  onSelectIndex={setSelectedIndex}
                  onNavigateToSpace={navigateToSpaceResult}
                  onOpenSpaceInNewWindow={handleOpenSpaceInNewWindow}
                  onToggleShowAllSpaces={() => setShowAllSpaces(true)}
                />

                {/* 2. Matching Items Grouped by Space */}
                {groups.map((group) => {
                  const isExpanded = expandedGroups.has(group.groupKey);
                  const visibleItems = isExpanded
                    ? group.items
                    : group.items.slice(0, DEFAULT_GROUP_ITEM_LIMIT);
                  const hiddenItemsCount = group.items.length - visibleItems.length;
                  const groupStartFlatIndex = runningFlatIndex + 1;
                  runningFlatIndex += visibleItems.length;

                  return (
                    <SpaceGroupSection
                      key={group.groupKey}
                      group={group}
                      visibleItems={visibleItems}
                      hiddenItemsCount={hiddenItemsCount}
                      startFlatIndex={groupStartFlatIndex}
                      selectedIndex={selectedIndex}
                      isLight={isLight}
                      showTabFavicons={showTabFavicons}
                      searchWords={searchWords}
                      onClickGroupHeader={() => {
                        recordQueryIfPresent();
                        setIsOpen(false);
                        activateSpaceInWindow(group.spaceId, group.isArchived);
                      }}
                      onSelectIndex={setSelectedIndex}
                      onNavigateToResult={navigateToResult}
                      onOpenLinkOnly={handleOpenLinkOnly}
                      onExpandGroup={() =>
                        setExpandedGroups((prev) => {
                          const next = new Set(prev);
                          next.add(group.groupKey);
                          return next;
                        })
                      }
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
