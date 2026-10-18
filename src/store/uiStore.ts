import { create } from 'zustand';

interface UIState {
  activeSpaceId: string | null;     // null = Unsaved view
  selectedTabIds: Set<string>;
  activeView: 'tabs' | 'resources' | 'notes' | 'tasks';
  searchQuery: string;
  isCreateSpaceOpen: boolean;
  setActiveSpaceId: (id: string | null) => void;
  setActiveView: (view: 'tabs' | 'resources' | 'notes' | 'tasks') => void;
  setSearchQuery: (query: string) => void;
  toggleSelectTab: (id: string) => void;
  selectAllTabs: (ids: string[]) => void;
  clearSelectedTabs: () => void;
  setCreateSpaceOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeSpaceId: null, // default to Unsaved
  selectedTabIds: new Set<string>(),
  activeView: 'tabs',
  searchQuery: '',
  isCreateSpaceOpen: false,

  setActiveSpaceId: (id) =>
    set({ activeSpaceId: id, selectedTabIds: new Set(), searchQuery: '' }),
  setActiveView: (view) => set({ activeView: view }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleSelectTab: (id) =>
    set((state) => {
      const next = new Set(state.selectedTabIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedTabIds: next };
    }),

  selectAllTabs: (ids) => set({ selectedTabIds: new Set(ids) }),
  clearSelectedTabs: () => set({ selectedTabIds: new Set() }),
  setCreateSpaceOpen: (open) => set({ isCreateSpaceOpen: open }),
}));
