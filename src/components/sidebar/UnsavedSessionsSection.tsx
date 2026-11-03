import React from 'react';
import { Layers, Plus, Trash2 } from 'lucide-react';
import { type Space, type Tab, UNSAVED_SPACE_ID } from '@/db/schema';

interface UnsavedSessionsSectionProps {
  unsavedSpaces: Space[];
  unsavedTabsMap: Map<string, Tab[]> | undefined;
  totalUnsavedTabsCount: number;
  activeSpaceId: string | null;
  currentWindowId: number | null;
  windowSpaces: Map<number, string | null>;
  dragOverSpaceId: string | null;
  getUnsavedTitle: (spaceId: string) => string;
  onSetDragOverSpaceId: (spaceId: string | null) => void;
  onCreateNewUnsavedSession: () => void;
  onSelectUnsavedSession: (spaceId: string) => void;
  onDeleteUnsavedSession: (spaceId: string) => void;
  onDropOnSpace: (e: React.DragEvent, targetSpaceId: string | null) => void;
}

export const UnsavedSessionsSection: React.FC<UnsavedSessionsSectionProps> = ({
  unsavedSpaces,
  unsavedTabsMap,
  totalUnsavedTabsCount,
  activeSpaceId,
  currentWindowId,
  windowSpaces,
  dragOverSpaceId,
  getUnsavedTitle,
  onSetDragOverSpaceId,
  onCreateNewUnsavedSession,
  onSelectUnsavedSession,
  onDeleteUnsavedSession,
  onDropOnSpace,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>Unsaved</span>
        </div>
        <div className="flex items-center gap-1.5">
          {totalUnsavedTabsCount > 0 && (
            <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
              {totalUnsavedTabsCount}
            </span>
          )}
          <button
            onClick={onCreateNewUnsavedSession}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition"
            title="New unsaved browsing session (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {!unsavedSpaces || unsavedSpaces.length === 0 ? (
          <button
            onClick={onCreateNewUnsavedSession}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              if (dragOverSpaceId !== UNSAVED_SPACE_ID) {
                onSetDragOverSpaceId(UNSAVED_SPACE_ID);
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              onSetDragOverSpaceId(UNSAVED_SPACE_ID);
            }}
            onDragLeave={(e) => {
              const currentTarget = e.currentTarget as HTMLElement;
              if (!currentTarget.contains(e.relatedTarget as Node)) {
                if (dragOverSpaceId === UNSAVED_SPACE_ID) {
                  onSetDragOverSpaceId(null);
                }
              }
            }}
            onDrop={(e) => onDropOnSpace(e, null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all relative ${
              dragOverSpaceId === UNSAVED_SPACE_ID
                ? 'bg-blue-600/30 border-2 border-blue-400 text-blue-200 scale-[1.02] shadow-lg shadow-blue-500/20'
                : activeSpaceId === null
                ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/30'
                : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="truncate italic">Empty session</span>
            </div>
          </button>
        ) : (
          unsavedSpaces.map((uSpace) => {
            const uTabs = unsavedTabsMap?.get(uSpace.id) || [];
            const uTitle = getUnsavedTitle(uSpace.id);
            const isOpenInThisWindow =
              currentWindowId !== null && windowSpaces.get(currentWindowId) === uSpace.id;
            let otherWindowId: number | null = null;
            for (const [wId, sId] of windowSpaces.entries()) {
              if (sId === uSpace.id && wId !== currentWindowId) {
                otherWindowId = wId;
                break;
              }
            }
            const isOpenInOtherWindow = otherWindowId !== null;
            const isSelected =
              activeSpaceId === uSpace.id || (activeSpaceId === null && isOpenInThisWindow);

            return (
              <div key={uSpace.id} className="group relative">
                <button
                  onClick={() => onSelectUnsavedSession(uSpace.id)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverSpaceId !== uSpace.id) {
                      onSetDragOverSpaceId(uSpace.id);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    onSetDragOverSpaceId(uSpace.id);
                  }}
                  onDragLeave={(e) => {
                    const currentTarget = e.currentTarget as HTMLElement;
                    if (!currentTarget.contains(e.relatedTarget as Node)) {
                      if (dragOverSpaceId === uSpace.id) {
                        onSetDragOverSpaceId(null);
                      }
                    }
                  }}
                  onDrop={(e) => onDropOnSpace(e, uSpace.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all relative ${
                    dragOverSpaceId === uSpace.id
                      ? 'bg-blue-600/30 border-2 border-blue-400 text-blue-200 scale-[1.02] shadow-lg shadow-blue-500/20'
                      : isSelected
                      ? 'bg-blue-600/15 text-blue-400 font-medium border border-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate min-w-0 flex-1 mr-1">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isOpenInThisWindow
                          ? 'bg-emerald-400'
                          : isOpenInOtherWindow
                          ? 'bg-amber-400'
                          : uTabs.length > 0
                          ? 'bg-slate-400'
                          : 'bg-slate-600'
                      }`}
                    />
                    <span className="truncate italic font-medium">{uTitle}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {uTabs.length > 0 && (
                      <span className="min-w-[18px] h-4 px-1.5 inline-flex items-center justify-center rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 group-hover:hidden">
                        {uTabs.length}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteUnsavedSession(uSpace.id);
                      }}
                      className="p-1 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded transition opacity-0 group-hover:opacity-100"
                      title="Discard session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
