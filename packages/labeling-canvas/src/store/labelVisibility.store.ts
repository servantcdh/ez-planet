import { create } from "zustand";

interface LabelVisibilityState {
  hiddenClassificationIds: Record<string, boolean>;
  setClassificationVisibility: (
    labelId: string | null | undefined,
    hidden: boolean
  ) => void;
}

export const useLabelVisibilityStore = create<LabelVisibilityState>((set) => ({
  hiddenClassificationIds: {},
  setClassificationVisibility: (labelId, hidden) =>
    set((state) => {
      if (!labelId) {
        return state;
      }
      const next = { ...state.hiddenClassificationIds };
      if (hidden) {
        next[labelId] = true;
      } else {
        delete next[labelId];
      }
      return { hiddenClassificationIds: next };
    }),
}));


