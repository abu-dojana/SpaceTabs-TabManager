import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { useUIStore } from '@/store/uiStore';
import { FolderInput, Check, X, Plus } from 'lucide-react';

export const MoveToSectionModal: React.FC = () => {
  const { moveSectionSpaceId, setMoveSectionSpaceId } = useUIStore();
  const [newSectionInput, setNewSectionInput] = React.useState('');

  const space = useLiveQuery(
    () => (moveSectionSpaceId ? db.spaces.get(moveSectionSpaceId) : undefined),
    [moveSectionSpaceId]
  );

  const spaces = useLiveQuery(() => db.spaces.toArray());

  const allSections = React.useMemo(() => {
    if (!spaces) return [];
    const set = new Set<string>();
    for (const s of spaces) {
      if (s.section && s.section.trim()) {
        set.add(s.section.trim());
      }
    }
    return Array.from(set).sort();
  }, [spaces]);

  // Dismiss on Escape
  React.useEffect(() => {
    if (!moveSectionSpaceId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoveSectionSpaceId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveSectionSpaceId, setMoveSectionSpaceId]);

  if (!moveSectionSpaceId || !space) return null;

  const handleSelectSection = async (sectionName: string) => {
    const existingInSection = (spaces || []).filter(
      (s) => !s.isArchived && s.section?.trim() === sectionName
    );
    const existingSectionOrder = existingInSection.find(
      (s) => typeof s.sectionOrder === 'number'
    )?.sectionOrder;

    await db.spaces.update(space.id, {
      section: sectionName,
      sectionOrder: existingSectionOrder,
      updatedAt: Date.now(),
    });
    setMoveSectionSpaceId(null);
  };

  const handleRemoveFromSection = async () => {
    await db.spaces.update(space.id, {
      section: undefined,
      sectionOrder: undefined,
      updatedAt: Date.now(),
    });
    setMoveSectionSpaceId(null);
  };

  const handleCreateNewSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = newSectionInput.trim();
    if (val) {
      const maxSecOrder = (spaces || []).reduce(
        (max, s) => (typeof s.sectionOrder === 'number' ? Math.max(max, s.sectionOrder) : max),
        -1
      );
      await db.spaces.update(space.id, {
        section: val,
        sectionOrder: maxSecOrder >= 0 ? maxSecOrder + 1 : allSections.length,
        updatedAt: Date.now(),
      });
      setNewSectionInput('');
      setMoveSectionSpaceId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
      onClick={() => setMoveSectionSpaceId(null)}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-sm w-full shadow-2xl text-left select-none animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <FolderInput className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <h3 className="text-sm font-semibold text-slate-100 truncate">
              Move "{space.name}" to Section
            </h3>
          </div>
          <button
            onClick={() => setMoveSectionSpaceId(null)}
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
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {allSections.map((sec) => (
                <button
                  key={sec}
                  onClick={() => handleSelectSection(sec)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                    space.section === sec
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="truncate">{sec}</span>
                  {space.section === sec && (
                    <Check className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  )}
                </button>
              ))}

              {space.section && (
                <button
                  onClick={handleRemoveFromSection}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/10 transition mt-1"
                >
                  Remove from section (Move to top)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Create / Enter New Section */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Create New Section
          </div>
          <form onSubmit={handleCreateNewSection} className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={newSectionInput}
              onChange={(e) => setNewSectionInput(e.target.value)}
              placeholder="e.g. Business, Projects, Personal"
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!newSectionInput.trim()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1 flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Move</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
