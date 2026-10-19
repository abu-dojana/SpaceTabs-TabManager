import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { type Note, UNSAVED_SPACE_ID } from '@/db/schema';
import { useUIStore } from '@/store/uiStore';
import {
  FileText,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Eye,
  Edit3,
  Columns2,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Code,
  Quote,
  Link2,
  Clock,
  Sparkles,
  ExternalLink,
  Search,
} from 'lucide-react';

/**
 * Format relative timestamps (e.g. "Just now", "5m ago", "Yesterday")
 */
function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Lightweight, safe Markdown Renderer component
 */
interface MarkdownRendererProps {
  content: string;
  onToggleTodo?: (lineIndex: number) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onToggleTodo }) => {
  if (!content.trim()) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 italic">
        Empty note. Type something on the left or switch to Edit mode to write.
      </div>
    );
  }

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];

  const parseInline = (text: string): React.ReactNode[] => {
    // Links: [label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    // Bold: **text**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    // Italic: *text*
    const italicRegex = /(?<!\*)\*([^*]+)\*(?!\*)/g;
    // Inline code: `code`
    const codeRegex = /`([^`]+)`/g;

    let parts: (string | React.ReactNode)[] = [text];

    // Process Links
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return [part];
      const result: (string | React.ReactNode)[] = [];
      let lastIdx = 0;
      let match;
      while ((match = linkRegex.exec(part)) !== null) {
        if (match.index > lastIdx) {
          result.push(part.substring(lastIdx, match.index));
        }
        const [, label, url] = match;
        result.push(
          <a
            key={`link-${match.index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline inline-flex items-center gap-0.5 break-all font-medium"
          >
            {label}
            <ExternalLink className="w-2.5 h-2.5 inline" />
          </a>
        );
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < part.length) {
        result.push(part.substring(lastIdx));
      }
      return result;
    });

    // Process Inline Code
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return [part];
      const result: (string | React.ReactNode)[] = [];
      let lastIdx = 0;
      let match;
      while ((match = codeRegex.exec(part)) !== null) {
        if (match.index > lastIdx) {
          result.push(part.substring(lastIdx, match.index));
        }
        result.push(
          <code
            key={`code-${match.index}`}
            className="bg-slate-800 text-blue-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-700/60"
          >
            {match[1]}
          </code>
        );
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < part.length) {
        result.push(part.substring(lastIdx));
      }
      return result;
    });

    // Process Bold
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return [part];
      const result: (string | React.ReactNode)[] = [];
      let lastIdx = 0;
      let match;
      while ((match = boldRegex.exec(part)) !== null) {
        if (match.index > lastIdx) {
          result.push(part.substring(lastIdx, match.index));
        }
        result.push(
          <strong key={`bold-${match.index}`} className="font-bold text-slate-100">
            {match[1]}
          </strong>
        );
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < part.length) {
        result.push(part.substring(lastIdx));
      }
      return result;
    });

    // Process Italic
    parts = parts.flatMap((part) => {
      if (typeof part !== 'string') return [part];
      const result: (string | React.ReactNode)[] = [];
      let lastIdx = 0;
      let match;
      while ((match = italicRegex.exec(part)) !== null) {
        if (match.index > lastIdx) {
          result.push(part.substring(lastIdx, match.index));
        }
        result.push(
          <em key={`italic-${match.index}`} className="italic text-slate-300">
            {match[1]}
          </em>
        );
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < part.length) {
        result.push(part.substring(lastIdx));
      }
      return result;
    });

    return parts;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code Block ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`codeblock-${i}`}
            className="bg-slate-950 border border-slate-800 rounded-lg p-3 my-2 font-mono text-xs text-blue-300 overflow-x-auto selection:bg-blue-600/30"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Horizontal Rule ---
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={`hr-${i}`} className="border-slate-800 my-4" />);
      continue;
    }

    // Heading 1: # Title
    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-lg font-bold text-slate-100 mt-4 mb-2 pb-1 border-b border-slate-800"
        >
          {parseInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    // Heading 2: ## Title
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-base font-semibold text-slate-200 mt-3 mb-1.5">
          {parseInline(line.slice(3))}
        </h2>
      );
      continue;
    }

    // Heading 3: ### Title
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-sm font-semibold text-slate-300 mt-2 mb-1">
          {parseInline(line.slice(4))}
        </h3>
      );
      continue;
    }

    // Checklists: - [ ] Task or - [x] Task
    if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      const checked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
      const text = line.slice(6);
      elements.push(
        <div
          key={`todo-${i}`}
          onClick={() => onToggleTodo?.(i)}
          className="flex items-start gap-2.5 my-1 text-xs cursor-pointer group select-none"
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggleTodo?.(i)}
            className="w-3.5 h-3.5 mt-0.5 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer"
          />
          <span
            className={`flex-1 ${
              checked ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-white'
            }`}
          >
            {parseInline(text)}
          </span>
        </div>
      );
      continue;
    }

    // Bullet List: - Item or * Item
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-1 text-xs text-slate-300">
          <span className="text-blue-400 font-bold leading-relaxed">•</span>
          <span className="flex-1 leading-relaxed">{parseInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Blockquote: > Quote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-2 border-blue-500/80 bg-blue-500/5 px-3 py-1.5 my-2 text-xs text-slate-400 italic rounded-r"
        >
          {parseInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Empty blank line
    if (!line.trim()) {
      elements.push(<div key={`blank-${i}`} className="h-2" />);
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="text-xs text-slate-300 leading-relaxed my-1">
        {parseInline(line)}
      </p>
    );
  }

  // Handle unclosed codeblock
  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <pre
        key="codeblock-end"
        className="bg-slate-950 border border-slate-800 rounded-lg p-3 my-2 font-mono text-xs text-blue-300 overflow-x-auto"
      >
        <code>{codeBuffer.join('\n')}</code>
      </pre>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
};

export const NotesView: React.FC = () => {
  const { activeSpaceId, searchQuery } = useUIStore();
  const targetSpaceId = activeSpaceId || UNSAVED_SPACE_ID;

  // Active space metadata
  const activeSpace = useLiveQuery(
    () => (activeSpaceId ? db.spaces.get(activeSpaceId) : undefined),
    [activeSpaceId]
  );

  // Notes for this space
  const notes = useLiveQuery(
    () => db.notes.where('spaceId').equals(targetSpaceId).toArray(),
    [targetSpaceId]
  );

  const [selectedNoteId, setSelectedNoteId] = React.useState<string | null>(null);

  // Local editor buffers for smooth non-blocking typing
  const [titleBuffer, setTitleBuffer] = React.useState('');
  const [contentBuffer, setContentBuffer] = React.useState('');
  const [saveStatus, setSaveStatus] = React.useState<'saved' | 'saving'>('saved');
  const [viewMode, setViewMode] = React.useState<'edit' | 'preview' | 'split'>('edit');
  const [isCopied, setIsCopied] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const saveDebounceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter notes based on global search query
  const filteredNotes = React.useMemo(() => {
    if (!notes) return [];
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...notes].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    if (!query) return sorted;
    return sorted.filter(
      (n) =>
        n.title.toLowerCase().includes(query) || n.content.toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  // Sync selected note into editor buffer
  React.useEffect(() => {
    if (selectedNoteId) {
      const current = notes?.find((n) => n.id === selectedNoteId);
      if (current) {
        setTitleBuffer(current.title || '');
        setContentBuffer(current.content || '');
        setSaveStatus('saved');
      }
    } else if (filteredNotes.length > 0) {
      // Auto-select first note
      const first = filteredNotes[0];
      setSelectedNoteId(first.id);
      setTitleBuffer(first.title || '');
      setContentBuffer(first.content || '');
      setSaveStatus('saved');
    } else {
      setTitleBuffer('');
      setContentBuffer('');
    }
  }, [selectedNoteId, filteredNotes]);

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (saveDebounceTimer.current) clearTimeout(saveDebounceTimer.current);
    };
  }, []);

  // Debounced auto-save to Dexie
  const triggerAutoSave = (newTitle: string, newContent: string) => {
    if (!selectedNoteId) return;
    setSaveStatus('saving');

    if (saveDebounceTimer.current) {
      clearTimeout(saveDebounceTimer.current);
    }

    saveDebounceTimer.current = setTimeout(async () => {
      try {
        await db.notes.update(selectedNoteId, {
          title: newTitle.trim() || 'Untitled Note',
          content: newContent,
          updatedAt: Date.now(),
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to auto-save note:', err);
      }
    }, 400);
  };

  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitleBuffer(val);
    triggerAutoSave(val, contentBuffer);
  };

  // Handle content changes
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContentBuffer(val);
    triggerAutoSave(titleBuffer, val);
  };

  // Create new note
  const handleCreateNewNote = async () => {
    const id = crypto.randomUUID();
    const now = Date.now();
    const newNote: Note = {
      id,
      spaceId: targetSpaceId,
      title: 'Untitled Note',
      content: '',
      createdAt: now,
      updatedAt: now,
    };

    await db.notes.add(newNote);
    setSelectedNoteId(id);
    setTitleBuffer(newNote.title);
    setContentBuffer(newNote.content);
    setViewMode('edit');

    // Focus editor after creation
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  // Delete note
  const handleDeleteNote = async (id: string) => {
    await db.notes.delete(id);
    setConfirmDeleteId(null);
    if (selectedNoteId === id) {
      const remaining = filteredNotes.filter((n) => n.id !== id);
      if (remaining.length > 0) {
        setSelectedNoteId(remaining[0].id);
      } else {
        setSelectedNoteId(null);
      }
    }
  };

  // Copy note content
  const handleCopyNote = async () => {
    const fullText = `${titleBuffer}\n\n${contentBuffer}`.trim();
    await navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  // Export / Download note as .md
  const handleDownloadNote = () => {
    const fullText = `# ${titleBuffer}\n\n${contentBuffer}`.trim();
    const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = (titleBuffer || 'untitled').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    a.download = `${safeTitle}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Interactive todo checkbox toggle in Markdown preview
  const handleToggleTodo = (lineIndex: number) => {
    const lines = contentBuffer.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;

    const line = lines[lineIndex];
    if (line.startsWith('- [ ] ')) {
      lines[lineIndex] = `- [x] ${line.slice(6)}`;
    } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      lines[lineIndex] = `- [ ] ${line.slice(6)}`;
    }

    const updatedContent = lines.join('\n');
    setContentBuffer(updatedContent);
    triggerAutoSave(titleBuffer, updatedContent);
  };

  // Formatting toolbar helper
  const insertFormatting = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = contentBuffer.substring(start, end) || defaultPlaceholder;

    const before = contentBuffer.substring(0, start);
    const after = contentBuffer.substring(end);

    const replacement = `${prefix}${selectedText}${suffix}`;
    const newContent = `${before}${replacement}${after}`;

    setContentBuffer(newContent);
    triggerAutoSave(titleBuffer, newContent);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  // Support Tab key (2 spaces) and Ctrl shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      insertFormatting('  ', '', '');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      insertFormatting('**', '**', 'bold text');
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault();
      insertFormatting('*', '*', 'italic text');
    }
  };

  return (
    <div className="flex-1 flex h-[calc(100vh-68px)] overflow-hidden select-none">
      {/* Left Sidebar: Notes List */}
      <aside className="w-72 bg-slate-950/70 border-r border-slate-800 flex flex-col flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Notes
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              ({filteredNotes.length})
            </span>
          </div>

          <button
            onClick={handleCreateNewNote}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition"
            title="Create a new note in this space"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Notes Cards List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
          {filteredNotes.length > 0 ? (
            filteredNotes.map((note) => {
              const isSelected = selectedNoteId === note.id;
              const preview =
                note.content.replace(/[#*`_~-]/g, '').trim().slice(0, 75) ||
                'Empty note...';

              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`group p-3 rounded-lg cursor-pointer transition relative border ${
                    isSelected
                      ? 'bg-blue-600/10 border-blue-500/40 text-white'
                      : 'border-transparent hover:bg-slate-900/60 text-slate-300 hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <h3
                      className={`text-xs font-semibold truncate ${
                        isSelected ? 'text-blue-300' : 'text-slate-200'
                      }`}
                    >
                      {note.title || 'Untitled Note'}
                    </h3>

                    {/* Delete hover button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(note.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 rounded transition"
                      title="Delete note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2 leading-relaxed font-normal">
                    {preview}
                  </p>

                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{formatRelativeTime(note.updatedAt)}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 px-4 text-center">
              <FileText className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No notes in this space yet.</p>
              <button
                onClick={handleCreateNewNote}
                className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create first note</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace Area: Active Note Editor & Preview */}
      <main className="flex-1 flex flex-col bg-slate-900/30 overflow-hidden">
        {selectedNoteId ? (
          <>
            {/* Note Top Toolbar */}
            <header className="px-6 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 flex-shrink-0">
              {/* Left: View Mode Switcher (Edit, Preview, Split) */}
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode('edit')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                    viewMode === 'edit'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Editor only"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => setViewMode('split')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                    viewMode === 'split'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Side-by-side split view"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Split</span>
                </button>

                <button
                  onClick={() => setViewMode('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition ${
                    viewMode === 'preview'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Rendered preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>

              {/* Center: Save status */}
              <div className="flex items-center gap-1.5 text-xs">
                {saveStatus === 'saving' ? (
                  <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    Saving...
                  </span>
                ) : (
                  <span className="text-emerald-400/80 flex items-center gap-1 font-mono text-[11px]">
                    <Check className="w-3 h-3 text-emerald-400" />
                    Saved
                  </span>
                )}
              </div>

              {/* Right: Actions (Copy, Download, Delete) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyNote}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition"
                  title="Copy note to clipboard"
                >
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  onClick={handleDownloadNote}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition"
                  title="Download note as Markdown (.md)"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setConfirmDeleteId(selectedNoteId)}
                  className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                  title="Delete this note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </header>

            {/* Note Title Input Bar */}
            <div className="px-8 pt-6 pb-2">
              <input
                type="text"
                value={titleBuffer}
                onChange={handleTitleChange}
                placeholder="Note Title..."
                className="w-full bg-transparent text-xl font-bold text-slate-100 placeholder-slate-600 focus:outline-none tracking-tight"
              />
            </div>

            {/* Markdown Quick Formatting Toolbar (Visible in Edit and Split mode) */}
            {viewMode !== 'preview' && (
              <div className="px-8 py-2 flex items-center gap-1 border-b border-slate-800/60 text-slate-400 text-xs">
                <button
                  onClick={() => insertFormatting('**', '**', 'bold text')}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('*', '*', 'italic text')}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('# ', '', 'Heading 1')}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Heading 1"
                >
                  <Heading1 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('## ', '', 'Heading 2')}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Heading 2"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-3.5 bg-slate-800 mx-1" />
                <button
                  onClick={() => insertFormatting('- ', '', 'List item')}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Bullet List"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('- [ ] ', '', 'Task item')}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Interactive Checklist"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('> ', '', 'Quote')}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Blockquote"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('```\n', '\n```', 'code here')}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Code Block"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('[', '](https://example.com)', 'link label')}
                  className="p-1.5 rounded hover:bg-slate-800 hover:text-slate-200 transition"
                  title="Link"
                >
                  <Link2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('\n---\n', '', '')}
                  className="px-2 py-0.5 rounded hover:bg-slate-800 hover:text-slate-200 text-[11px] font-mono transition"
                  title="Horizontal Divider"
                >
                  —
                </button>
              </div>
            )}

            {/* Note Body Area (Edit / Preview / Split) */}
            <div className="flex-1 overflow-hidden flex">
              {/* Textarea Editor Pane */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div
                  className={`flex-1 h-full overflow-y-auto p-8 ${
                    viewMode === 'split' ? 'border-r border-slate-800' : ''
                  }`}
                >
                  <textarea
                    ref={textareaRef}
                    value={contentBuffer}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Write markdown notes, brainstorm ideas, paste snippets, or track checklist items..."
                    className="w-full h-full bg-transparent text-xs text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-mono leading-relaxed selection:bg-blue-600/30"
                  />
                </div>
              )}

              {/* Rendered Markdown Preview Pane */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="flex-1 h-full overflow-y-auto p-8 bg-slate-950/30">
                  <MarkdownRenderer
                    content={contentBuffer}
                    onToggleTodo={handleToggleTodo}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty State when no note is selected */
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <FileText className="w-12 h-12 text-slate-700 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No Note Selected</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
              Select a note from the left sidebar or create a new scratchpad for &quot;{activeSpace?.name || 'this space'}&quot;.
            </p>
            <button
              onClick={handleCreateNewNote}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note</span>
            </button>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-100 mb-2">Delete Note?</h3>
            <p className="text-xs text-slate-400 mb-5">
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNote(confirmDeleteId)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
