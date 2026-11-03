import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmPullModalProps {
  isOpen: boolean;
  isLight: boolean;
  isPulling: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmPullModal: React.FC<ConfirmPullModalProps> = ({
  isOpen,
  isLight,
  isPulling,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-100">
      <div
        className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-100 ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900'
            : 'bg-slate-900 border-slate-700 text-white'
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Download from Google Drive?</h4>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              Local workspace data replacement
            </p>
          </div>
        </div>
        <p className={`text-xs mb-5 leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          This will overwrite your local spaces, tabs, notes, tasks, and resources with the latest version from your Google Drive (
          <span className="font-mono text-blue-400">data.json</span>).
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onCancel}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              isLight
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPulling}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow transition cursor-pointer disabled:opacity-50"
          >
            {isPulling ? 'Restoring...' : 'Restore from Drive'}
          </button>
        </div>
      </div>
    </div>
  );
};
