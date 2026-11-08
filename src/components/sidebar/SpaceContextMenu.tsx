import React from 'react';
import { type Space } from '@/db/schema';
import { type ExportFormat } from '@/services/tabManager';
import {
  Pencil,
  ExternalLink,
  Copy,
  FolderInput,
  FileText,
  FileCode,
  Download,
  Archive,
  Trash2,
  ChevronRight,
} from 'lucide-react';

interface SpaceContextMenuProps {
  isOpen: boolean;
  menuRef: React.RefObject<HTMLDivElement>;
  space: Space;
  onRename: () => void;
  onOpenNewWindow: () => void;
  onDuplicate: () => void;
  onMoveToSection: () => void;
  onEditDescription: () => void;
  onExport: (format: ExportFormat) => void;
  onArchive: () => void;
  onDelete: () => void;
}

export const SpaceContextMenu: React.FC<SpaceContextMenuProps> = ({
  isOpen,
  menuRef,
  space,
  onRename,
  onOpenNewWindow,
  onDuplicate,
  onMoveToSection,
  onEditDescription,
  onExport,
  onArchive,
  onDelete,
}) => {
  const [showExportSubmenu, setShowExportSubmenu] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setShowExportSubmenu(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-1 top-full mt-1 z-50 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-xs select-none animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Rename the space */}
      <button
        onClick={onRename}
        className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
      >
        <Pencil className="w-3.5 h-3.5 text-slate-400" />
        <span>Rename</span>
      </button>

      {/* 2. Open space in a New window */}
      <button
        onClick={onOpenNewWindow}
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
        onClick={onDuplicate}
        className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
      >
        <Copy className="w-3.5 h-3.5 text-slate-400" />
        <span>Duplicate</span>
      </button>

      {/* 4. Move to a New section */}
      <button
        onClick={onMoveToSection}
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
        onClick={onEditDescription}
        className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
      >
        <FileText className="w-3.5 h-3.5 text-slate-400" />
        <span>{space.description ? 'Edit description' : 'Add description'}</span>
      </button>

      {/* 6. Export Space (JSON / HTML) */}
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowExportSubmenu((prev) => !prev);
          }}
          className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center justify-between transition"
        >
          <div className="flex items-center gap-2.5">
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export space</span>
          </div>
          <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${showExportSubmenu ? 'rotate-90' : ''}`} />
        </button>

        {showExportSubmenu && (
          <div className="bg-slate-950/80 border-y border-slate-800/80 py-1">
            <button
              onClick={() => {
                setShowExportSubmenu(false);
                onExport('json');
              }}
              className="w-full text-left pl-7 pr-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>Export as JSON (.json)</span>
            </button>
            <button
              onClick={() => {
                setShowExportSubmenu(false);
                onExport('html');
              }}
              className="w-full text-left pl-7 pr-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export as HTML (.html)</span>
            </button>
          </div>
        )}
      </div>

      {/* 7. Archive */}
      <button
        onClick={onArchive}
        className="w-full text-left px-3 py-1.5 text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2.5 transition"
      >
        <Archive className="w-3.5 h-3.5 text-slate-400" />
        <span>Archive</span>
      </button>

      <div className="border-t border-slate-800 my-1" />

      {/* 8. Delete */}
      <button
        onClick={onDelete}
        className="w-full text-left px-3 py-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 flex items-center gap-2.5 transition"
      >
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
        <span>Delete</span>
      </button>
    </div>
  );
};
