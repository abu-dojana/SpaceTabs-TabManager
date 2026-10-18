import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import { focusOrOpenTab, moveTabsToSpace } from '@/services/tabManager';
import {
  Folder,
  MoreVertical,
  ExternalLink,
  Trash2,
  Copy,
  Plus,
  Check,
  FolderInput,
  GripVertical,
  Puzzle,
  Settings,
  Bookmark,
  Download,
  History,
  Compass,
  Globe,
} from 'lucide-react';

export const TabsView: React.FC = () => {
  const {
    activeSpaceId,
    searchQuery,
    selectedTabIds,
    toggleSelectTab,
    selectAllTabs,
    clearSelectedTabs,
    setCreateSpaceOpen,
  } = useUIStore();

  // Query tabs from Dexie using valid string spaceId
  const tabs = useLiveQuery(async () => {
    const targetSpace = activeSpaceId || UNSAVED_SPACE_ID;
    let result = await db.tabs
      .where('spaceId')
      .equals(targetSpace)
      .sortBy('order');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) || t.url.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeSpaceId, searchQuery]);

  const spaces = useLiveQuery(async () => {
    const list = await db.spaces.orderBy('order').toArray();
    return list.filter((s) => !s.isArchived);
  });

  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [moveDropdownTabId, setMoveDropdownTabId] = React.useState<string | null>(null);
  const [draggingTabId, setDraggingTabId] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Click-away listener to dismiss move dropdowns cleanly
  React.useEffect(() => {
    if (!moveDropdownTabId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoveDropdownTabId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoveDropdownTabId(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [moveDropdownTabId]);

  const allSelected =
    tabs && tabs.length > 0 && tabs.every((t) => selectedTabIds.has(t.id));

  const handleSelectAllToggle = () => {
    if (!tabs) return;
    if (allSelected) {
      clearSelectedTabs();
    } else {
      selectAllTabs(tabs.map((t) => t.id));
    }
  };

  const handleCopyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteTab = async (id: string) => {
    await db.tabs.delete(id);
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedTabIds);
    for (const id of ids) {
      await db.tabs.delete(id);
    }
    clearSelectedTabs();
  };

  const handleMoveTab = async (tabId: string, targetSpaceId: string | null) => {
    await moveTabsToSpace([tabId], targetSpaceId);
    setMoveDropdownTabId(null);
  };

  const handleMoveSelected = async (targetSpaceId: string | null) => {
    await moveTabsToSpace(Array.from(selectedTabIds), targetSpaceId);
    clearSelectedTabs();
    setMoveDropdownTabId(null);
  };

  const getFaviconUrl = (url: string, storedFavicon?: string) => {
    if (storedFavicon && storedFavicon.startsWith('http')) return storedFavicon;
    try {
      return chrome.runtime.getURL(
        `/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`
      );
    } catch {
      return '';
    }
  };

  const renderFavicon = (url: string, storedFavicon?: string) => {
    const isInternal =
      url.startsWith('chrome://') ||
      url.startsWith('about:') ||
      url.startsWith('edge://') ||
      url.startsWith('brave://');

    if (isInternal) {
      if (url.includes('extension')) {
        return <Puzzle className="w-4 h-4 text-blue-400 flex-shrink-0" />;
      }
      if (url.includes('setting')) {
        return <Settings className="w-4 h-4 text-slate-400 flex-shrink-0" />;
      }
      if (url.includes('bookmark')) {
        return <Bookmark className="w-4 h-4 text-amber-400 flex-shrink-0" />;
      }
      if (url.includes('download')) {
        return <Download className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
      }
      if (url.includes('history')) {
        return <History className="w-4 h-4 text-purple-400 flex-shrink-0" />;
      }
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
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full select-none pb-32 relative">
      {/* Tabs Header Block */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-sm mb-6 relative z-10">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-2">
          {/* Left: Master Select All Checkbox + Folder Title */}
          <div className="flex items-center gap-2.5">
            {tabs && tabs.length > 0 && (
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    el.indeterminate = selectedTabIds.size > 0 && !allSelected;
                  }
                }}
                onChange={handleSelectAllToggle}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                title={allSelected ? 'Deselect all' : 'Select all'}
              />
            )}
            <Folder className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-slate-100">Tabs</h2>
            {tabs && (
              <span className="text-xs text-slate-400 font-mono">
                ({tabs.length})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedTabIds.size > 0 && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-xs text-blue-400 font-medium">
                  {selectedTabIds.size} selected
                </span>

                <button
                  onClick={handleSelectAllToggle}
                  className="px-2 py-0.5 rounded hover:bg-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition"
                >
                  {allSelected ? 'Deselect all' : `Select all (${tabs?.length})`}
                </button>

                {spaces && (
                  <div
                    className="relative"
                    ref={moveDropdownTabId === 'bulk' ? dropdownRef : undefined}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoveDropdownTabId(
                          moveDropdownTabId === 'bulk' ? null : 'bulk'
                        );
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white transition shadow-sm"
                    >
                      <FolderInput className="w-3.5 h-3.5" />
                      <span>Move to Space</span>
                    </button>

                    {moveDropdownTabId === 'bulk' && (
                      <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1">
                        <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                          Move {selectedTabIds.size} tabs to
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {activeSpaceId !== null && (
                            <button
                              onClick={() => handleMoveSelected(null)}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition border-b border-slate-800/60 pb-2 mb-1"
                            >
                              <span>📄</span>
                              <span className="truncate">Unsaved Session</span>
                            </button>
                          )}
                          {spaces
                            .filter((s) => s.id !== activeSpaceId)
                            .map((s) => (
                              <button
                                key={s.id}
                                onClick={() => handleMoveSelected(s.id)}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                              >
                                <span>{s.icon || '📁'}</span>
                                <span className="truncate">{s.name}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleDeleteSelected}
                  className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition"
                  title="Delete selected tabs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={() => {}}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Items List */}
        <div className="divide-y divide-slate-800/50">
          {tabs && tabs.length > 0 ? (
            tabs.map((tab, index) => {
              const isSelected = selectedTabIds.has(tab.id);
              const isNearBottom = index >= Math.max(tabs.length - 2, 1);
              const isDropdownOpen = moveDropdownTabId === tab.id;

              return (
                <div
                  key={tab.id}
                  draggable={true}
                  onDragStart={(e) => {
                    const tabIdsToMove = selectedTabIds.has(tab.id)
                      ? Array.from(selectedTabIds)
                      : [tab.id];

                    e.dataTransfer.setData(
                      'application/json',
                      JSON.stringify({
                        tabIds: tabIdsToMove,
                        sourceSpaceId: tab.spaceId,
                      })
                    );
                    e.dataTransfer.setData('text/plain', tab.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggingTabId(tab.id);
                  }}
                  onDragEnd={() => {
                    setDraggingTabId(null);
                  }}
                  className={`group flex items-center justify-between py-2.5 px-3 rounded-lg transition-all relative ${
                    draggingTabId === tab.id
                      ? 'opacity-40 border border-dashed border-blue-500/60 bg-blue-500/5'
                      : isSelected || isDropdownOpen
                      ? 'bg-blue-600/10'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  {/* Left: Grip + Checkbox + Favicon + Title */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
                    <div
                      className="text-slate-600 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0 -ml-1"
                      title="Drag tab to a Space in sidebar"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectTab(tab.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer flex-shrink-0"
                    />

                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      {renderFavicon(tab.url, tab.favIconUrl)}
                    </div>

                    <button
                      onClick={() => focusOrOpenTab(tab.url)}
                      className="text-xs text-slate-200 hover:text-blue-400 font-medium truncate text-left transition"
                      title={tab.title}
                    >
                      {tab.title || tab.url}
                    </button>
                  </div>

                  {/* Right Actions (shown on hover or active dropdown) */}
                  <div
                    className={`flex items-center gap-1 transition-opacity ${
                      isDropdownOpen
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <button
                      onClick={() => focusOrOpenTab(tab.url)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                      title="Open Tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleCopyUrl(tab.id, tab.url)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                      title="Copy URL"
                    >
                      {copiedId === tab.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Move to Space */}
                    <div
                      className="relative"
                      ref={isDropdownOpen ? dropdownRef : undefined}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMoveDropdownTabId(
                            isDropdownOpen ? null : tab.id
                          );
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                        title="Move to Space"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>

                      {isDropdownOpen && spaces && (
                        <div
                          className={`absolute right-0 z-50 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 ${
                            isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1'
                          }`}
                        >
                          <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                            Move to Space
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {tab.spaceId !== UNSAVED_SPACE_ID && (
                              <button
                                onClick={() => handleMoveTab(tab.id, null)}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 border-b border-slate-800/60 pb-2 mb-1"
                              >
                                <span>📄</span>
                                <span className="truncate">Unsaved Session</span>
                              </button>
                            )}
                            {spaces
                              .filter((s) => s.id !== tab.spaceId)
                              .map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => handleMoveTab(tab.id, s.id)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                                >
                                  <span>{s.icon || '📁'}</span>
                                  <span className="truncate">{s.name}</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteTab(tab.id)}
                      className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"
                      title="Delete Tab"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 italic">
              {activeSpaceId === null
                ? 'No active unsaved tabs in current window.'
                : 'No tabs in this space yet. Drag or move tabs here.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
