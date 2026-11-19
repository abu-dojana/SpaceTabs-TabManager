import React from 'react';

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  isLight: boolean;
}

export const ToggleRow: React.FC<ToggleRowProps> = ({
  title,
  description,
  checked,
  onToggle,
  isLight,
}) => {
  return (
    <div
      className={`flex items-center justify-between gap-4 p-4 rounded-xl border ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {title}
        </div>
        <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          {description}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`w-12 h-6 flex-shrink-0 flex items-center rounded-full p-1 transition duration-200 ease-in-out cursor-pointer ${
          checked ? 'bg-blue-600' : isLight ? 'bg-slate-300' : 'bg-slate-700'
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ease-in-out ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
