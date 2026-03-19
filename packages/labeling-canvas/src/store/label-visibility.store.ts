import { create } from 'zustand'

interface LabelVisibilityState {
  hiddenClassificationIds: Record<string, boolean>
  setClassificationVisibility: (labelId: string, hidden: boolean) => void
  reset: () => void
}

export const useLabelVisibilityStore = create<LabelVisibilityState>((set) => ({
  hiddenClassificationIds: {},
  setClassificationVisibility(labelId, hidden) {
    set((s) => ({
      hiddenClassificationIds: { ...s.hiddenClassificationIds, [labelId]: hidden },
    }))
  },
  reset() {
    set({ hiddenClassificationIds: {} })
  },
}))
