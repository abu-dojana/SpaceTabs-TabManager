import React from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Quote,
  Code,
  Link2,
} from 'lucide-react';

interface FormattingToolbarProps {
  onInsertFormatting: (prefix: string, suffix?: string, defaultPlaceholder?: string) => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ onInsertFormatting }) => {
  return (
    <div className="px-8 py-2 flex items-center gap-1 border-b border-slate-800/60 text-slate-400 text-xs">
      <button
        onClick={() => onInsertFormatting('**', '**', 'bold text')}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('*', '*', 'italic text')}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('# ', '', 'Heading 1')}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
        title="Heading 1"
      >
        <Heading1 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('## ', '', 'Heading 2')}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
        title="Heading 2"
      >
        <Heading2 className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-3.5 bg-slate-800 mx-1" />
      <button
        onClick={() => onInsertFormatting('- ', '', 'List item')}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
        title="Bullet List"
      >
        <List className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('- [ ] ', '', 'Task item')}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
        title="Interactive Checklist"
      >
        <CheckSquare className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('> ', '', 'Quote')}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
        title="Blockquote"
      >
        <Quote className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('```\n', '\n```', 'code here')}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
        title="Code Block"
      >
        <Code className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('[', '](https://example.com)', 'link label')}
        className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
        title="Link"
      >
        <Link2 className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onInsertFormatting('\n---\n', '', '')}
        className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-slate-200 text-[11px] font-mono transition"
        title="Horizontal Divider"
      >
        —
      </button>
    </div>
  );
};
