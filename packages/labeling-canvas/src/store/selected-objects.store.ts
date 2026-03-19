import { create } from 'zustand'
import type { LabeledFabricObject } from '../types/internal'

interface SelectedObjectsState {
  objects: LabeledFabricObject[]
  setObjects: (objects: LabeledFabricObject[]) => void
}

export const useSelectedObjectsStore = create<SelectedObjectsState>((set) => ({
  objects: [],
  setObjects(objects) {
    set({ objects })
  },
}))
