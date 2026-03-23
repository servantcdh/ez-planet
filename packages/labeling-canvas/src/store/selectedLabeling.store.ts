import { create } from "zustand";

interface SelectedLabelingState {
  selectedLabelingId: string | null;
  selectLabeling: (labelingId: string | null) => void;
}

export const useSelectedLabelingStore = create<SelectedLabelingState>((set) => ({
  selectedLabelingId: null,
  selectLabeling: (labelingId) => set({ selectedLabelingId: labelingId }),
}));
