import React from 'react';
import { type Space } from '@/db/schema';
import { FileText, X, Trash2, AlertTriangle, Archive } from 'lucide-react';

interface SidebarModalsProps {
  descriptionModalSpace: Space | null;
  onCloseDescription: () => void;
  onSaveDescription: (spaceId: string, desc: string) => Promise<void>;

  deleteConfirmSpace: Space | null;
  onCloseDeleteConfirm: () => void;
  onConfirmDeleteSpace: (spaceId: string) => Promise<void>;

  deleteSectionModal: string | null;
  onCloseDeleteSection: () => void;
  onArchiveSectionSpaces: (sectionName: string) => Promise<void>;
  onKeepSectionSpaces: (sectionName: string) => Promise<void>;
}

export const SidebarModals: React.FC<SidebarModalsProps> = ({
  descriptionModalSpace,
  onCloseDescription,
  onSaveDescription,
  deleteConfirmSpace,
  onCloseDeleteConfirm,
  onConfirmDeleteSpace,
  deleteSectionModal,
  onCloseDeleteSection,
  onArchiveSectionSpaces,
  onKeepSectionSpaces,
}) => {
  return (
    <>
      {/* 1. Add / Edit Description Modal */}
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
                onClick={onCloseDescription}
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
                await onSaveDescription(descriptionModalSpace.id, textarea.value.trim());
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
                  onClick={onCloseDescription}
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

      {/* 2. Delete Space Confirmation Modal */}
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
                onClick={onCloseDeleteConfirm}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => onConfirmDeleteSpace(deleteConfirmSpace.id)}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition shadow-sm"
              >
                Delete Space
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Delete Section Modal (Workona Style) */}
      {deleteSectionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={onCloseDeleteSection}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl select-none animate-in fade-in zoom-in-95 duration-100 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onCloseDeleteSection}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Amber Warning Triangle */}
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-400" />
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-slate-100 mb-2">
              Archive the contents of {deleteSectionModal}?
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              You can archive all spaces in this section or keep them active in your main spaces list.
            </p>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => onArchiveSectionSpaces(deleteSectionModal)}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs tracking-wider uppercase shadow-lg shadow-blue-600/20 transition flex items-center justify-center gap-1.5"
              >
                <Archive className="w-4 h-4" />
                <span>ARCHIVE SPACES</span>
              </button>

              <button
                onClick={() => onKeepSectionSpaces(deleteSectionModal)}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-lg text-xs tracking-wider uppercase transition"
              >
                KEEP SPACES
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
