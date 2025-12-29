import { create } from 'zustand';

/**
 * Available views in the application
 */
export type ViewType =
  | 'player'
  | 'history'
  | 'newest'
  | 'search'
  | 'liked'
  | 'elite'
  | 'tag-search'
  | 'settings';

/**
 * Navigation state interface
 */
interface NavigationState {
  currentView: ViewType;
  setView: (view: ViewType) => void;
}

/**
 * Navigation store
 * Manages the current view/page in the application
 */
export const useNavigationStore = create<NavigationState>((set) => ({
  currentView: 'player', // Start with configuration screen
  setView: (view) => set({ currentView: view }),
}));
