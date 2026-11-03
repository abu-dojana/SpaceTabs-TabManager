import React from 'react';
import { type ResourceItem, type ResourceSection } from '@/db/schema';
import { extractDomain } from '@/utils/urlFilter';
import { renderResourceIcon } from './resourceUtils';
import {
  GripVertical,
  Check,
  Copy,
  ArrowUpRight,
  MoreVertical,
  Pencil,
  Folder,
  Trash2,
} from 'lucide-react';

interface ResourceItemRowProps {
  item: ResourceItem;
  sections: ResourceSection[];
  showTabFavicons: boolean;
  copiedId: string | null;
  isMenuOpen: boolean;
  itemMenuRef: React.RefObject<HTMLDivElement>;
  onDragStart: (e: React.DragEvent, itemId: string) => void;
  onOpenResource: (url: string) => void;
  onCopyLink: (id: string, url: string) => void;
  onToggleMenu: () => void;
  onEditResource: (item: ResourceItem) => void;
  onMoveToSection: (itemId: string, newSectionId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

export const ResourceItemRow: React.FC<ResourceItemRowProps> = ({
  item,
  sections,
  showTabFavicons,
  copiedId,
  isMenuOpen,
  itemMenuRef,
  onDragStart,
  onOpenResource,
  onCopyLink,
  onToggleMenu,
  onEditResource,
  onMoveToSection,
  onDeleteItem,
}) => {
  return (
    <div
      draggable={true}
      onDragStart={(e) => onDragStart(e, item.id)}
      className="flex items-center justify-between px-3.5 py-2 hover:bg-slate-800/40 transition group cursor-pointer"
      onClick={() => onOpenResource(item.url)}
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
          {renderResourceIcon(item, showTabFavicons)}
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
          onClick={() => onCopyLink(item.id, item.url)}
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
        <div className="relative" ref={isMenuOpen ? itemMenuRef : undefined}>
          <button
            onClick={onToggleMenu}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 transition"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs">
              <button
                onClick={() => onEditResource(item)}
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
                        onClick={() => onMoveToSection(item.id, s.id)}
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
                onClick={() => onDeleteItem(item.id)}
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
  );
};
