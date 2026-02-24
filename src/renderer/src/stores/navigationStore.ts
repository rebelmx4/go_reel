import { create } from 'zustand'
import { ViewNavActions } from '../../../shared/settings.schema'

export type ViewType = keyof ViewNavActions

interface NavigationState {
  currentView: ViewType
  setView: (view: ViewType) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentView: 'player_page',
  setView: (view) => set({ currentView: view })
}))
