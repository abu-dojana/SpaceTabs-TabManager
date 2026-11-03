import React from 'react';
import {
  Palette,
  Columns,
  Moon,
  Sun,
  Check,
  PanelLeft,
  Layout,
  Pipette,
} from 'lucide-react';
import { ThemeOptionCard } from '../ui/ThemeOptionCard';

interface AppearanceTabProps {
  isLight: boolean;
  sidebarTheme: 'dark' | 'light';
  dashboardTheme: 'dark' | 'light';
  accentColor: string;
  darkPalette: 'slate' | 'midnight' | 'indigo' | 'forest' | 'espresso';
  lightPalette: 'snow' | 'paper' | 'zinc' | 'sky' | 'mint';
  sidebarWidth: number;
  onApplyPreset: (sb: 'dark' | 'light', dbTheme: 'dark' | 'light') => void;
  onSidebarThemeChange: (theme: 'dark' | 'light') => void;
  onSidebarWidthChange: (width: number) => void;
  onDashboardThemeChange: (theme: 'dark' | 'light') => void;
  onAccentColorChange: (color: string) => void;
  onDarkPaletteChange: (
    palette: 'slate' | 'midnight' | 'indigo' | 'forest' | 'espresso'
  ) => void;
  onLightPaletteChange: (
    palette: 'snow' | 'paper' | 'zinc' | 'sky' | 'mint'
  ) => void;
}

const ACCENT_PRESETS = [
  { name: 'Ocean Blue', hex: '#2563eb' },
  { name: 'Royal Indigo', hex: '#6366f1' },
  { name: 'Violet Purple', hex: '#8b5cf6' },
  { name: 'Emerald Green', hex: '#10b981' },
  { name: 'Crimson Rose', hex: '#f43f5e' },
  { name: 'Amber Gold', hex: '#f59e0b' },
  { name: 'Ocean Cyan', hex: '#06b6d4' },
  { name: 'Sunset Orange', hex: '#f97316' },
];

const DARK_PALETTES = [
  { id: 'slate', name: 'Deep Slate', bg: '#0b1329', card: '#0f172a', desc: 'Classic navy' },
  { id: 'midnight', name: 'Midnight', bg: '#09090b', card: '#121215', desc: 'OLED black' },
  { id: 'indigo', name: 'Space Indigo', bg: '#0b0e20', card: '#121633', desc: 'Cosmic galaxy' },
  { id: 'forest', name: 'Forest Dark', bg: '#07150f', card: '#0d2218', desc: 'Pine charcoal' },
  { id: 'espresso', name: 'Warm Espresso', bg: '#151210', card: '#201c19', desc: 'Rich cocoa' },
] as const;

const LIGHT_PALETTES = [
  { id: 'snow', name: 'Pure Snow', bg: '#f8fafc', card: '#ffffff', desc: 'Crisp white' },
  { id: 'paper', name: 'Warm Paper', bg: '#f7f5ef', card: '#fdfcf9', desc: 'Cozy cream' },
  { id: 'zinc', name: 'Cool Zinc', bg: '#f4f4f5', card: '#ffffff', desc: 'Modern silver' },
  { id: 'sky', name: 'Soft Sky', bg: '#f0f7ff', card: '#ffffff', desc: 'Airy blue' },
  { id: 'mint', name: 'Fresh Mint', bg: '#f0fdf4', card: '#ffffff', desc: 'Calming sage' },
] as const;

export const AppearanceTab: React.FC<AppearanceTabProps> = ({
  isLight,
  sidebarTheme,
  dashboardTheme,
  accentColor,
  darkPalette,
  lightPalette,
  sidebarWidth,
  onApplyPreset,
  onSidebarThemeChange,
  onSidebarWidthChange,
  onDashboardThemeChange,
  onAccentColorChange,
  onDarkPaletteChange,
  onLightPaletteChange,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-100">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3
            className={`text-sm font-bold flex items-center gap-2 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            <Palette className="w-4 h-4 text-pink-400" />
            <span>Appearance & Color Themes</span>
          </h3>
        </div>
        <p className={`text-xs mb-5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          Customize your workspace appearance. You can change the Sidebar and Dashboard themes independently.
        </p>

        {/* Quick Presets */}
        <div
          className={`mb-6 p-4 rounded-xl border flex items-center justify-between ${
            isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950 border-slate-700'
          }`}
        >
          <div>
            <div className={`font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Quick Style Presets
            </div>
            <div className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
              1-click popular color combinations
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { label: 'Split (Dark/Light)', sb: 'dark' as const, db: 'light' as const },
              { label: 'All Dark', sb: 'dark' as const, db: 'dark' as const },
              { label: 'All Light', sb: 'light' as const, db: 'light' as const },
            ].map((p) => {
              const active = sidebarTheme === p.sb && dashboardTheme === p.db;
              return (
                <button
                  key={p.label}
                  onClick={() => onApplyPreset(p.sb, p.db)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition border ${
                    active
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 1: Sidebar Theme */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-1.5">
            <Columns className="w-4 h-4 text-blue-500" />
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}
            >
              Sidebar Theme
            </h4>
          </div>
          <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Color scheme for spaces, sections, and the left navigation menu.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <ThemeOptionCard
              mode="dark"
              variant="sidebar"
              title="Dark Sidebar"
              subtitle="Deep slate palette"
              isSelected={sidebarTheme === 'dark'}
              isLight={isLight}
              onClick={() => onSidebarThemeChange('dark')}
            />
            <ThemeOptionCard
              mode="light"
              variant="sidebar"
              title="Light Sidebar"
              subtitle="Clean white & crisp borders"
              isSelected={sidebarTheme === 'light'}
              isLight={isLight}
              onClick={() => onSidebarThemeChange('light')}
            />
          </div>
        </div>

        {/* Section: Sidebar Width Slider */}
        <div
          className={`mb-7 p-4 rounded-xl border ${
            isLight ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950 border-slate-750'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <PanelLeft className="w-4 h-4 text-blue-500" />
              <h4
                className={`text-xs font-bold uppercase tracking-wider ${
                  isLight ? 'text-slate-800' : 'text-slate-200'
                }`}
              >
                Sidebar Width
              </h4>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                sidebarWidth >= 340
                  ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                  : sidebarWidth <= 270
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {sidebarWidth <= 270 ? 'Default' : sidebarWidth >= 340 ? 'Wide' : 'Expanded'} (
              {sidebarWidth || 260}px)
            </span>
          </div>

          <p className={`text-xs mb-4 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Slide the width of the sidebar from default to wide so longer space titles and labels are completely visible.
          </p>

          <div className="space-y-3">
            <input
              type="range"
              min={240}
              max={400}
              step={4}
              value={sidebarWidth || 260}
              onChange={(e) => onSidebarWidthChange(Number(e.target.value))}
              className="w-full h-2 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              {[
                { label: 'Default (260px)', val: 260, active: sidebarWidth <= 270 },
                {
                  label: 'Medium (320px)',
                  val: 320,
                  active: sidebarWidth > 270 && sidebarWidth < 340,
                },
                { label: 'Wide (380px)', val: 380, active: sidebarWidth >= 340 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => onSidebarWidthChange(preset.val)}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition cursor-pointer text-center ${
                    preset.active
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : isLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Dashboard Canvas Theme */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-1.5">
            <Layout className="w-4 h-4 text-emerald-500" />
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}
            >
              Dashboard & Canvas Theme
            </h4>
          </div>
          <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Color scheme for tabs, resources, markdown notes, and tasks.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <ThemeOptionCard
              mode="dark"
              variant="dashboard"
              title="Dark Dashboard"
              subtitle="Deep slate background"
              isSelected={dashboardTheme === 'dark'}
              isLight={isLight}
              onClick={() => onDashboardThemeChange('dark')}
            />
            <ThemeOptionCard
              mode="light"
              variant="dashboard"
              title="Light Dashboard"
              subtitle="Clean white workspace"
              isSelected={dashboardTheme === 'light'}
              isLight={isLight}
              onClick={() => onDashboardThemeChange('light')}
            />
          </div>
        </div>

        {/* Section 3: Accent Color Palette */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-1.5">
            <Pipette className="w-4 h-4 text-pink-500" />
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}
            >
              Accent Color
            </h4>
          </div>
          <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Primary highlight color for active tabs, checkboxes, primary buttons, and focus states.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            {ACCENT_PRESETS.map((item) => {
              const isSelected = (accentColor || '#2563eb').toLowerCase() === item.hex.toLowerCase();
              return (
                <button
                  key={item.hex}
                  onClick={() => onAccentColorChange(item.hex)}
                  title={item.name}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-blue-500 border-white shadow-md'
                      : isLight
                      ? 'bg-white border-slate-300 hover:bg-slate-50'
                      : 'bg-slate-950 border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center shadow-inner flex-shrink-0"
                    style={{ backgroundColor: item.hex }}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <span className={isLight ? 'text-slate-800' : 'text-slate-200'}>{item.name}</span>
                </button>
              );
            })}

            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                isLight ? 'bg-white border-slate-300' : 'bg-slate-950 border-slate-700'
              }`}
              title="Choose custom hex color"
            >
              <input
                type="color"
                value={accentColor || '#2563eb'}
                onChange={(e) => onAccentColorChange(e.target.value)}
                className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent p-0"
              />
              <span
                className={`text-xs font-mono font-bold ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {accentColor || '#2563eb'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Dark Mode Theme Tone */}
        <div className="mb-7">
          <div className="flex items-center gap-2 mb-1.5">
            <Moon className="w-4 h-4 text-blue-400" />
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}
            >
              Dark Mode Tone & Palette
            </h4>
          </div>
          <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Select your preferred dark surface tone. Applies when dark mode is enabled.
          </p>

          <div className="grid grid-cols-5 gap-2.5">
            {DARK_PALETTES.map((pal) => {
              const isSelected = (darkPalette || 'slate') === pal.id;
              return (
                <div
                  key={pal.id}
                  onClick={() => onDarkPaletteChange(pal.id)}
                  className={`p-2.5 rounded-xl border-2 cursor-pointer transition text-left ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500 shadow-md'
                      : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-slate-950 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div
                    className="w-full h-8 rounded-lg mb-2 p-1 flex gap-1 border border-white/10 shadow-inner"
                    style={{ backgroundColor: pal.bg }}
                  >
                    <div className="w-1/3 h-full rounded" style={{ backgroundColor: pal.card }} />
                    <div
                      className="flex-1 h-full rounded opacity-75"
                      style={{ backgroundColor: pal.card }}
                    />
                  </div>
                  <div
                    className={`font-bold text-xs truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {pal.name}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {pal.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Light Mode Theme Tone */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sun className="w-4 h-4 text-amber-500" />
            <h4
              className={`text-xs font-bold uppercase tracking-wider ${
                isLight ? 'text-slate-800' : 'text-slate-200'
              }`}
            >
              Light Mode Tone & Palette
            </h4>
          </div>
          <p className={`text-xs mb-3.5 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Select your preferred light surface tone. Applies when light mode is enabled.
          </p>

          <div className="grid grid-cols-5 gap-2.5">
            {LIGHT_PALETTES.map((pal) => {
              const isSelected = (lightPalette || 'snow') === pal.id;
              return (
                <div
                  key={pal.id}
                  onClick={() => onLightPaletteChange(pal.id)}
                  className={`p-2.5 rounded-xl border-2 cursor-pointer transition text-left ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500 shadow-md'
                      : isLight
                      ? 'bg-white border-slate-200 hover:border-slate-300'
                      : 'bg-slate-950 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div
                    className="w-full h-8 rounded-lg mb-2 p-1 flex gap-1 border border-slate-300 shadow-inner"
                    style={{ backgroundColor: pal.bg }}
                  >
                    <div
                      className="w-1/3 h-full rounded border border-slate-200"
                      style={{ backgroundColor: pal.card }}
                    />
                    <div
                      className="flex-1 h-full rounded border border-slate-200"
                      style={{ backgroundColor: pal.card }}
                    />
                  </div>
                  <div
                    className={`font-bold text-xs truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {pal.name}
                  </div>
                  <div
                    className={`text-[10px] truncate ${
                      isLight ? 'text-slate-500' : 'text-slate-400'
                    }`}
                  >
                    {pal.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
