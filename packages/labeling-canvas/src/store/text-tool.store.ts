import { create } from 'zustand'
import type { TextLabelingTool } from '../types/internal'

interface TextToolState {
  tool: TextLabelingTool | null
  setTool: (tool: TextLabelingTool | null) => void
}

export const useTextToolStore = create<TextToolState>((set) => ({
  tool: null,
  setTool(tool) {
    set({ tool })
  },
}))
