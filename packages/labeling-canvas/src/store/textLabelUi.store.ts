import { create } from "zustand";

interface TextLabelUiState {
  hiddenRecognitionIds: Record<string, boolean>;
  lockedLabelIds: Record<string, boolean>;
  setRecognitionVisibility: (
    labelId: string | null | undefined,
    hidden: boolean
  ) => void;
  setLabelLock: (labelId: string | null | undefined, locked: boolean) => void;
  pruneLabelState: (ids: Set<string>) => void;
  reset: () => void;
}

export const useTextLabelUiStore = create<TextLabelUiState>((set) => ({
  hiddenRecognitionIds: {},
  lockedLabelIds: {},
  setRecognitionVisibility: (labelId, hidden) =>
    set((state) => {
      if (!labelId) {
        return state;
      }
      const next = { ...state.hiddenRecognitionIds };
      if (hidden) {
        next[labelId] = true;
      } else {
        delete next[labelId];
      }
      return { hiddenRecognitionIds: next };
    }),
  setLabelLock: (labelId, locked) =>
    set((state) => {
      if (!labelId) {
        return state;
      }
      const next = { ...state.lockedLabelIds };
      if (locked) {
        next[labelId] = true;
      } else {
        delete next[labelId];
      }
      return { lockedLabelIds: next };
    }),
  pruneLabelState: (ids) =>
    set((state) => {
      const nextHidden: Record<string, boolean> = {};
      Object.keys(state.hiddenRecognitionIds).forEach((key) => {
        if (ids.has(key)) {
          nextHidden[key] = true;
        }
      });
      const nextLocked: Record<string, boolean> = {};
      Object.keys(state.lockedLabelIds).forEach((key) => {
        if (ids.has(key)) {
          nextLocked[key] = true;
        }
      });
      return {
        hiddenRecognitionIds: nextHidden,
        lockedLabelIds: nextLocked,
      };
    }),
  reset: () => ({
    hiddenRecognitionIds: {},
    lockedLabelIds: {},
  }),
}));
