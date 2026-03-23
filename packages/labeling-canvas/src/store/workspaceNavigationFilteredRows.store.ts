import { create } from "zustand";

import type { LabelingRecordsTableRow } from "../components/LabelingRecordsTable";

interface WorkspaceNavigationFilteredRowsState {
  filteredRows: LabelingRecordsTableRow[];
  setFilteredRows: (rows: LabelingRecordsTableRow[]) => void;
  clearFilteredRows: () => void;
}

export const useWorkspaceNavigationFilteredRowsStore =
  create<WorkspaceNavigationFilteredRowsState>((set) => ({
    filteredRows: [],
    setFilteredRows: (rows) =>
      set((state) => {
        if (state.filteredRows === rows) {
          return state;
        }
        return { filteredRows: rows };
      }),
    clearFilteredRows: () => set({ filteredRows: [] }),
  }));

