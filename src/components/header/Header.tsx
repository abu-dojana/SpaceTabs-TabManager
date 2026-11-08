import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  openSpaceInNewWindow,
  setWindowActiveSpaceId,
  getNextSpaceOrder,
} from '@/services/tabManager';
import {
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
  ChevronDown,
} from 'lucide-react';
import { EMOJI_OPTIONS } from '@/components/modals/CreateSpaceModal';
import { getHostWindowId } from '@/utils/chromeWindow';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useAutoFocusSelect } from '@/hooks/useAutoFocusSelect';
import { GlobalSearchBar } from './GlobalSearchBar';

export const Header: React.FC = () => {
  const {
    activeSpaceId,
    setActiveSpaceId,
    activeView,
    setActiveView,
    setCreateSpaceOpen,
    setMoveSectionSpaceId,
    dashboardTheme,
  } = useUIStore();

  const isLight = dashboardTheme === 'light';

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleInput, setTitleInput] = React.useState('');
  const [iconInput, setIconInput] = React.useState('📁');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);

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

  const defaultTitle = activeSpace && !activeSpace.isUnsaved ? activeSpace.name : 'Unsaved';

  // Enter editing mode
  const startEditing = () => {
    let initial = '';
    if (activeSpace && !activeSpace.isUnsaved) {
      initial = activeSpace.name;
    } else {
      // For Unsaved: automatically take the name of the very first tab
      initial = firstTab?.title || 'New Space';
    }
    setTitleInput(initial);
    setIconInput(activeSpace?.icon || '📁');
    setIsEditingTitle(true);
  };

  // Focus and select text when entering edit mode
  useAutoFocusSelect(inputRef, isEditingTitle);

  // Click outside to dismiss emoji picker
  useClickOutside([emojiPickerRef], () => setIsEmojiPickerOpen(false), isEmojiPickerOpen);

  const handleDirectChangeEmoji = async (emoji: string) => {
    setIconInput(emoji);
    setIsEmojiPickerOpen(false);
    if (activeSpace?.id) {
      await db.spaces.update(activeSpace.id, {
        icon: emoji,
        updatedAt: Date.now(),
      });
    }
  };

  // Commit title change / quick save
  const handleSaveTitle = async () => {
    const trimmed = titleInput.trim();
    if (!trimmed) {
      setIsEditingTitle(false);
      return;
    }

    const now = Date.now();

    if (!activeSpaceId || activeSpace?.isUnsaved) {
      // QUICK SAVE: Transform Unsaved session into a new permanent Space!
      const nextOrder = await getNextSpaceOrder();
      if (activeSpace?.id) {
        await db.spaces.update(activeSpace.id, {
          name: trimmed,
          icon: iconInput,
          isUnsaved: false,
          order: nextOrder,
          updatedAt: now,
        });
        const winId = await getHostWindowId();
        if (winId) {
          await setWindowActiveSpaceId(winId, activeSpace.id);
        }
      } else {
        const newSpaceId = crypto.randomUUID();

        await db.spaces.add({
          id: newSpaceId,
          name: trimmed,
          icon: iconInput,
          color: '#3b82f6',
          createdAt: now,
          updatedAt: now,
          order: nextOrder,
          isArchived: false,
        });

        // Move all current unsaved tabs, notes, tasks, and resource sections into this newly created space
        await db.transaction(
          'rw',
          [db.tabs, db.notes, db.tasks, db.resourceSections],
          async () => {
            await db.tabs
              .where('spaceId')
              .equals(UNSAVED_SPACE_ID)
              .modify({ spaceId: newSpaceId, updatedAt: now });
            await db.notes
              .where('spaceId')
              .equals(UNSAVED_SPACE_ID)
              .modify({ spaceId: newSpaceId, updatedAt: now });
            await db.tasks
              .where('spaceId')
              .equals(UNSAVED_SPACE_ID)
              .modify({ spaceId: newSpaceId, updatedAt: now });
            await db.resourceSections
              .where('spaceId')
              .equals(UNSAVED_SPACE_ID)
              .modify({ spaceId: newSpaceId, updatedAt: now });
          }
        );

        // Bind current window to the newly saved space
        const winId = await getHostWindowId();
        if (winId) {
          await setWindowActiveSpaceId(winId, newSpaceId);
        }

        // Transition immediately into the new space
        setActiveSpaceId(newSpaceId);
      }
    } else {
      // Rename existing space
      await db.spaces.update(activeSpaceId, {
        name: trimmed,
        icon: iconInput,
        updatedAt: now,
      });
    }

    setIsEditingTitle(false);
    setIsEmojiPickerOpen(false);
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
      className={`dashboard-header border-b px-4 sm:px-6 pt-4 pb-0 select-none backdrop-blur-md transition-colors relative z-40 ${
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
              <div className="relative flex-shrink-0" ref={emojiPickerRef}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-base font-emoji transition ${
                    isLight
                      ? 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800'
                      : 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-100'
                  }`}
                  title="Choose emoji"
                >
                  <span>{iconInput}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {isEmojiPickerOpen && (
                  <div
                    onMouseDown={(e) => e.preventDefault()}
                    className={`absolute left-0 top-full mt-1.5 p-2 rounded-xl shadow-2xl border z-50 grid grid-cols-5 gap-1.5 w-48 ${
                      isLight
                        ? 'bg-white border-slate-200 shadow-slate-300/60'
                        : 'bg-slate-900 border-slate-800 shadow-black/80'
                    }`}
                  >
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setIconInput(emoji);
                          setIsEmojiPickerOpen(false);
                        }}
                        className={`text-xl p-1.5 rounded-lg hover:scale-110 active:scale-95 transition-all text-center flex items-center justify-center ${
                          iconInput === emoji
                            ? isLight
                              ? 'bg-blue-100 border border-blue-300 ring-1 ring-blue-400'
                              : 'bg-blue-900/60 border border-blue-500/50 ring-1 ring-blue-400'
                            : isLight
                              ? 'hover:bg-slate-100'
                              : 'hover:bg-slate-800'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
                activeSpace && !activeSpace.isUnsaved
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
                  {activeSpace?.icon && (
                    <div className="relative flex-shrink-0" ref={emojiPickerRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEmojiPickerOpen((prev) => !prev);
                        }}
                        className={`flex-shrink-0 p-1 -m-1 rounded-lg hover:scale-110 active:scale-95 transition-all ${
                          isLight ? 'hover:bg-slate-200/80' : 'hover:bg-slate-800/80'
                        }`}
                        title="Click to change emoji"
                      >
                        {activeSpace.icon}
                      </button>
                      {isEmojiPickerOpen && !isEditingTitle && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute left-0 top-full mt-2 p-2 rounded-xl shadow-2xl border z-50 grid grid-cols-5 gap-1.5 w-48 ${
                            isLight
                              ? 'bg-white border-slate-200 shadow-slate-300/60'
                              : 'bg-slate-900 border-slate-800 shadow-black/80'
                          }`}
                        >
                          {EMOJI_OPTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDirectChangeEmoji(emoji);
                              }}
                              className={`text-xl p-1.5 rounded-lg hover:scale-110 active:scale-95 transition-all text-center flex items-center justify-center ${
                                (activeSpace.icon || '📁') === emoji
                                  ? isLight
                                    ? 'bg-blue-100 border border-blue-300 ring-1 ring-blue-400'
                                    : 'bg-blue-900/60 border border-blue-500/50 ring-1 ring-blue-400'
                                  : isLight
                                    ? 'hover:bg-slate-100'
                                    : 'hover:bg-slate-800'
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <span className="truncate" title={defaultTitle}>{defaultTitle}</span>
                </h1>
                <Pencil className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${
                  isLight ? 'text-slate-400 group-hover:text-slate-600' : 'text-slate-500 group-hover:text-slate-300'
                }`} />
                {(!activeSpace || activeSpace.isUnsaved) && (
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

        {/* Global Cross-Space Search Bar & Floating Results */}
        <GlobalSearchBar isLight={isLight} />

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Workona-style Quick SAVE button when on Unsaved */}
          {(!activeSpace || activeSpace.isUnsaved) ? (
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
          onClick={() => setActiveView('chat')}
          className={`flex items-center gap-1.5 py-2.5 border-b-2 transition ${
            activeView === 'chat'
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
      </nav>
    </header>
  );
};
