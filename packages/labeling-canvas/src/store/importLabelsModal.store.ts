import { create } from "zustand";

interface ImportLabelsModalState {
  selectedVersion: string | null;
  setSelectedVersion: (version: string | null) => void;
  reset: () => void;
}

export const useImportLabelsModalStore = create<ImportLabelsModalState>(
  (set) => ({
    selectedVersion: null,
    setSelectedVersion: (version) => set({ selectedVersion: version }),
    reset: () => set({ selectedVersion: null }),
  })
);
