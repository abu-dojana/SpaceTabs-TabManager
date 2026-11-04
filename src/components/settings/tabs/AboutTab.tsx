import React from 'react';
import {
  Layers,
  CheckCircle2,
  Heart,
  HeartHandshake,
  Sparkles,
  Scale,
  ExternalLink,
} from 'lucide-react';
import { getAppVersion } from '@/utils/appVersion';
import { CHANGELOG_RELEASES } from '../data/changelog';

interface AboutTabProps {
  isLight: boolean;
  accentColor: string;
  onNavigateContact: () => void;
  scrollTarget?: string | null;
}

export const AboutTab: React.FC<AboutTabProps> = ({
  isLight,
  accentColor,
  onNavigateContact,
  scrollTarget,
}) => {
  React.useEffect(() => {
    if (scrollTarget === 'whats-new') {
      const timer = setTimeout(() => {
        const el = document.getElementById('whats-new-section');
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [scrollTarget]);

  return (
    <div className="space-y-5 animate-in fade-in duration-100">
      <div
        className={`p-6 rounded-2xl border text-center ${
          isLight ? 'bg-blue-50/80 border-blue-200 shadow-sm' : 'bg-blue-950/40 border-blue-800'
        }`}
      >
        <div
          className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white shadow-xl transition-colors duration-150"
          style={{
            backgroundColor: accentColor || '#f43f5e',
            boxShadow: `0 10px 25px -5px ${accentColor || '#f43f5e'}50`,
          }}
        >
          <Layers className="w-7 h-7" />
        </div>
        <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          SpaceTabs — Tab Manager
        </h3>
        <p className="text-xs text-blue-500 font-mono mt-0.5 font-bold">
          Version {getAppVersion()} • Manifest V3 • GPL-3.0
        </p>
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-xs font-bold mt-3">
          <CheckCircle2 className="w-4 h-4" />
          <span>No Limits — Free, Private & Open Workspace Suite!</span>
        </div>
      </div>

      {/* Support Creator Quick Callout */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          isLight
            ? 'bg-rose-50/80 border-rose-200 text-slate-800'
            : 'bg-rose-950/20 border-rose-900/60 text-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow flex-shrink-0">
            <Heart className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Support Independent Development
            </div>
            <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              SpaceTabs is 100% free with zero paywalls. Support via SupportKori, bKash, Patreon, or SociaBuzz!
            </div>
          </div>
        </div>

        <button
          onClick={onNavigateContact}
          className="flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
        >
          <HeartHandshake className="w-3.5 h-3.5" />
          <span>Support & Credits →</span>
        </button>
      </div>

      <div
        className={`space-y-3 text-xs leading-relaxed ${
          isLight ? 'text-slate-800 font-medium' : 'text-slate-200 font-medium'
        }`}
      >
        <p className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          SpaceTabs — Tab Manager is a fast, private, and completely free workspace & tab manager.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs">
          <li>
            <strong className={isLight ? 'text-slate-950' : 'text-white'}>
              No Artificial Space Limits:
            </strong>{' '}
            Create unlimited spaces, sections, tabs, and resources.
          </li>
          <li>
            <strong className={isLight ? 'text-slate-950' : 'text-white'}>
              Independent Theming:
            </strong>{' '}
            Toggle light/dark mode for sidebar and workspace canvas separately.
          </li>
          <li>
            <strong className={isLight ? 'text-slate-950' : 'text-white'}>
              100% Local Privacy:
            </strong>{' '}
            All data resides on your machine in IndexedDB. Zero cloud telemetry.
          </li>
          <li>
            <strong className={isLight ? 'text-slate-950' : 'text-white'}>
              Native Chromium Memory Saver:
            </strong>{' '}
            Background tabs are safely suspended using Chrome's native discard engine to significantly reduce RAM usage.
          </li>
          <li>
            <strong className={isLight ? 'text-slate-950' : 'text-white'}>
              Full Workspace Productivity:
            </strong>{' '}
            Integrated Tabs, Resources, Notes, and Tasks for each space.
          </li>
          <li>
            <strong className={isLight ? 'text-slate-950' : 'text-white'}>
              Google Drive Cloud Backup:
            </strong>{' '}
            Optionally sync spaces across multiple machines seamlessly.
          </li>
          <li>
            <strong className={isLight ? 'text-slate-950' : 'text-white'}>
              Open-Source & Copyleft (GPL-3.0):
            </strong>{' '}
            Licensed under the GNU General Public License v3.0 — free to inspect, modify, and share while keeping derivatives open-source.
          </li>
        </ul>
      </div>

      {/* Licensing Card */}
      <div
        className={`p-4 rounded-2xl border flex items-start justify-between gap-4 ${
          isLight
            ? 'bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
            : 'bg-slate-950/60 border-slate-800 text-slate-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${
              isLight
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-blue-500/10 border-blue-500/25 text-blue-400'
            }`}
          >
            <Scale className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
              GNU General Public License v3.0 (GPL-3.0)
            </div>
            <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Copyright © 2026 Abu Dojana. SpaceTabs is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License v3.0 (or later). Any redistributed or modified versions must remain open-source under the same license and credit the original author. Provided &ldquo;AS IS&rdquo; without warranty of any kind.
            </p>
          </div>
        </div>

        <a
          href="https://github.com/abu-dojana/SpaceTabs-TabManager/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
            isLight
              ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
          }`}
        >
          <span>View License</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* What's New / Release Changelog */}
      <div
        id="whats-new-section"
        className={`p-5 rounded-2xl border space-y-4 ${
          isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950/70 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between border-b pb-3 border-slate-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h4 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              What's New in SpaceTabs
            </h4>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
            v{getAppVersion()} Latest
          </span>
        </div>

        {CHANGELOG_RELEASES.map((release, idx) => (
          <div
            key={release.version}
            className={
              idx === 0
                ? 'space-y-2'
                : 'pt-3 border-t border-slate-500/15 space-y-2'
            }
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold ${
                  idx === 0
                    ? isLight
                      ? 'text-slate-900'
                      : 'text-white'
                    : isLight
                    ? 'text-slate-800'
                    : 'text-slate-200'
                }`}
              >
                {release.title}
              </span>
            </div>
            <ul
              className={`list-disc pl-5 ${
                release.compact
                  ? `space-y-1 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`
                  : `space-y-1.5 text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`
              }`}
            >
              {release.items.map((item, itemIdx) => (
                <li key={itemIdx}>
                  {item.lead && (
                    <>
                      <strong className={isLight ? 'text-slate-900' : 'text-white'}>
                        {item.lead}
                        {item.codeTag && <code className="text-[11px]">{item.codeTag}</code>}
                        {item.leadSuffix || ''}
                      </strong>{' '}
                    </>
                  )}
                  {item.description}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
