import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type Tab, UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import { getUserSettings } from '@/services/settings';
import {
  focusOrOpenTab,
  moveTabsToSpace,
  locateOrOpenTab,
  openTabInNewWindow,
  openSelectedTabsInNewWindow,
  closeTabs,
  setTransitionLock,
  syncWindowTabsToUnsaved,
} from '@/services/tabManager';
import { decodeRealUrl, extractDomain, isSystemOrExtensionUrl } from '@/utils/urlFilter';
import {
  Folder,
  Puzzle,
  Settings,
  Bookmark,
  Download,
  History,
  Compass,
  Globe,
} from 'lucide-react';
import { TabItem } from './TabItem';
import { TabBatchBar } from './TabBatchBar';
import { TabsContainerMenu } from './TabsContainerMenu';

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
    return list.filter((s) => !s.isArchived && !s.isUnsaved);
  });

  const activeSpace = useLiveQuery(
    () => (activeSpaceId ? db.spaces.get(activeSpaceId) : undefined),
    [activeSpaceId]
  );

  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [moveDropdownTabId, setMoveDropdownTabId] = React.useState<string | null>(null);
  const [draggingTabId, setDraggingTabId] = React.useState<string | null>(null);
  const [dragOverTabIndex, setDragOverTabIndex] = React.useState<number | null>(null);
  const [currentWindowId, setCurrentWindowId] = React.useState<number | null>(null);
  const [liveTabsMap, setLiveTabsMap] = React.useState<Map<number, number>>(new Map()); // chromeTabId -> windowId
  const [allLiveTabsList, setAllLiveTabsList] = React.useState<chrome.tabs.Tab[]>([]);
  const dropdownRef = React.useRef<HTMLDivElement>(null!);

  // On-the-fly "Move to a New Space" creation state
  const [isCreatingNewSpaceForTabs, setIsCreatingNewSpaceForTabs] = React.useState(false);
  const [newSpaceNameInput, setNewSpaceNameInput] = React.useState('');
  const newSpaceInputRef = React.useRef<HTMLInputElement>(null!);

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
  const tabsMenuRef = React.useRef<HTMLDivElement>(null!);

  // Web Favicons Visibility Preference
  const [showTabFavicons, setShowTabFavicons] = React.useState(true);
  React.useEffect(() => {
    getUserSettings().then((s) => {
      if (typeof s.showTabFavicons === 'boolean') {
        setShowTabFavicons(s.showTabFavicons);
      }
    });

    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === 'local' && changes['spacetabs_user_settings']) {
        const next = changes['spacetabs_user_settings'].newValue;
        if (next && typeof next.showTabFavicons === 'boolean') {
          setShowTabFavicons(next.showTabFavicons);
        }
      }
    };

    chrome.storage?.onChanged?.addListener(handleStorageChange);
    return () => {
      chrome.storage?.onChanged?.removeListener(handleStorageChange);
    };
  }, []);

  // Track live Chrome windows and tabs to show accurate window status badges
  React.useEffect(() => {
    let isMounted = true;

    // Anchor host window ID reliably from the dashboard's own tab context
    const initHostWindow = async () => {
      try {
        const curTab = await chrome.tabs.getCurrent();
        if (isMounted && curTab?.windowId) {
          setCurrentWindowId(curTab.windowId);
          return;
        }
      } catch {}
      try {
        const curWin = await chrome.windows.getCurrent();
        if (isMounted && curWin?.id) {
          setCurrentWindowId(curWin.id);
        }
      } catch {}
    };
    initHostWindow();

    const refreshLiveTabs = async () => {
      try {
        const all = await chrome.tabs.query({});
        const map = new Map<number, number>();
        for (const t of all) {
          if (t.id && t.windowId) {
            map.set(t.id, t.windowId);
          }
        }
        if (isMounted) {
          setLiveTabsMap(map);
          setAllLiveTabsList(all);
        }
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
    chrome.tabs.onAttached?.addListener(onEvent);
    chrome.tabs.onDetached?.addListener(onEvent);

    return () => {
      isMounted = false;
      chrome.tabs.onCreated.removeListener(onEvent);
      chrome.tabs.onRemoved.removeListener(onEvent);
      chrome.tabs.onUpdated.removeListener(onEvent);
      chrome.tabs.onActivated.removeListener(onEvent);
      chrome.tabs.onAttached?.removeListener(onEvent);
      chrome.tabs.onDetached?.removeListener(onEvent);
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

  const handleMoveSelected = async (targetSpaceId: string | null) => {
    const ids = Array.from(selectedTabIds);
    await moveTabsToSpace(ids, targetSpaceId);
    clearSelectedTabs();
    setMoveDropdownTabId(null);
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selectedTabIds);
    await closeTabs(ids);
    clearSelectedTabs();
  };

  const handleOpenSelectedInNewWindow = async () => {
    const ids = Array.from(selectedTabIds);
    await openSelectedTabsInNewWindow(ids);
    clearSelectedTabs();
  };

  const handleMoveTab = async (tabId: string, targetSpaceId: string | null) => {
    await moveTabsToSpace([tabId], targetSpaceId);
    setMoveDropdownTabId(null);
  };

  const handleDeleteTab = async (tabId: string) => {
    await closeTabs([tabId]);
  };

  const handleMoveToNewSpace = async (tabIds: string[], spaceName: string) => {
    const trimmed = spaceName.trim() || 'Untitled Space';
    const newSpaceId = crypto.randomUUID();
    const count = await db.spaces.count();
    const now = Date.now();

    await db.spaces.add({
      id: newSpaceId,
      name: trimmed,
      order: count,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    });

    await moveTabsToSpace(tabIds, newSpaceId);

    setIsCreatingNewSpaceForTabs(false);
    setNewSpaceNameInput('');
    setMoveDropdownTabId(null);
    clearSelectedTabs();
  };

  const handleCopyUrl = async (tabId: string, url: string) => {
    try {
      const realUrl = decodeRealUrl(url);
      await navigator.clipboard.writeText(realUrl);
      setCopiedId(tabId);
      setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch {
      // Failed to copy
    }
  };

  // 1. Copy All Links
  const handleCopyAllLinks = async () => {
    if (!tabs || tabs.length === 0) return;
    const links = tabs.map((t) => decodeRealUrl(t.url)).join('\n');
    try {
      await navigator.clipboard.writeText(links);
      setIsCopiedAll(true);
      setTimeout(() => {
        setIsCopiedAll(false);
        setIsTabsMenuOpen(false);
      }, 1500);
    } catch {
      setIsTabsMenuOpen(false);
    }
  };

  // Reorder tabs in Dexie AND synchronously reorder open Chrome tabs in the browser window
  const reorderTabsAndSyncBrowser = async (sortedTabs: Tab[]) => {
    const now = Date.now();
    await db.transaction('rw', db.tabs, async () => {
      for (let i = 0; i < sortedTabs.length; i++) {
        await db.tabs.update(sortedTabs[i].id, {
          order: i,
          updatedAt: now,
        });
      }
    });

    try {
      const allBrowserTabs = await chrome.tabs.query({});
      const windowIds = Array.from(
        new Set(
          allBrowserTabs
            .map((t) => t.windowId)
            .filter((id): id is number => typeof id === 'number')
        )
      );

      for (const winId of windowIds) {
        const windowTabs = allBrowserTabs.filter((t) => t.windowId === winId);
        const pinnedCount = windowTabs.filter((t) => t.pinned).length;

        const usedBrowserTabIds = new Set<number>();
        const orderedTabIds: number[] = [];

        for (const st of sortedTabs) {
          let match = windowTabs.find(
            (wt) =>
              wt.id &&
              !usedBrowserTabIds.has(wt.id) &&
              st.chromeTabId &&
              wt.id === st.chromeTabId
          );
          if (!match) {
            const stRealUrl = decodeRealUrl(st.url);
            match = windowTabs.find((wt) => {
              if (!wt.id || usedBrowserTabIds.has(wt.id) || wt.pinned) return false;
              const wtUrl = wt.url || wt.pendingUrl || '';
              if (!wtUrl || isSystemOrExtensionUrl(wtUrl)) return false;
              return decodeRealUrl(wtUrl) === stRealUrl;
            });
          }
          if (match?.id) {
            usedBrowserTabIds.add(match.id);
            orderedTabIds.push(match.id);
          }
        }

        if (orderedTabIds.length > 0) {
          await setTransitionLock(winId, true);
          try {
            try {
              await chrome.tabs.move(orderedTabIds, { index: pinnedCount });
            } catch {
              for (let idx = 0; idx < orderedTabIds.length; idx++) {
                try {
                  await chrome.tabs.move(orderedTabIds[idx], { index: pinnedCount + idx });
                } catch {}
              }
            }
          } finally {
            await setTransitionLock(winId, false);
          }
        }
      }
    } catch (err) {
      console.error('Failed to reorder Chrome tabs:', err);
    }
  };

  // 2. Sort Alphabetically
  const handleSortAlphabetically = async () => {
    if (!tabs || tabs.length <= 1) {
      setIsTabsMenuOpen(false);
      return;
    }
    setIsTabsMenuOpen(false);
    const sorted = [...tabs].sort((a, b) =>
      (a.title || a.url).localeCompare(b.title || b.url, undefined, {
        sensitivity: 'base',
        numeric: true,
      })
    );
    if (sorted.every((t, idx) => t.id === tabs[idx].id)) {
      sorted.reverse();
    }
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
      return (a.title || a.url).localeCompare(b.title || b.url, undefined, {
        sensitivity: 'base',
        numeric: true,
      });
    });
    if (sorted.every((t, idx) => t.id === tabs[idx].id)) {
      sorted.reverse();
    }
    await reorderTabsAndSyncBrowser(sorted);
  };

  // 4. Export This Space
  const handleExportSpace = async () => {
    if (!tabs) return;
    setIsTabsMenuOpen(false);
    const spaceName = activeSpace?.name || 'Unsaved Session';

    const notes = activeSpaceId
      ? await db.notes.where('spaceId').equals(activeSpaceId).toArray()
      : [];
    const tasks = activeSpaceId
      ? await db.tasks.where('spaceId').equals(activeSpaceId).sortBy('order')
      : [];
    const sections = activeSpaceId
      ? await db.resourceSections.where('spaceId').equals(activeSpaceId).sortBy('order')
      : [];

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
      version: '1.2.1',
      exportedAt: new Date().toISOString(),
      space: {
        name: spaceName,
        icon: activeSpace?.icon,
        description: activeSpace?.description,
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
  };

  // 7. Suspend All Tabs in Current Workspace
  const handleSuspendAllTabs = async () => {
    if (!tabs || tabs.length === 0) return;
    setIsTabsMenuOpen(false);

    try {
      const curWin = await chrome.windows.getCurrent();
      if (!curWin.id) return;

      const browserTabs = await chrome.tabs.query({ windowId: curWin.id });
      const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

      for (const t of browserTabs) {
        if (!t.id || !t.url) continue;
        if (t.pinned) continue;
        if (t.active) continue;
        if (t.audible) continue;
        if (t.url.startsWith(dashboardUrl) || t.url.includes('/suspended.html')) continue;

        try {
          await chrome.tabs.discard(t.id);
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to discard all tabs:', e);
    }
  };

  // 8. Reload All Tabs
  const handleReloadAllTabs = async () => {
    if (!tabs || tabs.length === 0) return;
    setIsTabsMenuOpen(false);

    try {
      const curWin = await chrome.windows.getCurrent();
      if (!curWin.id) return;

      const browserTabs = await chrome.tabs.query({ windowId: curWin.id });
      const dashboardUrl = chrome.runtime.getURL('/dashboard.html');

      for (const t of browserTabs) {
        if (!t.id || !t.url) continue;
        if (t.url.startsWith(dashboardUrl)) continue;

        try {
          await chrome.tabs.reload(t.id);
        } catch {}
      }
    } catch (e) {
      console.warn('Failed to reload all tabs:', e);
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
    if (!showTabFavicons) {
      return null;
    }

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
    <div className="px-8 py-6 max-w-4xl mx-auto w-full select-none pb-32 relative overflow-visible">
      {/* Tabs Header Block */}
      <div className="tab-manager-card bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm mb-6 relative z-10 overflow-visible">
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
            {/* Batch Selection Action Bar */}
            <TabBatchBar
              selectedCount={selectedTabIds.size}
              totalCount={tabs?.length || 0}
              allSelected={allSelected || false}
              spaces={spaces}
              activeSpaceId={activeSpace?.isUnsaved ? null : activeSpaceId}
              isMoveDropdownOpen={moveDropdownTabId === 'bulk'}
              dropdownRef={dropdownRef}
              newSpaceInputRef={newSpaceInputRef}
              isCreatingNewSpace={isCreatingNewSpaceForTabs}
              newSpaceName={newSpaceNameInput}
              onSelectAllToggle={handleSelectAllToggle}
              onToggleMoveDropdown={(e) => {
                e.stopPropagation();
                setMoveDropdownTabId(moveDropdownTabId === 'bulk' ? null : 'bulk');
              }}
              onMoveSelected={handleMoveSelected}
              onOpenSelectedInNewWindow={handleOpenSelectedInNewWindow}
              onDeleteSelected={handleDeleteSelected}
              onStartCreateNewSpace={() => setIsCreatingNewSpaceForTabs(true)}
              onCancelCreateNewSpace={() => {
                setIsCreatingNewSpaceForTabs(false);
                setNewSpaceNameInput('');
              }}
              onSetNewSpaceName={setNewSpaceNameInput}
              onMoveToNewSpace={(name) =>
                handleMoveToNewSpace(Array.from(selectedTabIds), name)
              }
            />

            {/* Tabs Container 3-Dot Options Menu */}
            <TabsContainerMenu
              isOpen={isTabsMenuOpen}
              menuRef={tabsMenuRef}
              isCopiedAll={isCopiedAll}
              allSelected={allSelected || false}
              spaces={spaces}
              activeSpaceId={activeSpace?.isUnsaved ? null : activeSpaceId}
              showMoveAllSubmenu={showMoveAllSubmenu}
              onToggleMenu={(e) => {
                e.stopPropagation();
                setIsTabsMenuOpen(!isTabsMenuOpen);
                setShowMoveAllSubmenu(false);
              }}
              onToggleMoveAllSubmenu={(e) => {
                e.stopPropagation();
                setShowMoveAllSubmenu(!showMoveAllSubmenu);
              }}
              onCopyAllLinks={handleCopyAllLinks}
              onSortAlphabetically={handleSortAlphabetically}
              onSortByDomain={handleSortByDomain}
              onExportSpace={handleExportSpace}
              onSelectAllToggle={() => {
                handleSelectAllToggle();
                setIsTabsMenuOpen(false);
              }}
              onMoveAllTabs={handleMoveAllTabs}
              onSuspendAllTabs={handleSuspendAllTabs}
              onReloadAllTabs={handleReloadAllTabs}
              onCloseDuplicates={handleCloseDuplicates}
              onCloseAllTabs={handleCloseAllTabs}
            />
          </div>
        </div>

        {/* Tab Items List */}
        <div className="divide-y divide-slate-800/50">
          {tabs && tabs.length > 0 ? (
            tabs.map((tab, index) => {
              let liveWindowId = tab.chromeTabId
                ? liveTabsMap.get(tab.chromeTabId)
                : undefined;

              // Fallback URL match if tab record's chromeTabId is stale or from a prior session
              if (liveWindowId === undefined && allLiveTabsList.length > 0) {
                const realUrl = decodeRealUrl(tab.url);
                const match = allLiveTabsList.find((bt) => {
                  if (!bt.url || isSystemOrExtensionUrl(bt.url)) return false;
                  return (
                    decodeRealUrl(bt.url) === realUrl ||
                    decodeRealUrl(bt.pendingUrl || '') === realUrl
                  );
                });
                if (match && match.windowId) {
                  liveWindowId = match.windowId;
                }
              }

              const isOpenInThisWindow =
                liveWindowId !== undefined && liveWindowId === currentWindowId;
              const isOpenInOtherWindow =
                liveWindowId !== undefined && liveWindowId !== currentWindowId;

              return (
                <TabItem
                  key={tab.id}
                  tab={tab}
                  isSelected={selectedTabIds.has(tab.id)}
                  isDropdownOpen={moveDropdownTabId === tab.id}
                  isNearBottom={index >= Math.max(tabs.length - 2, 1)}
                  isDragging={draggingTabId === tab.id}
                  isOpenInThisWindow={isOpenInThisWindow}
                  isOpenInOtherWindow={isOpenInOtherWindow}
                  copiedId={copiedId}
                  spaces={spaces}
                  activeSpaceId={activeSpace?.isUnsaved ? null : activeSpaceId}
                  dropdownRef={dropdownRef}
                  newSpaceInputRef={newSpaceInputRef}
                  isCreatingNewSpace={isCreatingNewSpaceForTabs}
                  newSpaceName={newSpaceNameInput}
                  renderFavicon={renderFavicon}
                  onToggleSelect={() => toggleSelectTab(tab.id)}
                  onLocateOrOpen={() => locateOrOpenTab(tab)}
                  onOpenInNewWindow={() => openTabInNewWindow(tab)}
                  onCopyUrl={() => handleCopyUrl(tab.id, tab.url)}
                  onCloseTab={() => handleDeleteTab(tab.id)}
                  onToggleDropdown={(e) => {
                    e.stopPropagation();
                    setMoveDropdownTabId(moveDropdownTabId === tab.id ? null : tab.id);
                  }}
                  onMoveToSpace={(targetSpaceId) => handleMoveTab(tab.id, targetSpaceId)}
                  onStartCreateNewSpace={() => setIsCreatingNewSpaceForTabs(true)}
                  onCancelCreateNewSpace={() => {
                    setIsCreatingNewSpaceForTabs(false);
                    setNewSpaceNameInput('');
                  }}
                  onSetNewSpaceName={setNewSpaceNameInput}
                  onMoveToNewSpace={(name) => handleMoveToNewSpace([tab.id], name)}
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
                    setDragOverTabIndex(null);
                  }}
                  dragOverPosition={
                    dragOverTabIndex === index && draggingTabId && draggingTabId !== tab.id
                      ? tabs.findIndex((t) => t.id === draggingTabId) < index
                        ? 'bottom'
                        : 'top'
                      : null
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverTabIndex !== index) {
                      setDragOverTabIndex(index);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverTabIndex === index) {
                      setDragOverTabIndex(null);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverTabIndex(null);
                    const fromId = draggingTabId || e.dataTransfer.getData('text/plain');
                    setDraggingTabId(null);
                    if (!fromId || !tabs) return;

                    const fromIndex = tabs.findIndex((t) => t.id === fromId);
                    if (fromIndex === -1 || fromIndex === index) return;

                    const reordered = [...tabs];
                    const [moved] = reordered.splice(fromIndex, 1);
                    reordered.splice(index, 0, moved);

                    await reorderTabsAndSyncBrowser(reordered);
                  }}
                />
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
