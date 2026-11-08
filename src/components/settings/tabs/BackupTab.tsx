import React from 'react';
import {
  Layers,
  Bookmark,
  FileText,
  FileCode,
  ListTodo,
  Sparkles,
  Upload,
} from 'lucide-react';

interface BackupTabProps {
  isLight: boolean;
  spacesCount: number;
  savedTabsCount: number;
  notesCount: number;
  tasksCount: number;
  resourcesCount: number;
  isPurging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onExport: (format?: 'json' | 'html') => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPurge: () => void;
}

export const BackupTab: React.FC<BackupTabProps> = ({
  isLight,
  spacesCount,
  savedTabsCount,
  notesCount,
  tasksCount,
  resourcesCount,
  isPurging,
  fileInputRef,
  onExport,
  onImportFile,
  onPurge,
}) => {
  const stats = [
    { label: 'Spaces', count: spacesCount, icon: Layers, color: 'text-blue-500' },
    { label: 'Saved Tabs', count: savedTabsCount, icon: Bookmark, color: 'text-emerald-500' },
    { label: 'Notes', count: notesCount, icon: FileText, color: 'text-amber-500' },
    { label: 'Tasks', count: tasksCount, icon: ListTodo, color: 'text-purple-500' },
    { label: 'Resources', count: resourcesCount, icon: Sparkles, color: 'text-cyan-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      <div>
        <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Database & Storage Statistics
        </h3>
        <p className={`text-xs mb-5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          Your entire workspace is stored 100% locally on your machine using IndexedDB.
        </p>

        <div className="grid grid-cols-5 gap-3 mb-6">
          {stats.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.label}
                className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${st.color}`} />
                <div>
                  <div className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {st.count}
                  </div>
                  <div
                    className={`text-[10px] uppercase tracking-wider font-bold ${
                      isLight ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  >
                    {st.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
          Export & Import
        </h3>
        <div className="space-y-3.5">
          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div>
              <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Full Workspace Backup
              </div>
              <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Export all spaces, tabs, notes, tasks, and resources as JSON or clickable HTML.
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onExport('json')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                onClick={() => onExport('html')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs border transition ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export HTML</span>
              </button>
            </div>
          </div>

          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div>
              <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Restore Backup / Import Space
              </div>
              <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Import a SpaceTabs JSON/HTML backup, single-space export, or browser bookmark HTML.
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs border transition ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-650'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Import / Restore</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.html,.htm"
              onChange={onImportFile}
              className="hidden"
            />
          </div>

          <div
            className={`flex items-center justify-between p-4 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
            }`}
          >
            <div>
              <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Purge Stale Unsaved Tabs
              </div>
              <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                Clean out closed tabs from the unsaved cache to keep your storage lightweight.
              </div>
            </div>
            <button
              onClick={onPurge}
              disabled={isPurging}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs border transition ${
                isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-650'
              }`}
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>{isPurging ? 'Cleaning...' : 'Clean Cache'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
