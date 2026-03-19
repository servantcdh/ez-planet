import { create } from 'zustand'

interface IssuePanelState {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

export const useIssuePanelStore = create<IssuePanelState>((set, get) => ({
  isOpen: false,
  open() {
    set({ isOpen: true })
  },
  close() {
    set({ isOpen: false })
  },
  toggle() {
    set({ isOpen: !get().isOpen })
  },
}))
