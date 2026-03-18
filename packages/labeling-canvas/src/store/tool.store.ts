import { create } from 'zustand'
import type { LabelingTool } from '../types/internal'

interface ToolSelectionState {
  tool: LabelingTool | null
  setTool: (tool: LabelingTool | null) => void
  overedUniques: string[]
  setOveredUniques: (overedUniques: string[]) => void
  undoStack: string[]
  redoStack: string[]
  setUndoStack: (undoStack: string[]) => void
  setRedoStack: (redoStack: string[]) => void
}

export const useToolSelectionStore = create<ToolSelectionState>((set) => ({
  tool: null,
  setTool(tool) {
    set({ tool })
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
}))

export const getToolSelectionStore = () => useToolSelectionStore.getState()
