import { create } from 'zustand'

interface ZoomState {
  level: number
  width: number
  height: number
  setZoom: (payload: { level: number; width: number; height: number }) => void
  reset: () => void
}

export const useZoomStore = create<ZoomState>((set) => ({
  level: 1,
  width: 0,
  height: 0,
  setZoom: ({ level, width, height }) => set({ level, width, height }),
  reset: () => set({ level: 1, width: 0, height: 0 }),
}))
