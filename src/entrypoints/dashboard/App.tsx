import React from 'react';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { Header } from '@/components/header/Header';
import { TabsView } from '@/components/canvas/TabsView';
import { CreateSpaceModal } from '@/components/modals/CreateSpaceModal';
import { MoveToSectionModal } from '@/components/modals/MoveToSectionModal';
import { useUIStore } from '@/store/uiStore';
import { getWindowActiveSpaceId } from '@/services/tabManager';
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

export default function App() {
  const { activeView, setActiveSpaceId } = useUIStore();

  React.useEffect(() => {
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
  }, [setActiveSpaceId]);

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-900/40">
          <Header />

          <div className="flex-1 overflow-y-auto">
            {activeView === 'tabs' && <TabsView />}

            {activeView === 'resources' && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <Bookmark className="w-10 h-10 text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-slate-300">
                  Saved Resources
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Pin permanent links, Google Docs, and project assets to this
                  space.
                </p>
              </div>
            )}

            {activeView === 'notes' && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <FileText className="w-10 h-10 text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-slate-300">
                  Space Scratchpad
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Lightweight markdown notes directly attached to this workspace.
                </p>
              </div>
            )}

            {activeView === 'tasks' && (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <CheckSquare className="w-10 h-10 text-slate-600 mb-3" />
                <h3 className="text-base font-semibold text-slate-300">
                  Project Checklist
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Keep quick to-dos side-by-side with your active project tabs.
                </p>
              </div>
            )}
          </div>
        </main>

        {/* Modals */}
        <CreateSpaceModal />
        <MoveToSectionModal />
      </div>
    </ErrorBoundary>
  );
}
