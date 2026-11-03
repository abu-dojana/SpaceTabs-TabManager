import React from 'react';
import { extractDomain } from '@/utils/urlFilter';
import { type ResourceModalState } from './useResourceActions';
import { Bookmark, X } from 'lucide-react';

interface ResourceModalProps {
  modalState: ResourceModalState;
  onChangeModalState: React.Dispatch<React.SetStateAction<ResourceModalState>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ResourceModal: React.FC<ResourceModalProps> = ({
  modalState,
  onChangeModalState,
  onClose,
  onSubmit,
}) => {
  if (!modalState.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              {modalState.mode === 'add' ? 'Add Resource' : 'Edit Resource'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Resource URL
            </label>
            <input
              type="text"
              required
              autoFocus
              value={modalState.url}
              onChange={(e) => {
                const val = e.target.value;
                onChangeModalState((prev) => ({
                  ...prev,
                  url: val,
                  title: prev.title ? prev.title : extractDomain(val),
                }));
              }}
              placeholder="https://docs.google.com/document/... or any URL"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={modalState.title}
              onChange={(e) =>
                onChangeModalState((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g. Q4 Budget Sheet, Product Spec, Figma Board"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!modalState.url.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition"
            >
              {modalState.mode === 'add' ? 'Add Resource' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
