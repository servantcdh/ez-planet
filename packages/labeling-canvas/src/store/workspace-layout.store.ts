import { create } from 'zustand'

type LayoutDirection = 'horizontal' | 'vertical'

interface WorkspaceLayoutState {
  direction: LayoutDirection
  active: boolean
  setDirection: (direction: LayoutDirection) => void
  setActive: (active: boolean) => void
  toggleActive: () => void
}

export const useWorkspaceLayoutStore = create<WorkspaceLayoutState>((set, get) => ({
  direction: 'horizontal',
  active: true,
  setDirection(direction) {
    set({ direction })
  },
  setActive(active) {
    set({ active })
  },
  toggleActive() {
    set({ active: !get().active })
  },
}))
