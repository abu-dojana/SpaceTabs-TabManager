import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import { extractDomain } from '@/utils/urlFilter';
import { switchWindowToSpace, moveTabsToSpace } from '@/services/tabManager';
import {
  Folder,
  Layers,
  Archive,
  Plus,
  Compass,
  CheckCircle2,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeSpaceId, setActiveSpaceId, setCreateSpaceOpen, clearSelectedTabs } =
    useUIStore();

  const [dragOverSpaceId, setDragOverSpaceId] = React.useState<string | null>(null);

  // Read spaces from Dexie
  const spaces = useLiveQuery(async () => {
    const list = await db.spaces.orderBy('order').toArray();
    return list.filter((s) => !s.isArchived);
  });

  // Read unsaved tabs from Dexie
  const unsavedTabs = useLiveQuery(() =>
    db.tabs.where('spaceId').equals(UNSAVED_SPACE_ID).toArray()
  );

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
      // Fallback to text/plain
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

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen select-none">
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

          <div className="space-y-0.5">
            {spaces && spaces.length > 0 ? (
              spaces.map((space) => {
                const isOver = dragOverSpaceId === space.id;
                const isActive = activeSpaceId === space.id;

                return (
                  <button
                    key={space.id}
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
                        : isActive
                        ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/30'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-base">{space.icon || '📁'}</span>
                      <span className="truncate">{space.name}</span>
                    </div>
                    {isOver && (
                      <span className="text-[10px] font-bold text-blue-300 bg-blue-500/30 px-1.5 py-0.5 rounded animate-pulse">
                        Drop
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-3 text-xs text-slate-500 italic">
                No spaces created yet. Click + to add your first space.
              </div>
            )}
          </div>
        </div>

        {/* Archive Section */}
        <div>
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-300 transition"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive</span>
          </button>
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
    </aside>
  );
};
