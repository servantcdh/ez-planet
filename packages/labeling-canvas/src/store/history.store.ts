import { temporal } from 'zundo'
import { create } from 'zustand'

export interface TemporalHistoryState<T> {
  snapshot: T | null
  setSnapshot: (snapshot: T) => void
  reset: () => void
}

export const createTemporalHistoryStore = <T>() =>
  create<TemporalHistoryState<T>>()(
    temporal(
      (set) => ({
        snapshot: null,
        setSnapshot: (snapshot: T) => set({ snapshot }),
        reset: () => set({ snapshot: null }),
      }),
      {
        limit: 100,
        partialize: (state) => ({ snapshot: state.snapshot }),
      },
    ),
  )
