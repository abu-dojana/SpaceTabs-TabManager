import React from 'react';
import { type ResourceItem, type Tab } from '@/db/schema';
import { decodeRealUrl } from '@/utils/urlFilter';
import { Layers, Check, Plus } from 'lucide-react';

interface AddFromOpenTabsDropdownProps {
  sectionId: string;
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement>;
  openTabs: Tab[] | undefined;
  sectionItems: ResourceItem[];
  onToggle: () => void;
  onAddTab: (sectionId: string, tab: { title: string; url: string; favIconUrl?: string }) => void;
}

export const AddFromOpenTabsDropdown: React.FC<AddFromOpenTabsDropdownProps> = ({
  sectionId,
  isOpen,
  dropdownRef,
  openTabs,
  sectionItems,
  onToggle,
  onAddTab,
}) => {
  return (
    <div className="relative" ref={isOpen ? dropdownRef : undefined}>
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition"
        title="Quickly save an open tab as a resource"
      >
        <Layers className="w-3.5 h-3.5 text-blue-400" />
        <span>Add Open Tab</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 max-h-64 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-800 flex items-center justify-between">
            <span>Open Tabs in this Space</span>
            <span className="font-mono text-slate-500">{openTabs?.length || 0}</span>
          </div>

          {openTabs && openTabs.length > 0 ? (
            openTabs.map((t) => {
              const alreadyAdded = sectionItems.some(
                (it) => it.url === decodeRealUrl(t.url)
              );
              return (
                <button
                  key={t.id}
                  onClick={() => onAddTab(sectionId, t)}
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
  );
};
