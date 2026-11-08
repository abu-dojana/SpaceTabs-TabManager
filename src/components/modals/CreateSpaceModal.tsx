import React from 'react';
import { db } from '@/db';
import { useUIStore } from '@/store/uiStore';
import { switchWindowToSpace, getNextSpaceOrder, importSpacesFromFile } from '@/services/tabManager';
import { getHostWindowId } from '@/utils/chromeWindow';
import { X, FolderPlus, Upload } from 'lucide-react';

export const EMOJI_OPTIONS = [
  '📁', '🚀', '📊', '📚', '💼', '🎧',
  '⚡', '🔬', '🎨', '📝', '💡', '🔥',
  '🎯', '⭐', '🌐', '🛠️', '💻', '🎮',
  '☕', '✈️'
];

export const CreateSpaceModal: React.FC = () => {
  const { isCreateSpaceOpen, setCreateSpaceOpen, setActiveSpaceId } = useUIStore();
  const [name, setName] = React.useState('');
  const [selectedEmoji, setSelectedEmoji] = React.useState('📁');
  const importFileRef = React.useRef<HTMLInputElement>(null);

  if (!isCreateSpaceOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const nextOrder = await getNextSpaceOrder();
    const id = crypto.randomUUID();
    const now = Date.now();

    await db.spaces.add({
      id,
      name: name.trim(),
      icon: selectedEmoji,
      color: '#3b82f6',
      createdAt: now,
      updatedAt: now,
      order: nextOrder,
      isArchived: false,
    });

    setName('');
    setCreateSpaceOpen(false);
    setActiveSpaceId(id);

    try {
      const hostWinId = await getHostWindowId();
      if (hostWinId) {
        await switchWindowToSpace(hostWinId, id);
      }
    } catch (err) {
      console.error('Failed to switch window on create:', err);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const res = await importSpacesFromFile(text, file.name);
      if (res.success && res.createdSpaceId) {
        setName('');
        setCreateSpaceOpen(false);
        setActiveSpaceId(res.createdSpaceId);
        const hostWinId = await getHostWindowId();
        if (hostWinId) {
          await switchWindowToSpace(hostWinId, res.createdSpaceId);
        }
      }
    } catch (err) {
      console.error('Failed to import space file:', err);
    } finally {
      if (importFileRef.current) {
        importFileRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-slate-100">Create Space</h3>
          </div>
          <button
            onClick={() => setCreateSpaceOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Space Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Power BI, Audiobook, Thesis"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Icon
            </label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition ${
                    selectedEmoji === emoji
                      ? 'bg-blue-600/30 border border-blue-500 text-white'
                      : 'bg-slate-800/60 border border-slate-800 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
            <input
              ref={importFileRef}
              type="file"
              accept=".json,.html,.htm"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => importFileRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800/70 hover:bg-slate-800 border border-slate-700/70 transition"
              title="Import Space from a JSON or HTML file"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Import File</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCreateSpaceOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition"
              >
                Create Space
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
