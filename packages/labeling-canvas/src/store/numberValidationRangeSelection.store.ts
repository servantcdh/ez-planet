import { create } from "zustand";

export interface NumberValidationRangeSelection {
  start: number;
  end: number;
  elementIds: string[];
}

interface NumberValidationRangeSelectionState {
  selection: NumberValidationRangeSelection | null;
  setSelection: (selection: NumberValidationRangeSelection | null) => void;
  clearSelection: () => void;
}

export const useNumberValidationRangeSelectionStore =
  create<NumberValidationRangeSelectionState>((set) => ({
    selection: null,
    setSelection: (selection) => set({ selection }),
    clearSelection: () => set({ selection: null }),
  }));
