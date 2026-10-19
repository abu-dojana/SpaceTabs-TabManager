import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  openSpaceInNewWindow,
  openSpaceInCurrentWindow,
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
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeSpaceId,
    setActiveSpaceId,
    activeView,
    setActiveView,
    searchQuery,
    setSearchQuery,
    setCreateSpaceOpen,
  } = useUIStore();

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
    const tabs = await db.tabs
      .where('spaceId')
      .equals(targetSpace)
      .sortBy('order');
    return tabs[0] || null;
  }, [activeSpaceId]);

  const defaultTitle = activeSpace ? activeSpace.name : 'Unsaved';

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

      // Move all current unsaved tabs into this newly created space
      const unsavedTabs = await db.tabs
        .where('spaceId')
        .equals(UNSAVED_SPACE_ID)
        .toArray();

      for (const t of unsavedTabs) {
        await db.tabs.update(t.id, {
          spaceId: newSpaceId,
          updatedAt: now,
        });
      }

      // Bind current window to the newly saved space
      try {
        const currentWin = await chrome.windows.getCurrent();
        if (currentWin.id) {
          await setWindowActiveSpaceId(currentWin.id, newSpaceId);
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

  const handleOpenHere = async () => {
    if (activeSpaceId) {
      const currentWin = await chrome.windows.getCurrent();
      if (currentWin.id) {
        await openSpaceInCurrentWindow(activeSpaceId, currentWin.id);
      }
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 pt-4 pb-0 select-none">
      {/* Top row: Title, Search, Actions */}
      <div className="flex items-center justify-between gap-4 pb-4">
        {/* Title / Inline Quick-Save Editor */}
        <div className="flex items-center gap-2 min-w-[200px]">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={inputRef}
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveTitle}
                placeholder="Space name..."
                className="bg-slate-900 border border-blue-500 rounded-lg px-3 py-1 text-base font-bold text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[220px]"
              />
              <button
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent blur before click
                  handleSaveTitle();
                }}
                className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                title="Save Space"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsEditingTitle(false);
                }}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg transition"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div
              onClick={startEditing}
              className="group flex flex-col justify-center cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-slate-900 transition"
              title={
                activeSpaceId
                  ? 'Click to rename space'
                  : 'Click to quick-save unsaved tabs as a Space'
              }
            >
              {activeSpace?.section && (
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider -mb-0.5">
                  {activeSpace.section}
                </span>
              )}
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                  {activeSpace?.icon && <span>{activeSpace.icon}</span>}
                  <span>{defaultTitle}</span>
                </h1>
                <Pencil className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                {!activeSpaceId && (
                  <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium ml-1">
                    Click to Save
                  </span>
                )}
              </div>
              {activeSpace?.description && (
                <p className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5 font-normal">
                  {activeSpace.description}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search across spaces & tabs..."
            className="w-full bg-slate-900 border border-slate-800 rounded-full pl-10 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Workona-style Quick SAVE button when on Unsaved */}
          {!activeSpaceId ? (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
              title="Quick save current tabs into a new space"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>SAVE</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleOpenHere}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                title="Open space tabs in this window alongside current tabs"
              >
                <span>Open All Here</span>
              </button>

              <button
                onClick={handleOpenInNewWindow}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
                title="Open space tabs in a clean separate window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Window</span>
              </button>
            </>
          )}

          <button
            onClick={() => setCreateSpaceOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>CREATE</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <nav className="flex items-center gap-6 text-xs font-medium border-t border-slate-800/60 pt-1">
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
