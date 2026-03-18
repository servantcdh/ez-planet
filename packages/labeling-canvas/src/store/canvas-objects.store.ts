import { create } from 'zustand'
import type { LabeledFabricObject } from '../types/internal'

interface CanvasObjectsState {
  objects: LabeledFabricObject[]
  setObjects: (objects: LabeledFabricObject[]) => void
}

export const useCanvasObjectsStore = create<CanvasObjectsState>((set) => ({
  objects: [],
  setObjects: (objects) => set({ objects }),
}))
