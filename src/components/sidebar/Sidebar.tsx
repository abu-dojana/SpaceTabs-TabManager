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
  AlertTriangle,
  Download,
  Settings,
  ChevronUp,
  Sliders,
  Zap,
  Upload,
  Keyboard,
  Sparkles,
  Palette,
  Cloud,
  RefreshCw,
  User,
  Heart,
} from 'lucide-react';
import {
  exportAllSpacesBackup,
  importSpacesBackup,
  purgeStaleUnsavedTabs,
} from '@/services/settings';
import {
  recordTombstones,
  subscribeSyncStatus,
  type DriveSyncInfo,
} from '@/services/driveSync';

export const Sidebar: React.FC = () => {
  const {
    activeSpaceId,
    setActiveSpaceId,
    setCreateSpaceOpen,
    clearSelectedTabs,
    setMoveSectionSpaceId,
    setSettingsOpen,
    sidebarWidth,
    patreonUrl,
  } = useUIStore();

  const [dragOverSpaceId, setDragOverSpaceId] = React.useState<string | null>(null);

  // Cloud Drive Sync live info subscription
  const [syncInfo, setSyncInfo] = React.useState<DriveSyncInfo | null>(null);

  React.useEffect(() => {
    const unsub = subscribeSyncStatus((info) => {
      setSyncInfo(info);
    });
    return () => unsub();
  }, []);

  // 3-Dot Dropdown & Modals State for Spaces
  const [activeMenuSpaceId, setActiveMenuSpaceId] = React.useState<string | null>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const [inlineEditingSpaceId, setInlineEditingSpaceId] = React.useState<string | null>(null);
  const [inlineEditingName, setInlineEditingName] = React.useState<string>('');
  const renameInputRef = React.useRef<HTMLInputElement>(null);

  // Section Management State
  const [activeSectionMenu, setActiveSectionMenu] = React.useState<string | null>(null);
  const sectionMenuRef = React.useRef<HTMLDivElement>(null);

  const [editingSectionName, setEditingSectionName] = React.useState<string | null>(null);
  const [renamingSectionValue, setRenamingSectionValue] = React.useState<string>('');
  const renameSectionInputRef = React.useRef<HTMLInputElement>(null);

  const [deleteSectionModal, setDeleteSectionModal] = React.useState<string | null>(null);

  const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());
  const [archiveOpen, setArchiveOpen] = React.useState(false);

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

  // Click-away listener to dismiss space & section 3-dot dropdowns cleanly
  React.useEffect(() => {
    if (!activeMenuSpaceId && !activeSectionMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuSpaceId(null);
      }
      if (sectionMenuRef.current && !sectionMenuRef.current.contains(e.target as Node)) {
        setActiveSectionMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveMenuSpaceId(null);
        setActiveSectionMenu(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuSpaceId, activeSectionMenu]);

  // Focus and select space rename input
  React.useEffect(() => {
    if (inlineEditingSpaceId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [inlineEditingSpaceId]);

  // Focus and select section rename input
  React.useEffect(() => {
    if (editingSectionName && renameSectionInputRef.current) {
      renameSectionInputRef.current.focus();
      renameSectionInputRef.current.select();
    }
  }, [editingSectionName]);

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

  // Section: Commit Rename
  const handleCommitRenameSection = async (oldName: string) => {
    const trimmed = renamingSectionValue.trim();
    if (trimmed && trimmed !== oldName) {
      const matching = await db.spaces
        .filter((s) => s.section === oldName)
        .toArray();
      const now = Date.now();
      for (const s of matching) {
        await db.spaces.update(s.id, {
          section: trimmed,
          updatedAt: now,
        });
      }
      setCollapsedSections((prev) => {
        if (prev.has(oldName)) {
          const next = new Set(prev);
          next.delete(oldName);
          next.add(trimmed);
          return next;
        }
        return prev;
      });
    }
    setEditingSectionName(null);
  };

  // Section: Archive All Spaces in Section (Workona style)
  const handleArchiveSectionSpaces = async (sectionName: string) => {
    const matching = await db.spaces
      .filter((s) => s.section === sectionName)
      .toArray();

    const now = Date.now();
    for (const s of matching) {
      await db.spaces.update(s.id, {
        isArchived: true,
        updatedAt: now,
      });
    }

    if (activeSpaceId && matching.some((s) => s.id === activeSpaceId)) {
      await handleSelectSpace(null);
    }

    setDeleteSectionModal(null);
  };

  // Section: Keep All Spaces (Remove Section tag, moving them to main spaces)
  const handleKeepSectionSpaces = async (sectionName: string) => {
    const matching = await db.spaces
      .filter((s) => s.section === sectionName)
      .toArray();

    const now = Date.now();
    for (const s of matching) {
      await db.spaces.update(s.id, {
        section: undefined,
        updatedAt: now,
      });
    }

    setDeleteSectionModal(null);
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
          order: item.order ?? 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  };

  // Export Space
  const handleExportSidebarSpace = async (space: Space) => {
    setActiveMenuSpaceId(null);
    const spaceTabs = await db.tabs.where('spaceId').equals(space.id).sortBy('order');
    const notes = await db.notes.where('spaceId').equals(space.id).toArray();
    const tasks = await db.tasks.where('spaceId').equals(space.id).sortBy('order');
    const sections = await db.resourceSections.where('spaceId').equals(space.id).sortBy('order');

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
        name: space.name,
        icon: space.icon,
        description: space.description,
        section: space.section,
      },
      tabs: spaceTabs.map((t) => ({
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
    a.download = `${space.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-space.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

    // Record tombstones for multi-device sync
    try {
      const childTabs = await db.tabs.where('spaceId').equals(spaceId).toArray();
      const childNotes = await db.notes.where('spaceId').equals(spaceId).toArray();
      const childTasks = await db.tasks.where('spaceId').equals(spaceId).toArray();
      const childSections = await db.resourceSections.where('spaceId').equals(spaceId).toArray();
      const childItemIds: string[] = [];
      for (const s of childSections) {
        const items = await db.resourceItems.where('sectionId').equals(s.id).toArray();
        childItemIds.push(...items.map((it) => it.id));
      }

      await recordTombstones([
        { id: spaceId, table: 'spaces' },
        ...childTabs.map((t) => ({ id: t.id, table: 'tabs' as const })),
        ...childNotes.map((n) => ({ id: n.id, table: 'notes' as const })),
        ...childTasks.map((t) => ({ id: t.id, table: 'tasks' as const })),
        ...childSections.map((s) => ({ id: s.id, table: 'resource_sections' as const })),
        ...childItemIds.map((id) => ({ id, table: 'resource_items' as const })),
      ]);
    } catch (e) {
      console.warn('Failed to record space tombstones:', e);
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
                setMoveSectionSpaceId(space.id);
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

            {/* 6. Export Space */}
            <button
              onClick={() => handleExportSidebarSpace(space)}
              className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export space</span>
            </button>

            {/* 7. Archive */}
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
    <aside
      style={{ width: `${sidebarWidth || 260}px` }}
      className="bg-slate-950 border-r border-slate-800 flex flex-col h-screen select-none relative flex-shrink-0 transition-[width] duration-150 ease-out"
    >
      {/* Brand & User Profile */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-slate-100 tracking-tight text-base">
              SpaceTabs
            </span>
            {syncInfo?.profile ? (
              syncInfo.status === 'syncing' ? (
                <button
                  onClick={() => setSettingsOpen(true, 'cloud')}
                  className="text-[11px] text-amber-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                  title="Syncing in progress — Click to open Cloud Sync settings"
                >
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>Syncing...</span>
                </button>
              ) : syncInfo.status === 'error' ? (
                <button
                  onClick={() => setSettingsOpen(true, 'cloud')}
                  className="text-[11px] text-rose-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                  title={syncInfo.lastSyncError || 'Sync Error — Click to configure'}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>Sync Error</span>
                </button>
              ) : (
                <button
                  onClick={() => setSettingsOpen(true, 'cloud')}
                  className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                  title="Google Drive connected & synced — Click to view"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Drive Synced</span>
                </button>
              )
            ) : (
              <button
                onClick={() => setSettingsOpen(true, 'cloud')}
                className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                title="Local-first offline mode. Click to connect Google Drive."
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Local-First</span>
              </button>
            )}
          </div>
        </div>

        {/* User Profile Avatar with dynamic status indicator */}
        <button
          onClick={() => setSettingsOpen(true, 'cloud')}
          className="relative group p-0.5 rounded-full transition focus:outline-none cursor-pointer"
          title={
            syncInfo?.profile
              ? `${syncInfo.profile.name} (${syncInfo.profile.email})\nClick to manage Google Drive sync`
              : 'Connect Google Account to enable Cloud Sync'
          }
        >
          {syncInfo?.profile?.picture ? (
            <img
              src={syncInfo.profile.picture}
              alt={syncInfo.profile.name}
              className="w-7 h-7 rounded-full object-cover border border-blue-400/40 group-hover:border-blue-400 transition shadow-sm"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/30 group-hover:border-blue-400/60 flex items-center justify-center text-xs font-bold text-blue-400 transition shadow-sm">
              {syncInfo?.profile?.name ? syncInfo.profile.name.charAt(0).toUpperCase() : 'A'}
            </div>
          )}

          {/* Sync indicator dot */}
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
              syncInfo?.profile
                ? syncInfo.status === 'syncing'
                  ? 'bg-amber-400 animate-spin'
                  : syncInfo.status === 'error'
                  ? 'bg-rose-500'
                  : 'bg-emerald-400'
                : 'bg-slate-500'
            }`}
          />
        </button>
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
              <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
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
            <div className="flex items-center gap-1.5">
              {unsectionedSpaces.length > 0 && (
                <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                  {unsectionedSpaces.length}
                </span>
              )}
              <button
                onClick={() => setCreateSpaceOpen(true)}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
                title="Create new Space"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
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
                {/* Section Header or Inline Rename Input */}
                {editingSectionName === sectionName ? (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 border border-blue-500 rounded-lg">
                    <input
                      ref={renameSectionInputRef}
                      type="text"
                      value={renamingSectionValue}
                      onChange={(e) => setRenamingSectionValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCommitRenameSection(sectionName);
                        if (e.key === 'Escape') setEditingSectionName(null);
                      }}
                      onBlur={() => handleCommitRenameSection(sectionName)}
                      className="flex-1 bg-transparent text-xs text-slate-100 font-semibold uppercase tracking-wider focus:outline-none min-w-0"
                    />
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCommitRenameSection(sectionName);
                      }}
                      className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded"
                      title="Save Name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setEditingSectionName(null);
                      }}
                      className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      onClick={() => toggleSection(sectionName)}
                      className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 cursor-pointer rounded transition group"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
                        )}
                        <span className="truncate">{sectionName}</span>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800/80 text-slate-400">
                          {sectionSpaces.length}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSectionMenu(
                              activeSectionMenu === sectionName ? null : sectionName
                            );
                          }}
                          className={`p-0.5 rounded transition ${
                            activeSectionMenu === sectionName
                              ? 'bg-slate-800 text-blue-400 opacity-100'
                              : 'opacity-0 group-hover:opacity-100 hover:bg-slate-800 text-slate-500 hover:text-slate-200'
                          }`}
                          title="Section options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Section 3-Dot Dropdown Menu */}
                    {activeSectionMenu === sectionName && (
                      <div
                        ref={sectionMenuRef}
                        className="absolute right-1 top-full mt-1 z-50 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setActiveSectionMenu(null);
                            setEditingSectionName(sectionName);
                            setRenamingSectionValue(sectionName);
                          }}
                          className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
                        >
                          <Pencil className="w-3.5 h-3.5 text-slate-400" />
                          <span>Rename section</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveSectionMenu(null);
                            setDeleteSectionModal(sectionName);
                          }}
                          className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          <span>Delete section</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

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
                <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
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

      {/* Settings & Support Footer Trigger */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 flex-shrink-0 space-y-1">
        {/* Support Creator Button */}
        <button
          onClick={() => setSettingsOpen(true, 'contact')}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition group border border-transparent text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 cursor-pointer"
          title="Support Abu Dojana (SupportKori, bKash, Patreon, Ko-fi)"
        >
          <div className="flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform fill-rose-500/20 group-hover:fill-rose-500" />
            <span className="font-semibold text-slate-300 group-hover:text-rose-300">Support Creator</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Donate
          </span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition group border border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-900/80 hover:border-slate-800/80 cursor-pointer"
          title="Open Settings & Preferences"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition" />
            <span className="font-semibold text-slate-300 group-hover:text-white">Settings</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-emerald-500 flex items-center gap-1 text-[11px] font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Ready
            </span>
          </div>
        </button>
      </div>

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

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

      {/* Delete Section Modal (Workona Style) */}
      {deleteSectionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setDeleteSectionModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl select-none animate-in fade-in zoom-in-95 duration-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setDeleteSectionModal(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Amber Warning Triangle (matching Workona screenshot) */}
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>

            {/* Title (matching Workona: Archive the contents of Business?) */}
            <h3 className="text-base font-bold text-slate-100 mb-2">
              Archive the contents of {deleteSectionModal}?
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              You can archive all spaces in this section or keep them active in your main spaces list.
            </p>

            {/* Actions (matching Workona: ARCHIVE SPACES / KEEP SPACES) */}
            <div className="space-y-2">
              <button
                onClick={() => handleArchiveSectionSpaces(deleteSectionModal)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs tracking-wider uppercase shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-1.5"
              >
                <Archive className="w-4 h-4" />
                <span>ARCHIVE SPACES</span>
              </button>

              <button
                onClick={() => handleKeepSectionSpaces(deleteSectionModal)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-lg text-xs tracking-wider uppercase transition"
              >
                KEEP SPACES
              </button>
            </div>
          </div>
        </div>
      )}

    </aside>
  );
};
