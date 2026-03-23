import { create } from "zustand";

import type { TextLabelingTool } from "../utils/textLabelingTools";

interface TextTypeLabelingToolSelectionState {
  tool: TextLabelingTool | null;
  setTool: (tool: TextLabelingTool | null) => void;
}

export const useTextTypeLabelingToolSelectionStore =
  create<TextTypeLabelingToolSelectionState>((set) => ({
    tool: null,
    setTool(tool) {
      set({ tool });
    },
  }));

