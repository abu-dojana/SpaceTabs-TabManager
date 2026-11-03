import React from 'react';
import { ExternalLink, AlertCircle } from 'lucide-react';

interface ShortcutsTabProps {
  isLight: boolean;
  dashboardShortcut: string;
  isShortcutAssigned: boolean;
}

const NOTE_SHORTCUTS = [
  { label: 'Force Save Active Note', key: 'Ctrl + S / Cmd + S' },
  { label: 'Bold Note Text', key: 'Ctrl + B / Cmd + B' },
  { label: 'Italic Note Text', key: 'Ctrl + I / Cmd + I' },
  { label: 'Indent Checklist / Line in Note', key: 'Tab (2 spaces)' },
];

export const ShortcutsTab: React.FC<ShortcutsTabProps> = ({
  isLight,
  dashboardShortcut,
  isShortcutAssigned,
}) => {
  return (
    <div className="space-y-5 animate-in fade-in duration-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className={`text-sm font-bold mb-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            Keyboard Shortcuts
          </h3>
          <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Boost your productivity with quick navigation and formatting hotkeys.
          </p>
        </div>

        <button
          onClick={() => {
            try {
              chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            } catch {}
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer flex-shrink-0 ${
            isLight
              ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800 shadow-sm'
              : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
          }`}
          title="Open chrome://extensions/shortcuts to customize or assign browser shortcuts"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Configure in Browser</span>
        </button>
      </div>

      {!isShortcutAssigned && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
            isLight
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-amber-950/30 border-amber-700/50 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>
              <strong>Alt + Shift + W</strong> is not currently assigned in your browser (this can happen after an extension update or shortcut conflict). Click{' '}
              <strong>Configure in Browser</strong> to bind it in{' '}
              <code className="text-[11px]">chrome://extensions/shortcuts</code>, or click the SpaceTabs toolbar icon anytime.
            </span>
          </div>
        </div>
      )}

      <div
        className={`divide-y border rounded-xl overflow-hidden ${
          isLight
            ? 'divide-slate-200 border-slate-200 bg-slate-50 shadow-sm'
            : 'divide-slate-800 border-slate-800 bg-slate-950/70'
        }`}
      >
        <div className="flex items-center justify-between p-4 gap-3">
          <div>
            <span className={`font-semibold block ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              Jump to SpaceTabs Dashboard
            </span>
            <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Default: Alt + Shift + W (or click the SpaceTabs extension icon)
            </span>
          </div>
          <kbd
            className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${
              !isShortcutAssigned
                ? isLight
                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                  : 'bg-amber-950/60 border-amber-700 text-amber-300'
                : isLight
                ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                : 'bg-slate-800 border-slate-700 text-blue-300'
            }`}
          >
            {dashboardShortcut}
          </kbd>
        </div>

        {NOTE_SHORTCUTS.map((sc) => (
          <div key={sc.label} className="flex items-center justify-between p-4">
            <span className={`font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
              {sc.label}
            </span>
            <kbd
              className={`px-3 py-1.5 rounded font-mono text-xs font-bold border ${
                isLight
                  ? 'bg-white border-slate-300 text-blue-700 shadow-sm'
                  : 'bg-slate-800 border-slate-700 text-blue-300'
              }`}
            >
              {sc.key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
};
