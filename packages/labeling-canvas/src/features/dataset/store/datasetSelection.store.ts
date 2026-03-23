import { create } from "zustand";

interface DatasetSelectionState {
  selectedItems: string[];
  selectedContentSetId: string | null;
  selectedSchemaId: string | null;
  setSelectedItems: (items: string[]) => void;
  toggleItem: (item: string) => void;
  setSelectedContentSetId: (contentSetId: string | null) => void;
  setSelectedSchemaId: (schemaId: string | null) => void;
  clearAll: () => void;
}

export const useDatasetSelectionStore = create<DatasetSelectionState>(
  (set) => ({
    selectedItems: [],
    selectedContentSetId: null,
    selectedSchemaId: null,
    setSelectedItems: (items) => set({ selectedItems: items }),
    toggleItem: (item) =>
      set((state) => {
        const alreadySelected = state.selectedItems.includes(item);
        const nextItems = alreadySelected
          ? state.selectedItems.filter((i) => i !== item)
          : [...state.selectedItems, item];
        return { selectedItems: nextItems };
      }),
    setSelectedContentSetId: (contentSetId) =>
      set({ selectedContentSetId: contentSetId }),
    setSelectedSchemaId: (schemaId) => set({ selectedSchemaId: schemaId }),
    clearAll: () =>
      set({
        selectedItems: [],
        selectedContentSetId: null,
        selectedSchemaId: null,
      }),
  })
);
