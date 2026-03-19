import { create } from 'zustand'
import type { NumberLabelingTool } from '../types/internal'

interface NumberToolState {
  tool: NumberLabelingTool | null
  setTool: (tool: NumberLabelingTool | null) => void
}

export const useNumberToolStore = create<NumberToolState>((set) => ({
  tool: null,
  setTool(tool) {
    set({ tool })
  },
}))
