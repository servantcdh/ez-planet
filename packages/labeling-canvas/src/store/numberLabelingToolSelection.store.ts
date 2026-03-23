import { create } from "zustand";

import type { NumberLabelingTool } from "../utils/numberLabelingTools";

interface NumberLabelingToolSelectionState {
  tool: NumberLabelingTool | null;
  setTool: (tool: NumberLabelingTool | null) => void;
}

export const useNumberLabelingToolSelectionStore =
  create<NumberLabelingToolSelectionState>((set) => ({
    tool: null,
    setTool: (tool) => set({ tool }),
  }));
