import React from 'react';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const HighlightText: React.FC<{
  text: string;
  words: string[];
  isLight: boolean;
}> = ({ text, words, isLight }) => {
  if (!text || words.length === 0) return <>{text}</>;

  const validWords = Array.from(new Set(words.filter(Boolean))).sort(
    (a, b) => b.length - a.length
  );
  if (validWords.length === 0) return <>{text}</>;

  const pattern = new RegExp(`(${validWords.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <>
      {parts.map((part, idx) => {
        const isMatch = validWords.some((w) => w.toLowerCase() === part.toLowerCase());
        if (!isMatch) return <React.Fragment key={idx}>{part}</React.Fragment>;
        return (
          <mark
            key={idx}
            className={`rounded px-0.5 font-semibold ${
              isLight
                ? 'bg-amber-200/90 text-slate-950'
                : 'bg-amber-500/25 text-amber-300 border-b border-amber-400/50'
            }`}
          >
            {part}
          </mark>
        );
      })}
    </>
  );
};
