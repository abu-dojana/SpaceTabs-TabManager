import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { type ToastMessage } from '../settingsTabs';

interface SettingsToastProps {
  toast: ToastMessage | null;
}

export const SettingsToast: React.FC<SettingsToastProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="absolute bottom-5 right-5 z-50 bg-slate-800 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
      {toast.type === 'success' ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-400" />
      )}
      <span>{toast.text}</span>
    </div>
  );
};
