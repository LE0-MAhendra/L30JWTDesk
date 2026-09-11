import { create } from 'zustand';
import type { Theme, TokenInspection, Workspace } from './types';

interface AppState {
  workspace: Workspace;
  sidebarCollapsed: boolean;
  theme: Theme;
  token: string;
  inspection: TokenInspection | null;
  setWorkspace: (workspace: Workspace) => void;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setToken: (token: string) => void;
  setInspection: (inspection: TokenInspection | null) => void;
  clearSensitive: () => void;
}

const storedTheme = (localStorage.getItem('l30-theme') as Theme | null) ?? 'dark';
const storedSidebar = localStorage.getItem('l30-sidebar') === 'collapsed';

export const useAppStore = create<AppState>((set) => ({
  workspace: 'inspect',
  sidebarCollapsed: storedSidebar,
  theme: storedTheme,
  token: '',
  inspection: null,
  setWorkspace: (workspace) => set({ workspace }),
  toggleSidebar: () => set((state) => {
    const sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem('l30-sidebar', sidebarCollapsed ? 'collapsed' : 'expanded');
    return { sidebarCollapsed };
  }),
  setTheme: (theme) => {
    localStorage.setItem('l30-theme', theme);
    set({ theme });
  },
  setToken: (token) => set({ token }),
  setInspection: (inspection) => set({ inspection }),
  clearSensitive: () => set({ token: '', inspection: null }),
}));
