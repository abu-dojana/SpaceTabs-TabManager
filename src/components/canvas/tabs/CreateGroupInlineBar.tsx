import React from 'react';
import { TAB_GROUP_COLORS } from '@/services/tabManager';
import { X } from 'lucide-react';

interface CreateGroupInlineBarProps {
  inputRef: React.RefObject<HTMLInputElement>;
  title: string;
  color: string;
  onTitleChange: (val: string) => void;
  onColorChange: (hex: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const CreateGroupInlineBar: React.FC<CreateGroupInlineBarProps> = ({
  inputRef,
  title,
  color,
  onTitleChange,
  onColorChange,
  onSubmit,
  onCancel,
}) => {
  return (
    <form
      onSubmit={onSubmit}
      className="mb-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <div className="flex items-center gap-1">
          {TAB_GROUP_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => onColorChange(c.hex)}
              style={{ backgroundColor: c.hex }}
              className={`w-3.5 h-3.5 rounded-full transition cursor-pointer ${
                color.toLowerCase() === c.hex.toLowerCase()
                  ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900 scale-110'
                  : 'opacity-75 hover:opacity-100'
              }`}
              title={c.name}
            />
          ))}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Group name (e.g. Docs, Research, PRs)..."
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
          }}
          className="flex-1 bg-slate-900 border border-blue-500/50 rounded-lg px-2.5 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="submit"
          className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition"
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </form>
  );
};
