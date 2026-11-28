import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type Tab, UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  moveTabsToSpace,
  openSelectedTabsInNewWindow,
  openTabsInCurrentWindow,
  closeTabs,
  sortSpaceTabsPreservingGroups,
  closeDuplicateTabs,
  closeTabsFromStripKeepInSpace,
  suspendAllTabsInCurrentWindow,
  reloadAllTabsInCurrentWindow,
  exportSpaceToFile,
  importIntoSpace,
  getNextSpaceOrder,
  type ExportFormat,
} from '@/services/tabManager';
import { decodeRealUrl } from '@/utils/urlFilter';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAutoFocusSelect } from '@/hooks/useAutoFocusSelect';
import { useClickOutside } from '@/hooks/useClickOutside';
import { Folder, FolderPlus } from 'lucide-react';
import { TabBatchBar } from './TabBatchBar';
import { TabsContainerMenu } from './TabsContainerMenu';
import { useLiveBrowserTabs } from './hooks/useLiveBrowserTabs';
import { renderTabFavicon } from './tabs/tabFavicon';
import { CreateGroupInlineBar } from './tabs/CreateGroupInlineBar';
import { TabListRow } from './tabs/TabListRow';
import { TabsGroupedBody } from './tabs/TabsGroupedBody';
import { useTabGroups } from './tabs/useTabGroups';

export const TabsView: React.FC = () => {
  const {
    activeSpaceId,
    searchQuery,
    selectedTabIds,
    toggleSelectTab,
    selectAllTabs,
    clearSelectedTabs,
  } = useUIStore();

  const allSpaceTabs = useLiveQuery(
    () => db.tabs.where('spaceId').equals(activeSpaceId || UNSAVED_SPACE_ID).sortBy('order'),
    [activeSpaceId]
  );

  const grp = useTabGroups(activeSpaceId);
  const validGroupIds = React.useMemo(
    () => new Set(grp.tabGroups.map((g) => g.id)),
    [grp.tabGroups]
  );

  const trimmedQuery = searchQuery.trim().toLowerCase();

  const tabs = React.useMemo(() => {
    if (!allSpaceTabs) return undefined;
    if (!trimmedQuery) return allSpaceTabs;
    const matchingGroupIds = new Set(
      grp.tabGroups
        .filter((g) => g.title.toLowerCase().includes(trimmedQuery))
        .map((g) => g.id)
    );
    return allSpaceTabs.filter(
      (t) =>
        t.title.toLowerCase().includes(trimmedQuery) ||
        t.url.toLowerCase().includes(trimmedQuery) ||
        Boolean(t.groupId && matchingGroupIds.has(t.groupId))
    );
  }, [allSpaceTabs, trimmedQuery, grp.tabGroups]);

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
  const [dragOverTabId, setDragOverTabId] = React.useState<string | null>(null);
  const [dragOverTabPos, setDragOverTabPos] = React.useState<'top' | 'bottom' | null>(null);
  const { resolveTabLiveState } = useLiveBrowserTabs(allSpaceTabs);
  const dropdownRef = React.useRef<HTMLDivElement>(null!);

  const [isCreatingNewSpaceForTabs, setIsCreatingNewSpaceForTabs] = React.useState(false);
  const [newSpaceNameInput, setNewSpaceNameInput] = React.useState('');
  const newSpaceInputRef = React.useRef<HTMLInputElement>(null!);
  useAutoFocusSelect(newSpaceInputRef, isCreatingNewSpaceForTabs);

  const [isTabsMenuOpen, setIsTabsMenuOpen] = React.useState(false);
  const [showMoveAllSubmenu, setShowMoveAllSubmenu] = React.useState(false);
  const [isCopiedAll, setIsCopiedAll] = React.useState(false);
  const tabsMenuRef = React.useRef<HTMLDivElement>(null!);
  const importSpaceInputRef = React.useRef<HTMLInputElement>(null!);

  const { showTabFavicons, groupedTabsOnTop } = useUserSettings();
  const isGroupedOnTop = groupedTabsOnTop !== false;
  const renderFavicon = React.useCallback(
    (url: string, fav?: string) => renderTabFavicon(showTabFavicons, url, fav),
    [showTabFavicons]
  );

  useClickOutside(
    [dropdownRef],
    () => {
      setMoveDropdownTabId(null);
      setIsCreatingNewSpaceForTabs(false);
      setNewSpaceNameInput('');
    },
    Boolean(moveDropdownTabId),
    true
  );

  useClickOutside(
    [tabsMenuRef],
    () => {
      setIsTabsMenuOpen(false);
      setShowMoveAllSubmenu(false);
    },
    isTabsMenuOpen,
    true
  );

  const allSelected =
    Boolean(tabs && tabs.length > 0 && tabs.every((t) => selectedTabIds.has(t.id)));

  const hasSelectedInGroup = React.useMemo(
    () =>
      Boolean(
        allSpaceTabs?.some(
          (t) => selectedTabIds.has(t.id) && t.groupId && validGroupIds.has(t.groupId)
        )
      ),
    [allSpaceTabs, selectedTabIds, validGroupIds]
  );

  const handleSelectAllToggle = () => {
    if (!tabs) return;
    if (allSelected) clearSelectedTabs();
    else selectAllTabs(tabs.map((t) => t.id));
  };

  const handleToggleSelectGroup = (groupTabs: Tab[], shouldSelect: boolean) => {
    const next = new Set(selectedTabIds);
    for (const t of groupTabs) {
      if (shouldSelect) next.add(t.id);
      else next.delete(t.id);
    }
    selectAllTabs(Array.from(next));
  };

  const handleMoveToNewSpace = async (tabIds: string[], spaceName: string) => {
    const trimmed = spaceName.trim() || 'Untitled Space';
    const newSpaceId = crypto.randomUUID();
    const nextOrder = await getNextSpaceOrder();
    const now = Date.now();
    await db.spaces.add({
      id: newSpaceId,
      name: trimmed,
      order: nextOrder,
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
      await navigator.clipboard.writeText(decodeRealUrl(url));
      setCopiedId(tabId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {}
  };

  const handleCopyAllLinks = async () => {
    if (!tabs || tabs.length === 0) return;
    try {
      await navigator.clipboard.writeText(tabs.map((t) => decodeRealUrl(t.url)).join('\n'));
      setIsCopiedAll(true);
      setTimeout(() => {
        setIsCopiedAll(false);
        setIsTabsMenuOpen(false);
      }, 1500);
    } catch {
      setIsTabsMenuOpen(false);
    }
  };

  const handleExportSpace = async (format: ExportFormat) => {
    if (!tabs) return;
    setIsTabsMenuOpen(false);
    await exportSpaceToFile(activeSpaceId, activeSpace?.name || 'Unsaved Session', format);
  };

  const handleImportIntoSpaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importIntoSpace(activeSpaceId, await file.text(), file.name);
    } catch (err) {
      console.error('Failed to import into space:', err);
    } finally {
      if (importSpaceInputRef.current) importSpaceInputRef.current.value = '';
    }
  };

  const renderTabRow = (
    tab: Tab,
    index: number,
    bucketLength: number,
    bucketGroupId: string | undefined
  ) => {
    const live = resolveTabLiveState(tab);
    return (
      <TabListRow
        key={tab.id}
        tab={tab}
        index={index}
        bucketLength={bucketLength}
        bucketGroupId={bucketGroupId}
        grp={grp}
        allSpaceTabs={allSpaceTabs}
        spaces={spaces}
        activeSpaceId={activeSpace?.isUnsaved ? null : activeSpaceId}
        selectedTabIds={selectedTabIds}
        copiedId={copiedId}
        moveDropdownTabId={moveDropdownTabId}
        draggingTabId={draggingTabId}
        dragOverTabId={dragOverTabId}
        dragOverTabPos={dragOverTabPos}
        dropdownRef={dropdownRef}
        newSpaceInputRef={newSpaceInputRef}
        isCreatingNewSpace={isCreatingNewSpaceForTabs}
        newSpaceName={newSpaceNameInput}
        resolvedChromeTabId={live.resolvedChromeTabId}
        isOpenInThisWindow={live.isOpenInThisWindow}
        isOpenInOtherWindow={live.isOpenInOtherWindow}
        renderFavicon={renderFavicon}
        onToggleSelect={() => toggleSelectTab(tab.id)}
        onCopyUrl={() => handleCopyUrl(tab.id, tab.url)}
        onSetMoveDropdownTabId={setMoveDropdownTabId}
        onSetDraggingTabId={setDraggingTabId}
        onSetDragOverTab={(id, pos) => {
          setDragOverTabId(id);
          setDragOverTabPos(pos);
        }}
        onStartCreateNewSpace={() => setIsCreatingNewSpaceForTabs(true)}
        onCancelCreateNewSpace={() => {
          setIsCreatingNewSpaceForTabs(false);
          setNewSpaceNameInput('');
        }}
        onSetNewSpaceName={setNewSpaceNameInput}
        onMoveToNewSpace={(name) => handleMoveToNewSpace([tab.id], name)}
      />
    );
  };

  const hasGroups = grp.tabGroups.length > 0;
  const ungroupedTabs = React.useMemo(
    () => (tabs || []).filter((t) => !t.groupId || !validGroupIds.has(t.groupId)),
    [tabs, validGroupIds]
  );

  const cardRef = React.useRef<HTMLDivElement>(null);
  const [isCompactBar, setIsCompactBar] = React.useState(false);

  React.useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateWidth = (width: number) => {
      setIsCompactBar(width > 0 && width < 660);
    };
    updateWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      if (entries[0]) updateWidth(entries[0].target.getBoundingClientRect().width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="px-8 py-6 max-w-4xl mx-auto w-full select-none pb-32 relative overflow-visible">
      <div
        ref={cardRef}
        className="tab-manager-card bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm mb-6 relative z-10 overflow-visible"
      >
        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800/80 mb-2 min-w-0">
          <div className="flex items-center gap-2.5 flex-shrink-0">
            {tabs && tabs.length > 0 && (
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = selectedTabIds.size > 0 && !allSelected;
                }}
                onChange={handleSelectAllToggle}
                className="cursor-pointer"
                title={allSelected ? 'Deselect all' : 'Select all'}
              />
            )}
            {selectedTabIds.size > 0 ? (
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/25 text-xs font-semibold text-blue-400 whitespace-nowrap">
                  {selectedTabIds.size} selected
                </span>
                {!allSelected && tabs && (
                  <button
                    type="button"
                    onClick={handleSelectAllToggle}
                    className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition whitespace-nowrap"
                  >
                    All ({tabs.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearSelectedTabs}
                  className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition whitespace-nowrap"
                >
                  {allSelected ? 'Deselect' : 'Clear'}
                </button>
              </div>
            ) : (
              <>
                <Folder className="w-5 h-5 text-blue-400" />
                <h2 className="text-base font-semibold text-slate-100">Tabs</h2>
                {tabs && <span className="text-xs text-slate-400 font-medium">({tabs.length})</span>}
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-1.5 min-w-0 flex-wrap">
            <TabBatchBar
              selectedCount={selectedTabIds.size}
              isCompact={isCompactBar}
              hasSelectedInGroup={hasSelectedInGroup}
              spaces={spaces}
              tabGroups={grp.tabGroups}
              activeSpaceId={activeSpace?.isUnsaved ? null : activeSpaceId}
              isMoveDropdownOpen={moveDropdownTabId === 'bulk'}
              dropdownRef={dropdownRef}
              newSpaceInputRef={newSpaceInputRef}
              isCreatingNewSpace={isCreatingNewSpaceForTabs}
              newSpaceName={newSpaceNameInput}
              onToggleMoveDropdown={(e) => {
                e.stopPropagation();
                setMoveDropdownTabId(moveDropdownTabId === 'bulk' ? null : 'bulk');
              }}
              onMoveSelected={async (targetSpaceId) => {
                await moveTabsToSpace(Array.from(selectedTabIds), targetSpaceId);
                clearSelectedTabs();
                setMoveDropdownTabId(null);
              }}
              onAssignSelectedToGroup={async (targetGroupId) => {
                await grp.handleAssignTabs(Array.from(selectedTabIds), targetGroupId);
                clearSelectedTabs();
              }}
              onCreateGroupWithSelected={async (title, color) => {
                await grp.handleCreateGroupWithTabs(Array.from(selectedTabIds), title, color);
                clearSelectedTabs();
              }}
              onOpenSelectedInCurrentWindow={async () => {
                await openTabsInCurrentWindow(Array.from(selectedTabIds));
                clearSelectedTabs();
              }}
              onOpenSelectedInNewWindow={async () => {
                await openSelectedTabsInNewWindow(Array.from(selectedTabIds));
                clearSelectedTabs();
              }}
              onCloseSelectedFromStrip={async () => {
                await closeTabsFromStripKeepInSpace(Array.from(selectedTabIds));
                clearSelectedTabs();
              }}
              onDeleteSelected={async () => {
                await closeTabs(Array.from(selectedTabIds));
                clearSelectedTabs();
              }}
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

            {selectedTabIds.size === 0 ? (
              <button
                type="button"
                onClick={grp.openCreateGroupBar}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white border border-slate-700/70 transition flex-shrink-0"
                title="Create a new tab group in this space"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Group</span>
              </button>
            ) : (
              <div className="h-4 w-px bg-slate-800 flex-shrink-0 mx-0.5" />
            )}

            <input
              ref={importSpaceInputRef}
              type="file"
              accept=".json,.html,.htm"
              onChange={handleImportIntoSpaceFile}
              className="hidden"
            />
            <TabsContainerMenu
              isOpen={isTabsMenuOpen}
              menuRef={tabsMenuRef}
              isCopiedAll={isCopiedAll}
              allSelected={allSelected}
              hasGroups={hasGroups}
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
              onSortAlphabetically={async () => {
                setIsTabsMenuOpen(false);
                await sortSpaceTabsPreservingGroups(activeSpaceId, 'alpha');
              }}
              onSortByDomain={async () => {
                setIsTabsMenuOpen(false);
                await sortSpaceTabsPreservingGroups(activeSpaceId, 'domain');
              }}
              onGroupByDomain={async () => {
                setIsTabsMenuOpen(false);
                await grp.handleGroupByDomain();
              }}
              onUngroupAll={async () => {
                setIsTabsMenuOpen(false);
                await grp.handleUngroupAll();
              }}
              onExportSpace={handleExportSpace}
              onImportIntoSpace={() => {
                setIsTabsMenuOpen(false);
                importSpaceInputRef.current?.click();
              }}
              onSelectAllToggle={() => {
                handleSelectAllToggle();
                setIsTabsMenuOpen(false);
              }}
              onMoveAllTabs={async (targetSpaceId) => {
                if (!tabs || tabs.length === 0) return;
                setIsTabsMenuOpen(false);
                setShowMoveAllSubmenu(false);
                await moveTabsToSpace(tabs.map((t) => t.id), targetSpaceId);
              }}
              onSuspendAllTabs={async () => {
                if (!tabs || tabs.length === 0) return;
                setIsTabsMenuOpen(false);
                await suspendAllTabsInCurrentWindow();
              }}
              onCloseAllFromStrip={async () => {
                if (!tabs || tabs.length === 0) return;
                setIsTabsMenuOpen(false);
                await closeTabsFromStripKeepInSpace(tabs.map((t) => t.id));
              }}
              onReloadAllTabs={async () => {
                if (!tabs || tabs.length === 0) return;
                setIsTabsMenuOpen(false);
                await reloadAllTabsInCurrentWindow();
              }}
              onCloseDuplicates={async () => {
                setIsTabsMenuOpen(false);
                if (tabs && tabs.length > 1) await closeDuplicateTabs(tabs);
              }}
              onCloseAllTabs={async () => {
                if (!tabs || tabs.length === 0) return;
                setIsTabsMenuOpen(false);
                await closeTabs(tabs.map((t) => t.id));
              }}
            />
          </div>
        </div>

        {grp.isCreatingGroup && (
          <CreateGroupInlineBar
            inputRef={grp.newGroupInputRef}
            title={grp.newGroupTitle}
            color={grp.newGroupColor}
            onTitleChange={grp.setNewGroupTitle}
            onColorChange={grp.setNewGroupColor}
            onSubmit={grp.handleSubmitCreateGroup}
            onCancel={() => grp.setIsCreatingGroup(false)}
          />
        )}

        {/* Canvas Body: Zero-clutter flat list when 0 groups, or Grouped blocks + Ungrouped */}
        {!hasGroups ? (
          <div className="divide-y divide-slate-800/50">
            {tabs && tabs.length > 0 ? (
              tabs.map((tab, idx) => renderTabRow(tab, idx, tabs.length, undefined))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 italic">
                {activeSpaceId === null
                  ? 'No active unsaved tabs in current window.'
                  : 'No tabs in this space yet. Drag or move tabs here.'}
              </div>
            )}
          </div>
        ) : (
          <TabsGroupedBody
            grp={grp}
            tabs={tabs}
            allSpaceTabs={allSpaceTabs}
            ungroupedTabs={ungroupedTabs}
            groupedTabsOnTop={isGroupedOnTop}
            trimmedQuery={trimmedQuery}
            selectedTabIds={selectedTabIds}
            draggingTabId={draggingTabId}
            onClearDraggingTab={() => setDraggingTabId(null)}
            onToggleSelectGroup={handleToggleSelectGroup}
            resolveTabLiveState={resolveTabLiveState}
            renderTabRow={renderTabRow}
          />
        )}
      </div>
    </div>
  );
};
