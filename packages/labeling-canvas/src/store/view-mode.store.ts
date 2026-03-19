import { create } from 'zustand'
import type { WorkspaceViewMode } from '../types/public'

interface ViewModeState {
  mode: WorkspaceViewMode
  setMode: (mode: WorkspaceViewMode) => void
}

export const useViewModeStore = create<ViewModeState>((set) => ({
  mode: 'Image',
  setMode(mode) {
    set({ mode })
  },
}))

export const getViewModeStore = () => useViewModeStore.getState()
