import React from 'react';

interface DeleteNoteModalProps {
  confirmDeleteId: string | null;
  onCancel: () => void;
  onConfirmDelete: (noteId: string) => void;
}

export const DeleteNoteModal: React.FC<DeleteNoteModalProps> = ({
  confirmDeleteId,
  onCancel,
  onConfirmDelete,
}) => {
  if (!confirmDeleteId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
        <h3 className="text-sm font-semibold text-slate-100 mb-2">Delete Note?</h3>
        <p className="text-xs text-slate-400 mb-5">
          Are you sure you want to delete this note? This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmDelete(confirmDeleteId)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition shadow-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
