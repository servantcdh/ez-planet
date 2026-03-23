import { create } from "zustand";

import type { LabelingTool } from "../utils/imageLabelingTools";

interface ImageTypeLabelingToolSelectionState {
  tool: LabelingTool | null;
  setTool: (tool: LabelingTool | null) => void;
  overedUniques: string[];
  setOveredUniques: (overedUniques: string[]) => void;
  undoStack: string[];
  redoStack: string[];
  setUndoStack: (undoStack: string[]) => void;
  setRedoStack: (redoStack: string[]) => void;
}

export const useImageTypeLabelingToolSelectionStore =
  create<ImageTypeLabelingToolSelectionState>((set) => ({
    tool: null,
    setTool(tool) {
      set({ tool });
    },
    overedUniques: [],
    setOveredUniques(overedUniques) {
      set({ overedUniques });
    },
    undoStack: [],
    redoStack: [],
    setUndoStack(undoStack) {
      if (undoStack.length === 1 && !JSON.parse(undoStack[0]).objects.length) {
        return set({ undoStack: [] });
      }
      set({ undoStack });
    },
    setRedoStack(redoStack) {
      if (redoStack.length === 1 && !JSON.parse(redoStack[0]).objects.length) {
        return set({ redoStack: [] });
      }
      set({ redoStack });
    },
  }));
