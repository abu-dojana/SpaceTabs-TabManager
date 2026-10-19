import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type Space, UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import { extractDomain } from '@/utils/urlFilter';
import {
  switchWindowToSpace,
  moveTabsToSpace,
  openSpaceInNewWindow,
} from '@/services/tabManager';
import {
  Folder,
  Layers,
  Archive,
  Plus,
  Compass,
  CheckCircle2,
  MoreVertical,
  ExternalLink,
  Pencil,
  Copy,
  FolderInput,
  FileText,
  Trash2,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Check,
  X,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeSpaceId,
    setActiveSpaceId,
    setCreateSpaceOpen,
    clearSelectedTabs,
  } = useUIStore();

  const [dragOverSpaceId, setDragOverSpaceId] = React.useState<string | null>(null);

  // 3-Dot Dropdown & Modals State
  const [activeMenuSpaceId, setActiveMenuSpaceId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const [inlineEditingSpaceId, setInlineEditingSpaceId] = React.useState<string | null>(null);
  const [inlineEditingName, setInlineEditingName] = React.useState<string>('');
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const [archiveOpen, setArchiveOpen] = React.useState(false);

  const [sectionModalSpace, setSectionModalSpace] = React.useState<Space | null>(null);
  const [descriptionModalSpace, setDescriptionModalSpace] = React.useState<Space | null>(null);
  const [deleteConfirmSpace, setDeleteConfirmSpace] = React.useState<Space | null>(null);

  // Read active spaces from Dexie
  const spaces = useLiveQuery(async () => {
    const list = await db.spaces.orderBy('order').toArray();
    return list.filter((s) => !s.isArchived);
  });

  // Read archived spaces from Dexie
  const archivedSpaces = useLiveQuery(async () => {
    const list = await db.spaces.orderBy('order').toArray();
    return list.filter((s) => s.isArchived);
  });

  // Read unsaved tabs from Dexie
  const unsavedTabs = useLiveQuery(() =>
    db.tabs.where('spaceId').equals(UNSAVED_SPACE_ID).toArray()
  );

  // Group spaces into unsectioned & custom sections
  const { unsectionedSpaces, sectionsMap } = React.useMemo(() => {
    if (!spaces) return { unsectionedSpaces: [], sectionsMap: new Map<string, Space[]>() };
    const unsectioned: Space[] = [];
    const map = new Map<string, Space[]>();

    for (const s of spaces) {
      if (s.section && s.section.trim()) {
        const secName = s.section.trim();
        if (!map.has(secName)) map.set(secName, []);
        map.get(secName)!.push(s);
      } else {
        unsectioned.push(s);
      }
    }
    return { unsectionedSpaces: unsectioned, sectionsMap: map };
  }, [spaces]);

  const allSections = React.useMemo(() => {
    return Array.from(sectionsMap.keys());
  }, [sectionsMap]);

  // Group unsaved tabs by domain for Workona-style summary
  const domainSummary = React.useMemo(() => {
    if (!unsavedTabs || unsavedTabs.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const t of unsavedTabs) {
      const d = extractDomain(t.url);
      counts[d] = (counts[d] || 0) + 1;
    }
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;
    const [topDomain, count] = entries[0];
    const others = unsavedTabs.length - count;
    return others > 0 ? `${topDomain} + ${others}` : topDomain;
  }, [unsavedTabs]);

  // Click-away listener to dismiss space 3-dot dropdown cleanly
  React.useEffect(() => {
    if (!activeMenuSpaceId) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuSpaceId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuSpaceId(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuSpaceId]);

  // Focus and select rename input
  React.useEffect(() => {
    if (inlineEditingSpaceId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [inlineEditingSpaceId]);

  const handleSelectSpace = async (spaceId: string | null) => {
    setActiveSpaceId(spaceId);
    try {
      const currentWin = await chrome.windows.getCurrent();
      if (currentWin.id) {
        await switchWindowToSpace(currentWin.id, spaceId);
      }
    } catch (e) {
      console.error('Failed to switch space in window:', e);
    }
  };

  const handleDropOnSpace = async (
    e: React.DragEvent,
    targetSpaceId: string | null
  ) => {
    e.preventDefault();
    setDragOverSpaceId(null);

    let tabIds: string[] = [];
    try {
      const raw = e.dataTransfer.getData('application/json');
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.tabIds)) {
          tabIds = data.tabIds;
        } else if (data.tabId) {
          tabIds = [data.tabId];
        }
      }
    } catch {
      // Fallback
    }

    if (tabIds.length === 0) {
      const plainId = e.dataTransfer.getData('text/plain');
      if (plainId) tabIds = [plainId];
    }

    if (tabIds.length > 0) {
      await moveTabsToSpace(tabIds, targetSpaceId);
      clearSelectedTabs();
    }
  };

  const toggleSection = (sectionName: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionName)) next.delete(sectionName);
      else next.add(sectionName);
      return next;
    });
  };

  // 1. Commit Rename
  const handleCommitRename = async (spaceId: string) => {
    const trimmed = inlineEditingName.trim();
    if (trimmed) {
      await db.spaces.update(spaceId, {
        name: trimmed,
        updatedAt: Date.now(),
      });
    }
    setInlineEditingSpaceId(null);
  };

  // 2. Open Space in New Window
  const handleOpenNewWindow = async (spaceId: string) => {
    setActiveMenuSpaceId(null);
    await openSpaceInNewWindow(spaceId);
  };

  // 3. Duplicate Space
  const handleDuplicateSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    const newSpaceId = crypto.randomUUID();
    const now = Date.now();
    const count = await db.spaces.count();

    await db.spaces.add({
      id: newSpaceId,
      name: `${space.name} (Copy)`,
      icon: space.icon,
      color: space.color,
      description: space.description,
      section: space.section,
      order: count,
      createdAt: now,
      updatedAt: now,
      isArchived: false,
    });

    // Copy tabs
    const spaceTabs = await db.tabs.where('spaceId').equals(space.id).toArray();
    for (const t of spaceTabs) {
      await db.tabs.add({
        id: crypto.randomUUID(),
        spaceId: newSpaceId,
        url: t.url,
        title: t.title,
        favIconUrl: t.favIconUrl,
        order: t.order,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Copy notes
    const spaceNotes = await db.notes.where('spaceId').equals(space.id).toArray();
    for (const n of spaceNotes) {
      await db.notes.add({
        id: crypto.randomUUID(),
        spaceId: newSpaceId,
        title: n.title,
        content: n.content,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Copy tasks
    const spaceTasks = await db.tasks.where('spaceId').equals(space.id).toArray();
    for (const task of spaceTasks) {
      await db.tasks.add({
        id: crypto.randomUUID(),
        spaceId: newSpaceId,
        text: task.text,
        completed: task.completed,
        order: task.order,
        dueDate: task.dueDate,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Copy resource sections and items
    const resSections = await db.resourceSections.where('spaceId').equals(space.id).toArray();
    for (const sec of resSections) {
      const newSecId = crypto.randomUUID();
      await db.resourceSections.add({
        id: newSecId,
        spaceId: newSpaceId,
        title: sec.title,
        order: sec.order,
        updatedAt: now,
      });
      const items = await db.resourceItems.where('sectionId').equals(sec.id).toArray();
      for (const item of items) {
        await db.resourceItems.add({
          id: crypto.randomUUID(),
          sectionId: newSecId,
          title: item.title,
          url: item.url,
          favIconUrl: item.favIconUrl,
          type: item.type,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  };

  // 6. Archive Space
  const handleArchiveSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    await db.spaces.update(space.id, {
      isArchived: true,
      updatedAt: Date.now(),
    });
    if (activeSpaceId === space.id) {
      await handleSelectSpace(null);
    }
  };

  // Restore from Archive
  const handleRestoreSpace = async (spaceId: string) => {
    await db.spaces.update(spaceId, {
      isArchived: false,
      updatedAt: Date.now(),
    });
  };

  // 7. Permanently Delete Space
  const handleDeleteSpacePermanently = async (spaceId: string) => {
    if (activeSpaceId === spaceId) {
      await handleSelectSpace(null);
    }
    await db.tabs.where('spaceId').equals(spaceId).delete();
    await db.notes.where('spaceId').equals(spaceId).delete();
    await db.tasks.where('spaceId').equals(spaceId).delete();
    const secs = await db.resourceSections.where('spaceId').equals(spaceId).toArray();
    for (const s of secs) {
      await db.resourceItems.where('sectionId').equals(s.id).delete();
    }
    await db.resourceSections.where('spaceId').equals(spaceId).delete();
    await db.spaces.delete(spaceId);

    setDeleteConfirmSpace(null);
    setActiveMenuSpaceId(null);
  };

  // Render a Single Space Item
  const renderSpaceItem = (space: Space) => {
    const isOver = dragOverSpaceId === space.id;
    const isActive = activeSpaceId === space.id;
    const isMenuOpen = activeMenuSpaceId === space.id;
    const isRenaming = inlineEditingSpaceId === space.id;

    return (
      <div key={space.id} className="relative group">
        {isRenaming ? (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 border border-blue-500 rounded-lg">
            <span className="text-base">{space.icon || '📁'}</span>
            <input
              ref={renameInputRef}
              type="text"
              value={inlineEditingName}
              onChange={(e) => setInlineEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitRename(space.id);
                if (e.key === 'Escape') setInlineEditingSpaceId(null);
              }}
              onBlur={() => handleCommitRename(space.id)}
              className="flex-1 bg-transparent text-xs text-slate-100 font-medium focus:outline-none min-w-0"
            />
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                handleCommitRename(space.id);
              }}
              className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
              title="Save Name"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                setInlineEditingSpaceId(null);
              }}
              className="p-1 text-slate-400 hover:bg-slate-800 rounded"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleSelectSpace(space.id)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverSpaceId !== space.id) {
                setDragOverSpaceId(space.id);
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverSpaceId(space.id);
            }}
            onDragLeave={(e) => {
              const currentTarget = e.currentTarget as HTMLElement;
              if (!currentTarget.contains(e.relatedTarget as Node)) {
                if (dragOverSpaceId === space.id) {
                  setDragOverSpaceId(null);
                }
              }
            }}
            onDrop={(e) => handleDropOnSpace(e, space.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all relative ${
              isOver
                ? 'bg-blue-600/30 border-2 border-blue-400 text-blue-200 scale-[1.02] shadow-lg shadow-blue-500/20'
                : isActive || isMenuOpen
                ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-2">
              <span className="text-base flex-shrink-0">{space.icon || '📁'}</span>
              <span className="truncate" title={space.description || space.name}>
                {space.name}
              </span>
            </div>

            {isOver ? (
              <span className="text-[10px] font-bold text-blue-300 bg-blue-500/30 px-1.5 py-0.5 rounded animate-pulse">
                Drop
              </span>
            ) : (
              <div
                className={`flex items-center gap-0.5 transition-opacity ${
                  isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Quick Action: Open in New Window */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenNewWindow(space.id);
                  }}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                  title="Open in new window (Ctrl+Click)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                {/* 3-Dot Menu Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuSpaceId(isMenuOpen ? null : space.id);
                  }}
                  className={`p-1 rounded transition ${
                    isMenuOpen
                      ? 'bg-slate-800 text-blue-400'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Space options"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </button>
        )}

        {/* Workona-Style Three-Dot Popup Menu */}
        {isMenuOpen && (
          <div
            ref={menuRef}
            className="absolute right-1 top-full mt-1 z-50 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Rename the space */}
            <button
              onClick={() => {
                setActiveMenuSpaceId(null);
                setInlineEditingSpaceId(space.id);
                setInlineEditingName(space.name);
              }}
              className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
              <span>Rename</span>
            </button>

            {/* 2. Open space in a New window */}
            <button
              onClick={() => handleOpenNewWindow(space.id)}
              className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2.5">
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>Open in new window</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Ctrl+Click</span>
            </button>

            {/* 3. Duplicate this space */}
            <button
              onClick={() => handleDuplicateSpace(space)}
              className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Duplicate</span>
            </button>

            {/* 4. Move to a New section */}
            <button
              onClick={() => {
                setActiveMenuSpaceId(null);
                setSectionModalSpace(space);
              }}
              className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2.5">
                <FolderInput className="w-3.5 h-3.5 text-slate-400" />
                <span>Move to section</span>
              </div>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>

            {/* 5. Add / Edit Description */}
            <button
              onClick={() => {
                setActiveMenuSpaceId(null);
                setDescriptionModalSpace(space);
              }}
              className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{space.description ? 'Edit description' : 'Add description'}</span>
            </button>

            {/* 6. Archive */}
            <button
              onClick={() => handleArchiveSpace(space)}
              className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
            >
              <Archive className="w-3.5 h-3.5 text-slate-400" />
              <span>Archive</span>
            </button>

            <div className="border-t border-slate-800 my-1" />

            {/* 7. Delete */}
            <button
              onClick={() => {
                setActiveMenuSpaceId(null);
                setDeleteConfirmSpace(space);
              }}
              className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen select-none relative">
      {/* Brand & User Profile */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-100 tracking-tight text-base">
              SpaceTabs
            </span>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Local-First
            </div>
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-xs font-bold text-blue-400">
          A
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
        {/* Unsaved Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Unsaved</span>
            </div>
            {unsavedTabs && unsavedTabs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300 font-mono">
                {unsavedTabs.length}
              </span>
            )}
          </div>

          <button
            onClick={() => handleSelectSpace(null)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverSpaceId !== UNSAVED_SPACE_ID) {
                setDragOverSpaceId(UNSAVED_SPACE_ID);
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverSpaceId(UNSAVED_SPACE_ID);
            }}
            onDragLeave={(e) => {
              const currentTarget = e.currentTarget as HTMLElement;
              if (!currentTarget.contains(e.relatedTarget as Node)) {
                if (dragOverSpaceId === UNSAVED_SPACE_ID) {
                  setDragOverSpaceId(null);
                }
              }
            }}
            onDrop={(e) => handleDropOnSpace(e, null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all relative ${
              dragOverSpaceId === UNSAVED_SPACE_ID
                ? 'bg-blue-600/30 border-2 border-blue-400 text-blue-200 scale-[1.02] shadow-lg shadow-blue-500/20'
                : activeSpaceId === null
                ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div
                className={`w-2 h-2 rounded-full ${
                  unsavedTabs && unsavedTabs.length > 0
                    ? 'bg-amber-400'
                    : 'bg-slate-600'
                }`}
              />
              <span className="truncate italic">
                {domainSummary || 'Empty session'}
              </span>
            </div>
            {dragOverSpaceId === UNSAVED_SPACE_ID && (
              <span className="text-[10px] font-bold text-blue-300 bg-blue-500/30 px-1.5 py-0.5 rounded animate-pulse">
                Drop
              </span>
            )}
          </button>
        </div>

        {/* Spaces Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              <span>Spaces</span>
            </div>
            <button
              onClick={() => setCreateSpaceOpen(true)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
              title="Create new Space"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Top-Level Unsectioned Spaces */}
          <div className="space-y-0.5">
            {unsectionedSpaces.length > 0 ? (
              unsectionedSpaces.map((space) => renderSpaceItem(space))
            ) : sectionsMap.size === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-500 italic">
                No spaces created yet. Click + to add your first space.
              </div>
            ) : null}
          </div>

          {/* Custom Collapsible Sections (e.g. Business, Personal, Projects) */}
          {Array.from(sectionsMap.entries()).map(([sectionName, sectionSpaces]) => {
            const isCollapsed = collapsedSections.has(sectionName);

            return (
              <div key={sectionName} className="mt-3">
                {/* Section Header */}
                <div
                  onClick={() => toggleSection(sectionName)}
                  className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 cursor-pointer rounded transition group"
                >
                  <div className="flex items-center gap-1.5">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
                    )}
                    <span>{sectionName}</span>
                  </div>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-400 font-mono">
                    {sectionSpaces.length}
                  </span>
                </div>

                {/* Section Spaces */}
                {!isCollapsed && (
                  <div className="space-y-0.5 mt-1 pl-2 border-l border-slate-800/80 ml-2">
                    {sectionSpaces.map((space) => renderSpaceItem(space))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Archive Drawer */}
        <div>
          <button
            onClick={() => setArchiveOpen(!archiveOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-300 transition"
          >
            <div className="flex items-center gap-2">
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </div>
            <div className="flex items-center gap-1.5">
              {archivedSpaces && archivedSpaces.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-400 font-mono">
                  {archivedSpaces.length}
                </span>
              )}
              {archiveOpen ? (
                <ChevronDown className="w-3 h-3 text-slate-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-500" />
              )}
            </div>
          </button>

          {archiveOpen && (
            <div className="mt-1 space-y-1 pl-2 border-l border-slate-800/80 ml-2">
              {archivedSpaces && archivedSpaces.length > 0 ? (
                archivedSpaces.map((space) => (
                  <div
                    key={space.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-900 group"
                  >
                    <span className="truncate flex items-center gap-2 flex-1 mr-2">
                      <span>{space.icon || '📁'}</span>
                      <span className="truncate line-through opacity-70">
                        {space.name}
                      </span>
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRestoreSpace(space.id)}
                        className="p-1 hover:bg-slate-800 text-emerald-400 rounded transition"
                        title="Restore Space"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmSpace(space)}
                        className="p-1 hover:bg-red-500/20 text-red-400 rounded transition"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-2 py-1.5 text-[11px] text-slate-500 italic">
                  No archived spaces
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>No 5-Space Limit</span>
        <span className="text-emerald-500 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Ready
        </span>
      </div>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* 4. Move to Section Modal */}
      {sectionModalSpace && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full shadow-2xl text-left select-none animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <FolderInput className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-slate-100 truncate">
                  Move "{sectionModalSpace.name}" to Section
                </h3>
              </div>
              <button
                onClick={() => setSectionModalSpace(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Sections */}
            {allSections.length > 0 && (
              <div className="mb-4">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Existing Sections
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {allSections.map((sec) => (
                    <button
                      key={sec}
                      onClick={async () => {
                        await db.spaces.update(sectionModalSpace.id, {
                          section: sec,
                          updatedAt: Date.now(),
                        });
                        setSectionModalSpace(null);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                        sectionModalSpace.section === sec
                          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span>{sec}</span>
                      {sectionModalSpace.section === sec && (
                        <Check className="w-3.5 h-3.5 text-blue-400" />
                      )}
                    </button>
                  ))}

                  {sectionModalSpace.section && (
                    <button
                      onClick={async () => {
                        await db.spaces.update(sectionModalSpace.id, {
                          section: undefined,
                          updatedAt: Date.now(),
                        });
                        setSectionModalSpace(null);
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/10 transition mt-1"
                    >
                      Remove from section (Move to top)
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Create New Section Input */}
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Create New Section
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem('newSection') as HTMLInputElement;
                  const val = input.value.trim();
                  if (val) {
                    await db.spaces.update(sectionModalSpace.id, {
                      section: val,
                      updatedAt: Date.now(),
                    });
                    setSectionModalSpace(null);
                  }
                }}
                className="flex items-center gap-2"
              >
                <input
                  name="newSection"
                  type="text"
                  autoFocus
                  placeholder="e.g. Business, Projects, Reading"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition flex-shrink-0"
                >
                  Move
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 5. Add / Edit Description Modal */}
      {descriptionModalSpace && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl text-left select-none animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-slate-100 truncate">
                  Description for "{descriptionModalSpace.name}"
                </h3>
              </div>
              <button
                onClick={() => setDescriptionModalSpace(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const textarea = form.elements.namedItem('desc') as HTMLTextAreaElement;
                await db.spaces.update(descriptionModalSpace.id, {
                  description: textarea.value.trim(),
                  updatedAt: Date.now(),
                });
                setDescriptionModalSpace(null);
              }}
            >
              <textarea
                name="desc"
                autoFocus
                defaultValue={descriptionModalSpace.description || ''}
                rows={4}
                placeholder="Add details, notes, or purpose for this space..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none mb-4"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDescriptionModalSpace(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
                >
                  Save Description
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Modal */}
      {deleteConfirmSpace && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full shadow-2xl text-left select-none animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-400">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Delete "{deleteConfirmSpace.name}"?
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  This space and all tabs, notes, and tasks saved within it will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setDeleteConfirmSpace(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSpacePermanently(deleteConfirmSpace.id)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition shadow-sm"
              >
                Delete Space
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
