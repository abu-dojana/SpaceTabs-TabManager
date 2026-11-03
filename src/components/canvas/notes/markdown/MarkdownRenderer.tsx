import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface MarkdownRendererProps {
  content: string;
  onToggleTodo?: (lineIndex: number) => void;
}

/**
 * Lightweight, safe Markdown Renderer component
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onToggleTodo }) => {
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
            className="cursor-pointer flex-shrink-0 mt-0.5"
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
