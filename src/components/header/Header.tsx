import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  openSpaceInNewWindow,
  setWindowActiveSpaceId,
} from '@/services/tabManager';
import {
  Search,
  ExternalLink,
  Layers,
  FileText,
  Bookmark,
  CheckSquare,
  MessageSquare,
  PlusCircle,
  Pencil,
  Check,
  X,
  BookmarkCheck,
  FolderInput,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeSpaceId,
    setActiveSpaceId,
    unsavedWindowIdFilter,
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    setCreateSpaceOpen,
    setMoveSectionSpaceId,
    dashboardTheme,
  } = useUIStore();

  const isLight = dashboardTheme === 'light';

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleInput, setTitleInput] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Active space query
  const activeSpace = useLiveQuery(
    async () => {
      if (!activeSpaceId) return null;
      return (await db.spaces.get(activeSpaceId)) || null;
    },
    [activeSpaceId]
  );

  // First tab in current view for quick-save naming
  const firstTab = useLiveQuery(async () => {
    const targetSpace = activeSpaceId || UNSAVED_SPACE_ID;
    let tabs = await db.tabs
      .where('spaceId')
      .equals(targetSpace)
      .sortBy('order');
    if (!activeSpaceId && unsavedWindowIdFilter !== null) {
      tabs = tabs.filter((t) => t.windowId === unsavedWindowIdFilter);
    }
    return tabs[0] || null;
  }, [activeSpaceId, unsavedWindowIdFilter]);

  const defaultTitle = activeSpace
    ? activeSpace.name
    : !activeSpaceId && unsavedWindowIdFilter !== null
    ? 'Unsaved (Window)'
    : 'Unsaved';

  // Enter editing mode
  const startEditing = () => {
    let initial = '';
    if (activeSpace) {
      initial = activeSpace.name;
    } else {
      // For Unsaved: automatically take the name of the very first tab
      initial = firstTab?.title || 'New Space';
    }
    setTitleInput(initial);
    setIsEditingTitle(true);
  };

  // Focus and select text when entering edit mode
  React.useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  // Commit title change / quick save
  const handleSaveTitle = async () => {
    const trimmed = titleInput.trim();
    if (!trimmed) {
      setIsEditingTitle(false);
      return;
    }

    const now = Date.now();

    if (!activeSpaceId) {
      // QUICK SAVE: Transform Unsaved session into a new permanent Space!
      const count = await db.spaces.count();
      const newSpaceId = crypto.randomUUID();

      await db.spaces.add({
        id: newSpaceId,
        name: trimmed,
        icon: '📁',
        color: '#3b82f6',
        createdAt: now,
        updatedAt: now,
        order: count,
        isArchived: false,
      });

      // Move current unsaved tabs into this newly created space
      let unsavedTabs = await db.tabs
        .where('spaceId')
        .equals(UNSAVED_SPACE_ID)
        .toArray();

      if (unsavedWindowIdFilter !== null) {
        unsavedTabs = unsavedTabs.filter((t) => t.windowId === unsavedWindowIdFilter);
      }

      for (const t of unsavedTabs) {
        await db.tabs.update(t.id, {
          spaceId: newSpaceId,
          updatedAt: now,
        });
      }

      // Bind target window to the newly saved space
      try {
        const curTab = await chrome.tabs.getCurrent().catch(() => null);
        const winId = unsavedWindowIdFilter ?? (curTab?.windowId || (await chrome.windows.getCurrent().catch(() => null))?.id);
        if (winId) {
          await setWindowActiveSpaceId(winId, newSpaceId);
        }
      } catch {
        // Ignored if window closed or session storage not ready
      }

      // Transition immediately into the new space
      setActiveSpaceId(newSpaceId);
    } else {
      // Rename existing space
      await db.spaces.update(activeSpaceId, {
        name: trimmed,
        updatedAt: now,
      });
    }

    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const handleOpenInNewWindow = async () => {
    if (activeSpaceId) {
      await openSpaceInNewWindow(activeSpaceId);
    }
  };

  return (
    <header
      className={`border-b px-4 sm:px-6 pt-4 pb-0 select-none backdrop-blur-md transition-colors ${
        isLight
          ? 'border-slate-200/90 bg-white/95'
          : 'border-slate-800 bg-slate-950/80'
      }`}
    >
      {/* Top row: Title, Search, Actions */}
      <div className="flex items-center justify-between gap-2 sm:gap-4 pb-4">
        {/* Title / Inline Quick-Save Editor */}
        <div className="flex items-center gap-2 min-w-[150px] sm:min-w-[200px] flex-1 max-w-xl mr-2 sm:mr-3">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 min-w-0 w-full max-w-md">
              <input
                ref={inputRef}
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveTitle}
                placeholder="Space name..."
                className={`rounded-lg px-3 py-1 text-base font-bold transition focus:outline-none min-w-0 w-full ${
                  isLight
                    ? 'bg-white border-2 border-blue-500 text-slate-900 focus:ring-2 focus:ring-blue-500/20 shadow-sm'
                    : 'bg-slate-900 border border-blue-500 text-slate-100 focus:ring-1 focus:ring-blue-500'
                }`}
              />
              <button
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSaveTitle();
                }}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition flex-shrink-0"
                title="Save Space"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsEditingTitle(false);
                }}
                className={`p-1.5 rounded-lg transition flex-shrink-0 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                }`}
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={startEditing}
              className={`group flex flex-col justify-center cursor-pointer py-1 px-2.5 -ml-2 rounded-lg transition min-w-0 max-w-full ${
                isLight
                  ? 'hover:bg-slate-100/90 active:bg-slate-200/70 text-slate-900'
                  : 'hover:bg-slate-900/80 active:bg-slate-800/80 text-slate-100'
              }`}
              title={
                activeSpaceId
                  ? 'Click to rename space'
                  : 'Click to quick-save unsaved tabs as a Space'
              }
            >
              {activeSpace?.section && (
                <span className={`text-[10px] font-semibold uppercase tracking-wider -mb-0.5 truncate ${
                  isLight ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  {activeSpace.section}
                </span>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2 min-w-0 ${
                  isLight ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  {activeSpace?.icon && <span className="flex-shrink-0">{activeSpace.icon}</span>}
                  <span className="truncate" title={defaultTitle}>{defaultTitle}</span>
                </h1>
                <Pencil className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${
                  isLight ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-500 group-hover:text-slate-300'
                }`} />
                {!activeSpaceId && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ml-1 transition flex-shrink-0 ${
                    isLight
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    Click to Save
                  </span>
                )}
              </div>
              {activeSpace?.description && (
                <p className={`text-[11px] truncate max-w-md mt-0.5 font-normal ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}>
                  {activeSpace.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="w-36 sm:w-48 md:w-56 lg:w-64 max-w-xs min-w-[130px] flex-shrink-0 relative transition-all duration-150 focus-within:w-52 sm:focus-within:w-64 md:focus-within:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tabs & spaces..."
            className={`w-full rounded-full pl-10 pr-4 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${
              isLight
                ? 'bg-slate-100/80 hover:bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-500'
                : 'bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:border-blue-500'
            }`}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Workona-style Quick SAVE button when on Unsaved */}
          {!activeSpaceId ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
              title="Quick save current tabs into a new space"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>SAVE</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => activeSpaceId && setMoveSectionSpaceId(activeSpaceId)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60'
                }`}
                title="Move this space into a section"
              >
                <FolderInput className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="hidden xl:inline">Move to Section</span>
                <span className="hidden md:inline xl:hidden">Move</span>
              </button>

              <button
                onClick={handleOpenInNewWindow}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
                title="Open space tabs in a clean separate window"
              >
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden lg:inline">Open in Window</span>
                <span className="hidden sm:inline lg:hidden">Window</span>
              </button>
            </>
          )}

          <button
            onClick={() => setCreateSpaceOpen(true)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
            }`}
            title="Create a new space"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span className="hidden sm:inline">CREATE</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <nav className={`flex items-center gap-6 text-xs font-medium border-t pt-1 ${
        isLight ? 'border-slate-200' : 'border-slate-800/60'
      }`}>
        <button
          onClick={() => setActiveView('tabs')}
          className={`flex items-center gap-1.5 py-2.5 border-b-2 transition ${
            activeView === 'tabs'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Tabs</span>
        </button>

        <button
          onClick={() => setActiveView('resources')}
          className={`flex items-center gap-1.5 py-2.5 border-b-2 transition ${
            activeView === 'resources'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Resources</span>
        </button>

        <button
          onClick={() => setActiveView('notes')}
          className={`flex items-center gap-1.5 py-2.5 border-b-2 transition ${
            activeView === 'notes'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Notes</span>
        </button>

        <button
          onClick={() => setActiveView('tasks')}
          className={`flex items-center gap-1.5 py-2.5 border-b-2 transition ${
            activeView === 'tasks'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Tasks</span>
        </button>

        <button
          onClick={() => {}}
          className="flex items-center gap-1.5 py-2.5 border-b-2 border-transparent text-slate-500 hover:text-slate-400 transition"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
      </nav>
    </header>
  );
};
