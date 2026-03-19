import { create } from 'zustand'
import type { LabelingTool } from '../types/internal'

interface ImageToolState {
  tool: LabelingTool | null
  setTool: (tool: LabelingTool | null) => void
  overedUniques: string[]
  setOveredUniques: (overedUniques: string[]) => void
  undoStack: string[]
  redoStack: string[]
  setUndoStack: (undoStack: string[]) => void
  setRedoStack: (redoStack: string[]) => void
  toolHistory: string[]
}

export const useImageToolStore = create<ImageToolState>((set, get) => ({
  tool: null,
  setTool(tool) {
    const prev = get().tool
    const history = prev ? [prev.id, ...get().toolHistory.slice(0, 4)] : get().toolHistory
    set({ tool, toolHistory: history })
  },
  overedUniques: [],
  setOveredUniques(overedUniques) {
    set({ overedUniques })
  },
  undoStack: [],
  redoStack: [],
  setUndoStack(undoStack) {
    if (undoStack.length === 1 && !JSON.parse(undoStack[0]).objects.length) {
      return set({ undoStack: [] })
    }
    set({ undoStack })
  },
  setRedoStack(redoStack) {
    if (redoStack.length === 1 && !JSON.parse(redoStack[0]).objects.length) {
      return set({ redoStack: [] })
    }
    set({ redoStack })
  },
  toolHistory: [],
}))

export const getImageToolStore = () => useImageToolStore.getState()
