import { create } from "zustand";

import type { LabelingRecordSelection } from "../types/recordSelection";

interface LabelingRecordSelectionState {
  selection: LabelingRecordSelection | null;
  setSelection: (selection: LabelingRecordSelection | null) => void;
  tableSelectedItems: string[];
  setTableSelectedItems: (items: string[]) => void;
}

export const useLabelingRecordSelectionStore =
  create<LabelingRecordSelectionState>((set) => ({
    selection: null,
    setSelection: (selection) => set({ selection }),
    tableSelectedItems: [],
    setTableSelectedItems: (items) => set({ tableSelectedItems: items }),
  }));
