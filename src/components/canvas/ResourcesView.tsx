import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type ResourceSection, type ResourceItem, UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import { focusOrOpenTab } from '@/services/tabManager';
import { decodeRealUrl, extractDomain } from '@/utils/urlFilter';
import {
  Bookmark,
  Plus,
  Folder,
  MoreVertical,
  ExternalLink,
  Trash2,
  Pencil,
  Copy,
  Check,
  GripVertical,
  FileText,
  Table,
  Presentation,
  Globe,
  ChevronDown,
  ChevronRight,
  Layers,
  ArrowUpRight,
  PlusCircle,
  X,
  FolderInput,
  FolderPlus,
  Link,
} from 'lucide-react';

/**
 * Detects the resource document type based on URL patterns
 */
function detectResourceType(url: string): 'doc' | 'sheet' | 'custom' | 'link' {
  const lower = url.toLowerCase();
  if (lower.includes('docs.google.com/document') || lower.includes('/document/d/')) return 'doc';
  if (lower.includes('docs.google.com/spreadsheets') || lower.includes('/spreadsheets/d/')) return 'sheet';
  if (lower.includes('docs.google.com/presentation') || lower.includes('/presentation/d/')) return 'custom';
  return 'link';
}

export const ResourcesView: React.FC = () => {
  const { activeSpaceId, searchQuery } = useUIStore();
  const targetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;

  // Active space metadata
  const activeSpace = useLiveQuery(
    () => (activeSpaceId ? db.spaces.get(activeSpaceId) : undefined),
    [activeSpaceId]
  );

  // Sections for this space
  const sections = useLiveQuery(
    () => db.resourceSections.where('spaceId').equals(targetSpaceId).sortBy('order'),
    [targetSpaceId]
  );

  // All resource items
  const allItems = useLiveQuery(() => db.resourceItems.toArray());

  // Currently open tabs in this space/window (for "Add from Open Tabs" feature)
  const openTabs = useLiveQuery(
    () => db.tabs.where('spaceId').equals(targetSpaceId).sortBy('order'),
    [targetSpaceId]
  );

  // UI state
  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const [isAddingSection, setIsAddingSection] = React.useState(false);
  const [newSectionTitle, setNewSectionTitle] = React.useState('');
  const [editingSectionId, setEditingSectionId] = React.useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = React.useState('');

  // Dropdown states
  const [activeSectionMenuId, setActiveSectionMenuId] = React.useState<string | null>(null);
  const [activeItemMenuId, setActiveItemMenuId] = React.useState<string | null>(null);
  const [addOpenTabSectionId, setAddOpenTabSectionId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Add / Edit Resource Modal
  const [resourceModal, setResourceModal] = React.useState<{
    isOpen: boolean;
    mode: 'add' | 'edit';
    sectionId: string;
    itemId?: string;
    title: string;
    url: string;
  }>({
    isOpen: false,
    mode: 'add',
    sectionId: '',
    title: '',
    url: '',
  });

  // Drag and drop state
  const [draggingItemId, setDraggingItemId] = React.useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = React.useState<string | null>(null);

  const sectionMenuRef = React.useRef<HTMLDivElement>(null);
  const itemMenuRef = React.useRef<HTMLDivElement>(null);
  const openTabsDropdownRef = React.useRef<HTMLDivElement>(null);
  const editSectionInputRef = React.useRef<HTMLInputElement>(null);

  // Click-away listener to dismiss active menus
  React.useEffect(() => {
    if (!activeSectionMenuId && !activeItemMenuId && !addOpenTabSectionId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target as Node)) {
        setActiveSectionMenuId(null);
      }
      if (itemMenuRef.current && !itemMenuRef.current.contains(e.target as Node)) {
        setActiveItemMenuId(null);
      }
      if (openTabsDropdownRef.current && !openTabsDropdownRef.current.contains(e.target as Node)) {
        setAddOpenTabSectionId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSectionMenuId(null);
        setActiveItemMenuId(null);
        setAddOpenTabSectionId(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeSectionMenuId, activeItemMenuId, addOpenTabSectionId]);

  // Focus rename section input
  React.useEffect(() => {
    if (editingSectionId && editSectionInputRef.current) {
      editSectionInputRef.current.focus();
      editSectionInputRef.current.select();
    }
  }, [editingSectionId]);

  // Map items to sections and apply search filtering
  const itemsBySection = React.useMemo(() => {
    const map = new Map<string, ResourceItem[]>();
    if (!allItems) return map;

    const query = searchQuery.trim().toLowerCase();

    for (const item of allItems) {
      if (query) {
        const matches =
          item.title.toLowerCase().includes(query) ||
          item.url.toLowerCase().includes(query);
        if (!matches) continue;
      }

      const list = map.get(item.sectionId) || [];
      list.push(item);
      map.set(item.sectionId, list);
    }

    // Sort items within each section by order or createdAt
    for (const [secId, list] of map.entries()) {
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }

    return map;
  }, [allItems, searchQuery]);

  // Toggle section collapse
  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  // Create new section
  const handleCreateSection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newSectionTitle.trim() || 'New Section';
    const count = sections?.length || 0;
    const now = Date.now();

    await db.resourceSections.add({
      id: crypto.randomUUID(),
      spaceId: targetSpaceId,
      title,
      order: count,
      updatedAt: now,
    });

    setNewSectionTitle('');
    setIsAddingSection(false);
  };

  // Start editing section title
  const handleStartRenameSection = (section: ResourceSection) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
    setActiveSectionMenuId(null);
  };

  // Save renamed section
  const handleSaveRenameSection = async () => {
    if (!editingSectionId) return;
    const title = editingSectionTitle.trim();
    if (title) {
      await db.resourceSections.update(editingSectionId, {
        title,
        updatedAt: Date.now(),
      });
    }
    setEditingSectionId(null);
  };

  // Delete section and its items
  const handleDeleteSection = async (sectionId: string) => {
    setActiveSectionMenuId(null);
    // Delete all items under this section
    const itemsToDelete = await db.resourceItems.where('sectionId').equals(sectionId).toArray();
    for (const it of itemsToDelete) {
      await db.resourceItems.delete(it.id);
    }
    // Delete section
    await db.resourceSections.delete(sectionId);
  };

  // Open all resources in a section
  const handleOpenAllInSection = async (sectionId: string) => {
    setActiveSectionMenuId(null);
    const items = itemsBySection.get(sectionId) || [];
    for (const it of items) {
      try {
        await chrome.tabs.create({ url: it.url, active: false });
      } catch {}
    }
  };

  // Open resource link
  const handleOpenResource = async (url: string) => {
    await focusOrOpenTab(url);
  };

  // Copy resource link
  const handleCopyLink = async (id: string, url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
    setActiveItemMenuId(null);
  };

  // Delete resource item
  const handleDeleteItem = async (itemId: string) => {
    setActiveItemMenuId(null);
    await db.resourceItems.delete(itemId);
  };

  // Move resource item to another section
  const handleMoveItemToSection = async (itemId: string, newSectionId: string) => {
    setActiveItemMenuId(null);
    const targetItems = itemsBySection.get(newSectionId) || [];
    await db.resourceItems.update(itemId, {
      sectionId: newSectionId,
      order: targetItems.length,
      updatedAt: Date.now(),
    });
  };

  // Open Add Resource modal
  const handleOpenAddResource = (sectionId: string) => {
    setActiveSectionMenuId(null);
    setResourceModal({
      isOpen: true,
      mode: 'add',
      sectionId,
      title: '',
      url: '',
    });
  };

  // Open Edit Resource modal
  const handleOpenEditResource = (item: ResourceItem) => {
    setActiveItemMenuId(null);
    setResourceModal({
      isOpen: true,
      mode: 'edit',
      sectionId: item.sectionId,
      itemId: item.id,
      title: item.title,
      url: item.url,
    });
  };

  // Submit Add / Edit Resource form
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceModal.url.trim()) return;

    let cleanUrl = resourceModal.url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('chrome://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const title = resourceModal.title.trim() || extractDomain(cleanUrl);
    const type = detectResourceType(cleanUrl);
    const now = Date.now();

    if (resourceModal.mode === 'add') {
      const existingItems = itemsBySection.get(resourceModal.sectionId) || [];
      await db.resourceItems.add({
        id: crypto.randomUUID(),
        sectionId: resourceModal.sectionId,
        title,
        url: cleanUrl,
        type,
        order: existingItems.length,
        createdAt: now,
        updatedAt: now,
      });
    } else if (resourceModal.mode === 'edit' && resourceModal.itemId) {
      await db.resourceItems.update(resourceModal.itemId, {
        title,
        url: cleanUrl,
        type,
        updatedAt: now,
      });
    }

    setResourceModal({ isOpen: false, mode: 'add', sectionId: '', title: '', url: '' });
  };

  // Workona-style: Add Open Tab as Resource
  const handleAddOpenTabAsResource = async (sectionId: string, tab: { title: string; url: string; favIconUrl?: string }) => {
    const existingItems = itemsBySection.get(sectionId) || [];
    const now = Date.now();
    const type = detectResourceType(tab.url);

    await db.resourceItems.add({
      id: crypto.randomUUID(),
      sectionId,
      title: tab.title || extractDomain(tab.url),
      url: decodeRealUrl(tab.url),
      favIconUrl: tab.favIconUrl,
      type,
      order: existingItems.length,
      createdAt: now,
      updatedAt: now,
    });

    setAddOpenTabSectionId(null);
  };

  // Render resource icon based on detected type or favicon
  const renderResourceIcon = (item: ResourceItem) => {
    if (item.type === 'doc') {
      return <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />;
    }
    if (item.type === 'sheet') {
      return <Table className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
    }
    if (item.type === 'custom') {
      return <Presentation className="w-4 h-4 text-amber-400 flex-shrink-0" />;
    }

    if (item.favIconUrl && item.favIconUrl.startsWith('http')) {
      return (
        <img
          src={item.favIconUrl}
          alt=""
          className="w-4 h-4 object-contain rounded flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      );
    }

    try {
      const favicon = chrome.runtime.getURL(
        `/_favicon/?pageUrl=${encodeURIComponent(item.url)}&size=32`
      );
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
    } catch {
      return <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />;
    }
  };

  // Drag and drop handler
  const handleItemDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggingItemId(itemId);
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleSectionDrop = async (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    setDragOverSectionId(null);
    if (!draggingItemId) return;

    const item = await db.resourceItems.get(draggingItemId);
    if (!item) return;

    if (item.sectionId !== targetSectionId) {
      const targetItems = itemsBySection.get(targetSectionId) || [];
      await db.resourceItems.update(draggingItemId, {
        sectionId: targetSectionId,
        order: targetItems.length,
        updatedAt: Date.now(),
      });
    }
    setDraggingItemId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 max-w-4xl mx-auto w-full select-none pb-32 relative">
      {/* Top Banner / Header Info */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Bookmark className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">Resources</h2>
              <span className="text-xs text-slate-400 font-medium">
                ({allItems?.filter((it) => sections?.some((s) => s.id === it.sectionId)).length || 0})
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pin permanent documents, spreadsheets, and reference links to this space.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddingSection(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Add Section</span>
        </button>
      </div>

      {/* Add New Section Inline Form */}
      {isAddingSection && (
        <form
          onSubmit={handleCreateSection}
          className="bg-slate-900/80 border border-blue-500/40 rounded-xl p-4 shadow-xl mb-6 flex items-center gap-3"
        >
          <Folder className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <input
            type="text"
            required
            autoFocus
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            placeholder="Section Name (e.g. Project Docs, Key Spreadsheets, Tools)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newSectionTitle.trim()}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition"
          >
            Create Section
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingSection(false);
              setNewSectionTitle('');
            }}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Resource Sections List */}
      <div className="space-y-6">
        {sections && sections.length > 0 ? (
          sections.map((section) => {
            const isCollapsed = collapsedSections.has(section.id);
            const items = itemsBySection.get(section.id) || [];
            const isDragOver = dragOverSectionId === section.id;

            return (
              <div
                key={section.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverSectionId(section.id);
                }}
                onDragLeave={() => setDragOverSectionId(null)}
                onDrop={(e) => handleSectionDrop(e, section.id)}
                className={`bg-slate-900/60 border rounded-xl shadow-sm transition relative ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-500/5'
                    : 'border-slate-800 hover:border-slate-700/80'
                }`}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between p-3.5 border-b border-slate-800/80 bg-slate-900/40 rounded-t-xl">
                  {/* Left: Collapse Button + Title */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <button
                      onClick={() => toggleSectionCollapse(section.id)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                      title={isCollapsed ? 'Expand section' : 'Collapse section'}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <Folder className="w-4 h-4 text-blue-400 flex-shrink-0" />

                    {editingSectionId === section.id ? (
                      <input
                        ref={editSectionInputRef}
                        type="text"
                        value={editingSectionTitle}
                        onChange={(e) => setEditingSectionTitle(e.target.value)}
                        onBlur={handleSaveRenameSection}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRenameSection();
                          if (e.key === 'Escape') setEditingSectionId(null);
                        }}
                        className="bg-slate-950 border border-blue-500 rounded px-2 py-0.5 text-xs text-slate-100 font-semibold focus:outline-none"
                      />
                    ) : (
                      <h3
                        onDoubleClick={() => handleStartRenameSection(section)}
                        className="text-xs font-semibold text-slate-200 truncate cursor-pointer hover:text-white"
                        title="Double-click to rename"
                      >
                        {section.title}
                      </h3>
                    )}

                    <span className="text-[11px] text-slate-500 font-mono">
                      ({items.length})
                    </span>
                  </div>

                  {/* Right Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* Add From Open Tabs Dropdown */}
                    <div
                      className="relative"
                      ref={addOpenTabSectionId === section.id ? openTabsDropdownRef : undefined}
                    >
                      <button
                        onClick={() =>
                          setAddOpenTabSectionId(
                            addOpenTabSectionId === section.id ? null : section.id
                          )
                        }
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition"
                        title="Quickly save an open tab as a resource"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>Add Open Tab</span>
                      </button>

                      {addOpenTabSectionId === section.id && (
                        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 max-h-64 overflow-y-auto">
                          <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                            <span>Open Tabs in this Space</span>
                            <span className="font-mono text-slate-500">
                              {openTabs?.length || 0}
                            </span>
                          </div>

                          {openTabs && openTabs.length > 0 ? (
                            openTabs.map((t) => {
                              const alreadyAdded = items.some(
                                (it) => it.url === decodeRealUrl(t.url)
                              );
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => handleAddOpenTabAsResource(section.id, t)}
                                  className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between gap-2 group transition"
                                >
                                  <span className="truncate flex-1">{t.title}</span>
                                  {alreadyAdded ? (
                                    <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> Added
                                    </span>
                                  ) : (
                                    <Plus className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100" />
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-3 py-3 text-center text-xs text-slate-500 italic">
                              No open tabs in this space.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* "+ Add Resource" Button */}
                    <button
                      onClick={() => handleOpenAddResource(section.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 text-xs font-medium border border-blue-500/30 transition"
                      title="Add a link or doc to this section"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Resource</span>
                    </button>

                    {/* Section 3-Dot Menu */}
                    <div
                      className="relative"
                      ref={activeSectionMenuId === section.id ? sectionMenuRef : undefined}
                    >
                      <button
                        onClick={() =>
                          setActiveSectionMenuId(
                            activeSectionMenuId === section.id ? null : section.id
                          )
                        }
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                        title="Section options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeSectionMenuId === section.id && (
                        <div className="absolute right-0 top-full mt-1.5 z-50 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs">
                          {items.length > 0 && (
                            <button
                              onClick={() => handleOpenAllInSection(section.id)}
                              className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                              <span>Open all in new tabs</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleStartRenameSection(section)}
                            className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rename section</span>
                          </button>

                          <div className="border-t border-slate-800 my-1" />

                          <button
                            onClick={() => handleDeleteSection(section.id)}
                            className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Delete section</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section Items List */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-800/40">
                    {items.length > 0 ? (
                      items.map((item) => (
                        <div
                          key={item.id}
                          draggable={true}
                          onDragStart={(e) => handleItemDragStart(e, item.id)}
                          className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-800/40 transition group cursor-pointer"
                          onClick={() => handleOpenResource(item.url)}
                        >
                          {/* Left: Drag Handle + Icon + Title + Domain */}
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                            <span
                              className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>

                            <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                              {renderResourceIcon(item)}
                            </div>

                            <span className="text-xs text-slate-200 group-hover:text-white font-medium truncate">
                              {item.title}
                            </span>

                            <span className="text-[11px] text-slate-500 truncate font-mono">
                              {extractDomain(item.url)}
                            </span>
                          </div>

                          {/* Right: Quick Actions */}
                          <div
                            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Copy Link */}
                            <button
                              onClick={() => handleCopyLink(item.id, item.url)}
                              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition"
                              title="Copy link"
                            >
                              {copiedId === item.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Open in New Tab */}
                            <button
                              onClick={() => chrome.tabs.create({ url: item.url, active: true })}
                              className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700/60 transition"
                              title="Open in new tab"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>

                            {/* Item 3-Dot Menu */}
                            <div
                              className="relative"
                              ref={activeItemMenuId === item.id ? itemMenuRef : undefined}
                            >
                              <button
                                onClick={() =>
                                  setActiveItemMenuId(
                                    activeItemMenuId === item.id ? null : item.id
                                  )
                                }
                                className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeItemMenuId === item.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs">
                                  <button
                                    onClick={() => handleOpenEditResource(item)}
                                    className="w-full text-left px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Edit resource</span>
                                  </button>

                                  {/* Move to another section */}
                                  {sections.length > 1 && (
                                    <div className="py-1 border-t border-slate-800">
                                      <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-500">
                                        Move to section
                                      </div>
                                      {sections
                                        .filter((s) => s.id !== item.sectionId)
                                        .map((s) => (
                                          <button
                                            key={s.id}
                                            onClick={() =>
                                              handleMoveItemToSection(item.id, s.id)
                                            }
                                            className="w-full text-left px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                                          >
                                            <Folder className="w-3 h-3 text-slate-500" />
                                            <span className="truncate">{s.title}</span>
                                          </button>
                                        ))}
                                    </div>
                                  )}

                                  <div className="border-t border-slate-800 my-1" />

                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                    <span>Delete resource</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-slate-500 italic">
                        No resources in this section yet. Click &quot;Add Resource&quot; or &quot;Add Open Tab&quot; above.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Empty State when no sections exist */
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
            <Bookmark className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">
              No Resource Sections Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Resources help you pin permanent Google Docs, spreadsheets, tools, and project links directly to &quot;{activeSpace?.name || 'this space'}&quot;.
            </p>
            <button
              onClick={() => setIsAddingSection(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Section</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Resource Modal */}
      {resourceModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  {resourceModal.mode === 'add' ? 'Add Resource' : 'Edit Resource'}
                </h3>
              </div>
              <button
                onClick={() =>
                  setResourceModal({
                    isOpen: false,
                    mode: 'add',
                    sectionId: '',
                    title: '',
                    url: '',
                  })
                }
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Resource URL
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={resourceModal.url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setResourceModal((prev) => ({
                      ...prev,
                      url: val,
                      title: prev.title ? prev.title : extractDomain(val),
                    }));
                  }}
                  placeholder="https://docs.google.com/document/... or any URL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={resourceModal.title}
                  onChange={(e) =>
                    setResourceModal((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Q4 Budget Sheet, Product Spec, Figma Board"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setResourceModal({
                      isOpen: false,
                      mode: 'add',
                      sectionId: '',
                      title: '',
                      url: '',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!resourceModal.url.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition"
                >
                  {resourceModal.mode === 'add' ? 'Add Resource' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
