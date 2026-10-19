import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type Tab, type Space, UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  focusOrOpenTab,
  moveTabsToSpace,
  locateOrOpenTab,
  closeTabs,
  setTransitionLock,
  syncWindowTabsToUnsaved,
} from '@/services/tabManager';
import { decodeRealUrl, extractDomain } from '@/utils/urlFilter';
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
  Crosshair,
  Puzzle,
  Settings,
  Bookmark,
  Download,
  History,
  Compass,
  Globe,
  X,
  Link2,
  ArrowDownAZ,
  CheckSquare,
  PauseCircle,
  RotateCw,
  Layers,
  ChevronRight,
} from 'lucide-react';

export const TabsView: React.FC = () => {
  const {
    activeSpaceId,
    setActiveSpaceId,
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

  const activeSpace = useLiveQuery(
    () => (activeSpaceId ? db.spaces.get(activeSpaceId) : undefined),
    [activeSpaceId]
  );

  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [moveDropdownTabId, setMoveDropdownTabId] = React.useState<string | null>(null);
  const [draggingTabId, setDraggingTabId] = React.useState<string | null>(null);
  const [currentWindowId, setCurrentWindowId] = React.useState<number | null>(null);
  const [liveTabsMap, setLiveTabsMap] = React.useState<Map<number, number>>(new Map()); // chromeTabId -> windowId
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // On-the-fly "Move to a New Space" creation state
  const [isCreatingNewSpaceForTabs, setIsCreatingNewSpaceForTabs] = React.useState(false);
  const [newSpaceNameInput, setNewSpaceNameInput] = React.useState('');
  const newSpaceInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isCreatingNewSpaceForTabs && newSpaceInputRef.current) {
      newSpaceInputRef.current.focus();
      newSpaceInputRef.current.select();
    }
  }, [isCreatingNewSpaceForTabs]);

  // Tabs 3-Dot Options Menu State
  const [isTabsMenuOpen, setIsTabsMenuOpen] = React.useState(false);
  const [showMoveAllSubmenu, setShowMoveAllSubmenu] = React.useState(false);
  const [isCopiedAll, setIsCopiedAll] = React.useState(false);
  const tabsMenuRef = React.useRef<HTMLDivElement>(null);

  // Track live Chrome windows and tabs to show accurate window status badges
  React.useEffect(() => {
    let isMounted = true;

    const refreshLiveTabs = async () => {
      try {
        const curWin = await chrome.windows.getCurrent();
        if (isMounted && curWin.id) setCurrentWindowId(curWin.id);

        const all = await chrome.tabs.query({});
        const map = new Map<number, number>();
        for (const t of all) {
          if (t.id && t.windowId) {
            map.set(t.id, t.windowId);
          }
        }
        if (isMounted) setLiveTabsMap(map);
      } catch {}
    };

    refreshLiveTabs();

    const onEvent = () => {
      refreshLiveTabs();
    };

    chrome.tabs.onCreated.addListener(onEvent);
    chrome.tabs.onRemoved.addListener(onEvent);
    chrome.tabs.onUpdated.addListener(onEvent);
    chrome.tabs.onActivated.addListener(onEvent);
    chrome.windows.onFocusChanged.addListener(onEvent);

    return () => {
      isMounted = false;
      chrome.tabs.onCreated.removeListener(onEvent);
      chrome.tabs.onRemoved.removeListener(onEvent);
      chrome.tabs.onUpdated.removeListener(onEvent);
      chrome.tabs.onActivated.removeListener(onEvent);
      chrome.windows.onFocusChanged.removeListener(onEvent);
    };
  }, []);

  // Click-away listener to dismiss move dropdowns and Tabs 3-dot menu cleanly
  React.useEffect(() => {
    if (!moveDropdownTabId && !isTabsMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoveDropdownTabId(null);
        setIsCreatingNewSpaceForTabs(false);
        setNewSpaceNameInput('');
      }
      if (tabsMenuRef.current && !tabsMenuRef.current.contains(e.target as Node)) {
        setIsTabsMenuOpen(false);
        setShowMoveAllSubmenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoveDropdownTabId(null);
        setIsCreatingNewSpaceForTabs(false);
        setNewSpaceNameInput('');
        setIsTabsMenuOpen(false);
        setShowMoveAllSubmenu(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [moveDropdownTabId, isTabsMenuOpen]);

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
    await closeTabs([id]);
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedTabIds);
    await closeTabs(ids);
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

  const handleMoveToNewSpace = async (tabIdsToMove: string[], customName?: string) => {
    if (!tabIdsToMove || tabIdsToMove.length === 0) return;
    const finalName = customName?.trim() || 'Untitled Space';
    const newSpaceId = crypto.randomUUID();
    const allSpaces = await db.spaces.toArray();
    const maxOrder = allSpaces.reduce((max, s) => Math.max(max, s.order), -1);

    const newSpace: Space = {
      id: newSpaceId,
      name: finalName,
      icon: '📁',
      color: '#3b82f6',
      order: maxOrder + 1,
      isArchived: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.spaces.add(newSpace);
    await moveTabsToSpace(tabIdsToMove, newSpaceId);
    clearSelectedTabs();
    setMoveDropdownTabId(null);
    setIsCreatingNewSpaceForTabs(false);
    setNewSpaceNameInput('');
    setActiveSpaceId(newSpaceId);
  };

  // Reorder tabs in Dexie AND synchronously reorder open Chrome tabs in the browser window
  const reorderTabsAndSyncBrowser = async (sortedTabs: Tab[]) => {
    // 1. Update order in IndexedDB
    const now = Date.now();
    for (let i = 0; i < sortedTabs.length; i++) {
      await db.tabs.update(sortedTabs[i].id, {
        order: i,
        updatedAt: now,
      });
    }

    // 2. Reorder real Chrome tabs across open windows
    try {
      const allBrowserTabs = await chrome.tabs.query({});
      const windowIds = new Set(allBrowserTabs.map((t) => t.windowId));

      for (const winId of windowIds) {
        const windowTabs = allBrowserTabs.filter((t) => t.windowId === winId);
        const pinnedCount = windowTabs.filter((t) => t.pinned).length;

        // Collect matching Chrome tab IDs in their new sorted order
        const orderedTabIds: number[] = [];
        for (const st of sortedTabs) {
          const match = windowTabs.find((wt) => {
            if (st.chromeTabId && wt.id === st.chromeTabId) return true;
            return false;
          });
          if (match?.id) {
            orderedTabIds.push(match.id);
          }
        }

        if (orderedTabIds.length > 0) {
          try {
            await chrome.tabs.move(orderedTabIds, { index: pinnedCount });
          } catch {
            for (let idx = 0; idx < orderedTabIds.length; idx++) {
              try {
                await chrome.tabs.move(orderedTabIds[idx], { index: pinnedCount + idx });
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to reorder Chrome tabs:', err);
    }
  };

  // 1. Copy All Links
  const handleCopyAllLinks = async () => {
    if (!tabs || tabs.length === 0) return;
    const links = tabs.map((t) => t.url).join('\n');
    await navigator.clipboard.writeText(links);
    setIsCopiedAll(true);
    setTimeout(() => {
      setIsCopiedAll(false);
      setIsTabsMenuOpen(false);
    }, 1200);
  };

  // 2. Sort Alphabetically
  const handleSortAlphabetically = async () => {
    if (!tabs || tabs.length <= 1) {
      setIsTabsMenuOpen(false);
      return;
    }
    setIsTabsMenuOpen(false);

    const sorted = [...tabs].sort((a, b) => {
      const titleA = (a.title || a.url).toLowerCase();
      const titleB = (b.title || b.url).toLowerCase();
      return titleA.localeCompare(titleB);
    });

    await reorderTabsAndSyncBrowser(sorted);
  };

  // 3. Sort by Domain
  const handleSortByDomain = async () => {
    if (!tabs || tabs.length <= 1) {
      setIsTabsMenuOpen(false);
      return;
    }
    setIsTabsMenuOpen(false);

    const sorted = [...tabs].sort((a, b) => {
      const domainA = extractDomain(a.url).toLowerCase();
      const domainB = extractDomain(b.url).toLowerCase();
      if (domainA !== domainB) {
        return domainA.localeCompare(domainB);
      }
      const titleA = (a.title || a.url).toLowerCase();
      const titleB = (b.title || b.url).toLowerCase();
      return titleA.localeCompare(titleB);
    });

    await reorderTabsAndSyncBrowser(sorted);
  };

  // 4. Export This Space
  const handleExportSpace = async () => {
    if (!tabs) return;
    setIsTabsMenuOpen(false);

    const targetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;
    const currentSpace = activeSpaceId ? await db.spaces.get(activeSpaceId) : null;
    const notes = await db.notes.where('spaceId').equals(targetSpaceId).toArray();
    const tasks = await db.tasks.where('spaceId').equals(targetSpaceId).sortBy('order');
    const sections = await db.resourceSections.where('spaceId').equals(targetSpaceId).sortBy('order');

    const resourcesData = [];
    for (const sec of sections) {
      const items = await db.resourceItems.where('sectionId').equals(sec.id).toArray();
      resourcesData.push({
        title: sec.title,
        order: sec.order,
        items: items.map((it) => ({
          title: it.title,
          url: it.url,
          type: it.type,
        })),
      });
    }

    const exportPayload = {
      app: 'SpaceTabs',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      space: {
        name: currentSpace?.name || 'Unsaved Session',
        icon: currentSpace?.icon || '📁',
        description: currentSpace?.description || '',
        section: currentSpace?.section || '',
      },
      tabs: tabs.map((t) => ({
        title: t.title,
        url: t.url,
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

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const spaceName = currentSpace?.name || 'unsaved';
    a.download = `${spaceName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-space.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 6. Move All Tabs
  const handleMoveAllTabs = async (targetSpaceId: string | null) => {
    if (!tabs || tabs.length === 0) return;
    setIsTabsMenuOpen(false);
    setShowMoveAllSubmenu(false);
    await moveTabsToSpace(
      tabs.map((t) => t.id),
      targetSpaceId
    );
    clearSelectedTabs();
  };

  // 7. Suspend All Tabs
  const handleSuspendAllTabs = async () => {
    setIsTabsMenuOpen(false);
    if (!tabs || tabs.length === 0) return;

    try {
      const curWin = await chrome.windows.getCurrent();
      const windowId = curWin?.id;

      if (windowId) {
        await setTransitionLock(windowId, true);
      }

      const dashboardUrl = chrome.runtime.getURL('/dashboard.html');
      const activeTabs = await chrome.tabs.query({ active: true });
      const activeTabIds = new Set(activeTabs.map((t) => t.id).filter(Boolean));

      for (const t of tabs) {
        if (t.chromeTabId && !activeTabIds.has(t.chromeTabId)) {
          if (
            !t.url.startsWith(dashboardUrl) &&
            !t.url.includes('/suspended.html') &&
            !t.url.startsWith('chrome://') &&
            !t.url.startsWith('about:') &&
            !t.url.startsWith('edge://') &&
            !t.url.startsWith('brave://')
          ) {
            try {
              const discarded = await chrome.tabs.discard(t.chromeTabId);
              if (discarded?.id && discarded.id !== t.chromeTabId) {
                await db.tabs.update(t.id, {
                  chromeTabId: discarded.id,
                  updatedAt: Date.now(),
                });
              }
            } catch {
              // Ignore tabs that cannot be discarded
            }
          }
        }
      }

      // Safety buffer to let Chromium discard lifecycle settle before releasing transition lock
      if (windowId) {
        setTimeout(async () => {
          try {
            await setTransitionLock(windowId, false);
            await syncWindowTabsToUnsaved(windowId);
          } catch {}
        }, 500);
      }
    } catch (err) {
      console.error('Failed to suspend all tabs:', err);
    }
  };

  // 8. Reload All Tabs
  const handleReloadAllTabs = async () => {
    setIsTabsMenuOpen(false);
    for (const t of tabs || []) {
      if (t.chromeTabId) {
        try {
          await chrome.tabs.reload(t.chromeTabId);
        } catch {}
      }
    }
  };

  // 9. Close Duplicate Tabs
  const handleCloseDuplicates = async () => {
    if (!tabs || tabs.length <= 1) {
      setIsTabsMenuOpen(false);
      return;
    }
    setIsTabsMenuOpen(false);

    const seenUrls = new Set<string>();
    const duplicateTabIds: string[] = [];

    for (const t of tabs) {
      const normalized = decodeRealUrl(t.url).toLowerCase().trim();
      if (seenUrls.has(normalized)) {
        duplicateTabIds.push(t.id);
      } else {
        seenUrls.add(normalized);
      }
    }

    if (duplicateTabIds.length > 0) {
      await closeTabs(duplicateTabIds);
    }
  };

  // 10. Close All Tabs
  const handleCloseAllTabs = async () => {
    if (!tabs || tabs.length === 0) return;
    setIsTabsMenuOpen(false);
    await closeTabs(tabs.map((t) => t.id));
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
      <div className="tab-manager-card bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm mb-6 relative z-10">
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
                className="cursor-pointer"
                title={allSelected ? 'Deselect all' : 'Select all'}
              />
            )}
            <Folder className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-semibold text-slate-100">Tabs</h2>
            {tabs && (
              <span className="text-xs text-slate-400 font-medium">
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
                      <div className="absolute right-0 top-full mt-1.5 z-50 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                          Move {selectedTabIds.size} tabs to
                        </div>

                        {/* Move to a New Space (on the fly) */}
                        <div className="p-1.5 border-b border-slate-800 bg-slate-950/40">
                          {isCreatingNewSpaceForTabs ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleMoveToNewSpace(Array.from(selectedTabIds), newSpaceNameInput);
                              }}
                              className="flex items-center gap-1.5"
                            >
                              <input
                                ref={newSpaceInputRef}
                                type="text"
                                value={newSpaceNameInput}
                                onChange={(e) => setNewSpaceNameInput(e.target.value)}
                                placeholder="Untitled Space"
                                className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-blue-500/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setIsCreatingNewSpaceForTabs(false);
                                    setNewSpaceNameInput('');
                                  }
                                }}
                              />
                              <button
                                type="submit"
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
                                title="Create and move tabs"
                              >
                                Move
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCreatingNewSpaceForTabs(false);
                                  setNewSpaceNameInput('');
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsCreatingNewSpaceForTabs(true);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-600/15 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Move to a New Space</span>
                            </button>
                          )}
                        </div>

                        <div className="max-h-48 overflow-y-auto py-1">
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
                            ?.filter((s) => s.id !== activeSpaceId)
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

            {/* Tabs Container 3-Dot Options Menu */}
            <div className="relative" ref={tabsMenuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTabsMenuOpen(!isTabsMenuOpen);
                  setShowMoveAllSubmenu(false);
                }}
                className={`p-1 rounded transition ${
                  isTabsMenuOpen
                    ? 'bg-slate-800 text-blue-400'
                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Tabs options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isTabsMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1.5 z-50 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* 1. Copy all links */}
                  <button
                    onClick={handleCopyAllLinks}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Link2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy all links</span>
                    </div>
                    {isCopiedAll && (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    )}
                  </button>

                  {/* 2. Sort alphabetically */}
                  <button
                    onClick={handleSortAlphabetically}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <ArrowDownAZ className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sort alphabetically</span>
                  </button>

                  {/* 3. Sort by domain */}
                  <button
                    onClick={handleSortByDomain}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sort by domain</span>
                  </button>

                  {/* 4. Export this space */}
                  <button
                    onClick={handleExportSpace}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Export this space</span>
                  </button>

                  <div className="border-t border-slate-800 my-1" />

                  {/* 5. Select all tabs */}
                  <button
                    onClick={() => {
                      handleSelectAllToggle();
                      setIsTabsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>{allSelected ? 'Deselect all' : 'Select all tabs'}</span>
                  </button>

                  {/* 6. Move all tabs */}
                  {spaces && (
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMoveAllSubmenu(!showMoveAllSubmenu);
                        }}
                        className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-2.5">
                          <FolderInput className="w-3.5 h-3.5 text-slate-400" />
                          <span>Move all tabs</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-500" />
                      </button>

                      {showMoveAllSubmenu && (
                        <div className="absolute right-full top-0 mr-1.5 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 max-h-48 overflow-y-auto">
                          <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                            Move all tabs to
                          </div>
                          {activeSpaceId !== null && (
                            <button
                              onClick={() => handleMoveAllTabs(null)}
                              className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 border-b border-slate-800/60 pb-2 mb-1"
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
                                onClick={() => handleMoveAllTabs(s.id)}
                                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                              >
                                <span>{s.icon || '📁'}</span>
                                <span className="truncate">{s.name}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 7. Suspend all tabs */}
                  <button
                    onClick={handleSuspendAllTabs}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <PauseCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Suspend all tabs</span>
                  </button>

                  {/* 8. Reload all tabs */}
                  <button
                    onClick={handleReloadAllTabs}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reload all tabs</span>
                  </button>

                  <div className="border-t border-slate-800 my-1" />

                  {/* 9. Close duplicate tabs */}
                  <button
                    onClick={handleCloseDuplicates}
                    className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Close duplicate tabs</span>
                  </button>

                  {/* 10. Close all tabs */}
                  <button
                    onClick={handleCloseAllTabs}
                    className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Close all tabs</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Items List */}
        <div className="divide-y divide-slate-800/50">
          {tabs && tabs.length > 0 ? (
            tabs.map((tab, index) => {
              const isSelected = selectedTabIds.has(tab.id);
              const isNearBottom = index >= Math.max(tabs.length - 2, 1);
              const isDropdownOpen = moveDropdownTabId === tab.id;

              const liveWindowId = tab.chromeTabId
                ? liveTabsMap.get(tab.chromeTabId)
                : undefined;
              const isOpenInThisWindow =
                liveWindowId !== undefined && liveWindowId === currentWindowId;
              const isOpenInOtherWindow =
                liveWindowId !== undefined && liveWindowId !== currentWindowId;

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
                  {/* Left: Grip + Checkbox + Favicon + Title + Window Status */}
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
                      className="cursor-pointer flex-shrink-0"
                    />

                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      {renderFavicon(tab.url, tab.favIconUrl)}
                    </div>

                    <button
                      onClick={() => locateOrOpenTab(tab)}
                      className="text-xs text-slate-200 hover:text-blue-400 font-medium truncate text-left transition"
                      title={tab.title}
                    >
                      {tab.title || tab.url}
                    </button>

                    {/* Window Status Badges */}
                    {isOpenInThisWindow && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0"
                        title="Tab is currently open in this browser window"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        This Window
                      </span>
                    )}

                    {isOpenInOtherWindow && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20 flex-shrink-0"
                        title="Tab is currently open in another browser window"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        Another Window
                      </span>
                    )}
                  </div>

                  {/* Right Actions (shown on hover or active dropdown) */}
                  <div
                    className={`flex items-center gap-1 transition-opacity ${
                      isDropdownOpen
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {/* Locate Tab Button */}
                    <button
                      onClick={() => locateOrOpenTab(tab)}
                      className={`p-1 rounded transition ${
                        isOpenInOtherWindow
                          ? 'hover:bg-purple-500/20 text-purple-400 hover:text-purple-200'
                          : isOpenInThisWindow
                          ? 'hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-200'
                          : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                      title={
                        isOpenInOtherWindow
                          ? 'Locate & switch to tab in another window'
                          : isOpenInThisWindow
                          ? 'Locate & switch to tab in this window'
                          : 'Open and focus tab'
                      }
                    >
                      <Crosshair className="w-3.5 h-3.5" />
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
                          className={`absolute right-0 z-50 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 overflow-hidden ${
                            isNearBottom ? 'bottom-full mb-1' : 'top-full mt-1'
                          }`}
                        >
                          <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800">
                            Move to Space
                          </div>

                          {/* Move to a New Space (on the fly) */}
                          <div className="p-1.5 border-b border-slate-800 bg-slate-950/40">
                            {isCreatingNewSpaceForTabs ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleMoveToNewSpace([tab.id], newSpaceNameInput);
                                }}
                                className="flex items-center gap-1.5"
                              >
                                <input
                                  ref={newSpaceInputRef}
                                  type="text"
                                  value={newSpaceNameInput}
                                  onChange={(e) => setNewSpaceNameInput(e.target.value)}
                                  placeholder="Untitled Space"
                                  className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-blue-500/50 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      setIsCreatingNewSpaceForTabs(false);
                                      setNewSpaceNameInput('');
                                    }
                                  }}
                                />
                                <button
                                  type="submit"
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
                                  title="Create and move tab"
                                >
                                  Move
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsCreatingNewSpaceForTabs(false);
                                    setNewSpaceNameInput('');
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsCreatingNewSpaceForTabs(true);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 hover:bg-blue-600/15 transition cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Move to a New Space</span>
                              </button>
                            )}
                          </div>

                          <div className="max-h-48 overflow-y-auto py-1">
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
                              ?.filter((s) => s.id !== tab.spaceId)
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
                      className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition"
                      title="Close Tab"
                    >
                      <X className="w-3.5 h-3.5" />
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
