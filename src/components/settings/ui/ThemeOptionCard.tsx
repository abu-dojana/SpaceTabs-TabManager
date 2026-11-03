import React from 'react';
import { Moon, Sun, Check } from 'lucide-react';

interface ThemeOptionCardProps {
  mode: 'dark' | 'light';
  isSelected: boolean;
  isLight: boolean;
  title: string;
  subtitle: string;
  variant: 'sidebar' | 'dashboard';
  onClick: () => void;
}

export const ThemeOptionCard: React.FC<ThemeOptionCardProps> = ({
  mode,
  isSelected,
  isLight,
  title,
  subtitle,
  variant,
  onClick,
}) => {
  const isDarkCard = mode === 'dark';

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition relative group ${
        isSelected
          ? isDarkCard
            ? 'bg-blue-600/15 border-blue-500 ring-2 ring-blue-500 shadow-md'
            : 'bg-blue-50 border-blue-600 ring-2 ring-blue-600 shadow-md'
          : isLight
          ? 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
          : 'bg-slate-950 border-slate-700 hover:border-slate-500 hover:bg-slate-950/80'
      }`}
    >
      {variant === 'sidebar' ? (
        isDarkCard ? (
          <div className="w-full h-20 rounded-lg bg-slate-950 border border-slate-800 mb-3 p-2 flex gap-1.5 overflow-hidden shadow-inner">
            <div className="w-1/3 h-full rounded bg-slate-900 border border-slate-800 p-1 flex flex-col gap-1">
              <div className="w-full h-2 rounded bg-blue-500" />
              <div className="w-3/4 h-1.5 rounded bg-slate-600" />
              <div className="w-4/5 h-1.5 rounded bg-slate-600" />
            </div>
            <div className="flex-1 h-full rounded bg-slate-900/50 p-1 flex flex-col gap-1">
              <div className="w-full h-2 rounded bg-slate-800" />
              <div className="w-full h-6 rounded bg-slate-800/80" />
            </div>
          </div>
        ) : (
          <div className="w-full h-20 rounded-lg bg-slate-200 border border-slate-300 mb-3 p-2 flex gap-1.5 overflow-hidden shadow-inner">
            <div className="w-1/3 h-full rounded bg-white border border-slate-300 p-1 flex flex-col gap-1">
              <div className="w-full h-2 rounded bg-blue-600" />
              <div className="w-3/4 h-1.5 rounded bg-slate-400" />
              <div className="w-4/5 h-1.5 rounded bg-slate-400" />
            </div>
            <div className="flex-1 h-full rounded bg-slate-100 p-1 flex flex-col gap-1 border border-slate-200">
              <div className="w-full h-2 rounded bg-slate-300" />
              <div className="w-full h-6 rounded bg-slate-200" />
            </div>
          </div>
        )
      ) : isDarkCard ? (
        <div className="w-full h-20 rounded-lg bg-slate-950 border border-slate-800 mb-3 p-2 flex gap-1.5 overflow-hidden shadow-inner">
          <div className="w-1/4 h-full rounded bg-slate-900 border border-slate-800 p-1 flex flex-col gap-1">
            <div className="w-full h-2 rounded bg-slate-700" />
          </div>
          <div className="flex-1 h-full rounded bg-slate-900 border border-slate-800 p-1.5 flex flex-col gap-1.5">
            <div className="w-full h-2 rounded bg-slate-700" />
            <div className="flex gap-1">
              <div className="flex-1 h-7 rounded bg-slate-800 border border-slate-700" />
              <div className="flex-1 h-7 rounded bg-slate-800 border border-slate-700" />
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-20 rounded-lg bg-slate-100 border border-slate-300 mb-3 p-2 flex gap-1.5 overflow-hidden shadow-inner">
          <div className="w-1/4 h-full rounded bg-slate-200 border border-slate-300 p-1 flex flex-col gap-1">
            <div className="w-full h-2 rounded bg-slate-400" />
          </div>
          <div className="flex-1 h-full rounded bg-white border border-slate-300 p-1.5 flex flex-col gap-1.5">
            <div className="w-full h-2 rounded bg-slate-300" />
            <div className="flex gap-1">
              <div className="flex-1 h-7 rounded bg-slate-50 border border-slate-300" />
              <div className="flex-1 h-7 rounded bg-slate-50 border border-slate-300" />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div
            className={`font-bold flex items-center gap-1.5 text-xs ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            {isDarkCard ? (
              <Moon className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>{title}</span>
          </div>
          <div
            className={`text-xs mt-0.5 font-medium ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {subtitle}
          </div>
        </div>
        {isSelected && (
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            <Check className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
};
