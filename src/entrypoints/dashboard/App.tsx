import React from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/header/Header';
import { TabsView } from '@/components/canvas/TabsView';
import { ResourcesView } from '@/components/canvas/ResourcesView';
import { NotesView } from '@/components/canvas/NotesView';
import { TasksView } from '@/components/canvas/TasksView';
import { CreateSpaceModal } from '@/components/modals/CreateSpaceModal';
import { MoveToSectionModal } from '@/components/modals/MoveToSectionModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { useUIStore } from '@/store/uiStore';
import { getWindowActiveSpaceId } from '@/services/tabManager';
import { getUserSettings } from '@/services/settings';
import { Bookmark, FileText, CheckSquare, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SpaceTabs ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-950 text-slate-200">
          <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
          <h2 className="text-lg font-bold">Something went wrong</h2>
          <p className="text-xs text-slate-400 max-w-md mt-2 font-mono bg-slate-900 p-3 rounded-lg border border-slate-800">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold text-white transition"
          >
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(37, 99, 235, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function adjustBrightness(hex: string, percent: number): string {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return hex;
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + Math.round(255 * (percent / 100))));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + Math.round(255 * (percent / 100))));
  const b = Math.min(255, Math.max(0, (num & 255) + Math.round(255 * (percent / 100))));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default function App() {
  const {
    activeView,
    setActiveSpaceId,
    sidebarTheme,
    dashboardTheme,
    accentColor,
    darkPalette,
    lightPalette,
    setSidebarTheme,
    setDashboardTheme,
    setAccentColor,
    setDarkPalette,
    setLightPalette,
    isSettingsOpen,
    settingsTab,
    setSettingsOpen,
  } = useUIStore();

  React.useEffect(() => {
    getUserSettings().then((settings) => {
      if (settings.sidebarTheme) setSidebarTheme(settings.sidebarTheme);
      if (settings.dashboardTheme) setDashboardTheme(settings.dashboardTheme);
      if (settings.accentColor) setAccentColor(settings.accentColor);
      if (settings.darkPalette) setDarkPalette(settings.darkPalette);
      if (settings.lightPalette) setLightPalette(settings.lightPalette);
    });

    async function syncActiveSpaceFromWindow() {
      try {
        const currentWin = await chrome.windows.getCurrent();
        if (currentWin.id) {
          const spaceId = await getWindowActiveSpaceId(currentWin.id);
          setActiveSpaceId(spaceId);
        }
      } catch (e) {
        console.error('Failed to sync active space from window:', e);
      }
    }

    syncActiveSpaceFromWindow();

    const handleFocus = () => {
      syncActiveSpaceFromWindow();
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [
    setActiveSpaceId,
    setSidebarTheme,
    setDashboardTheme,
    setAccentColor,
    setDarkPalette,
    setLightPalette,
  ]);

  const dynamicStyles = React.useMemo(() => {
    const validAccent = accentColor || '#2563eb';
    return {
      '--accent-color': validAccent,
      '--accent-hover': adjustBrightness(validAccent, -12),
      '--accent-light': hexToRgba(validAccent, 0.15),
      '--accent-border': hexToRgba(validAccent, 0.38),
    } as React.CSSProperties;
  }, [accentColor]);

  return (
    <ErrorBoundary>
      <div
        data-dark-palette={darkPalette}
        data-light-palette={lightPalette}
        style={dynamicStyles}
        className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-150 ${
          dashboardTheme === 'light' && sidebarTheme === 'light' ? 'bg-slate-50' : 'bg-slate-950'
        }`}
      >
        {/* Left Sidebar */}
        <div data-sidebar-theme={sidebarTheme} className="h-full flex flex-col flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <main
          data-dashboard-theme={dashboardTheme}
          className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900/40 transition-colors duration-150"
        >
          <Header />

          <div className="flex-1 overflow-y-auto">
            {activeView === 'tabs' && <TabsView />}

            {activeView === 'resources' && <ResourcesView />}

            {activeView === 'notes' && <NotesView />}

            {activeView === 'tasks' && <TasksView />}
          </div>
        </main>

        {/* Modals */}
        <CreateSpaceModal />
        <MoveToSectionModal />
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setSettingsOpen(false)}
          initialTab={settingsTab}
        />
      </div>
    </ErrorBoundary>
  );
}
