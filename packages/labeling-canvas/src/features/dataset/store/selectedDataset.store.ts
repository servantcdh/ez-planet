import { create } from "zustand";

import type { VersionDTO } from "../types/domain";

interface SelectedDatasetState {
  selectedDatasetId: string | null;
  selectedDatasetIds: string[];
  focusedDatasetId: string | null;
  selectedDatasetCurrentVersion: string | null;
  selectedDatasetVersionList: VersionDTO[];
  selectDataset: (
    datasetId: string | null,
    versionList?: VersionDTO[],
    currentVersion?: string | null
  ) => void;
  setSelectedDatasetIds: (datasetIds: string[]) => void;
  toggleDatasetId: (datasetId: string) => void;
  clearSelection: () => void;
}

export const useSelectedDatasetStore = create<SelectedDatasetState>((set) => ({
  selectedDatasetId: null,
  selectedDatasetIds: [],
  focusedDatasetId: null,
  selectedDatasetCurrentVersion: null,
  selectedDatasetVersionList: [],
  selectDataset: (datasetId, versionList, currentVersion) =>
    set(() => ({
      selectedDatasetId: datasetId,
      focusedDatasetId: datasetId,
      selectedDatasetCurrentVersion: currentVersion ?? null,
      selectedDatasetVersionList: versionList ?? [],
    })),
  setSelectedDatasetIds: (datasetIds) =>
    set(() => ({
      selectedDatasetIds: datasetIds,
      selectedDatasetId: datasetIds.length === 1 ? datasetIds[0] : null,
      ...(datasetIds.length === 0 ? { focusedDatasetId: null } : {}),
      selectedDatasetVersionList: [],
      selectedDatasetCurrentVersion: null,
    })),
  toggleDatasetId: (datasetId) =>
    set((state) => {
      const exists = state.selectedDatasetIds.includes(datasetId);
      const nextIds = exists
        ? state.selectedDatasetIds.filter((id) => id !== datasetId)
        : [...state.selectedDatasetIds, datasetId];
      return {
        selectedDatasetIds: nextIds,
        selectedDatasetId: nextIds.length === 1 ? nextIds[0] : null,
        ...(nextIds.length === 0 ? { focusedDatasetId: null } : {}),
        selectedDatasetVersionList: [],
        selectedDatasetCurrentVersion: null,
      };
    }),
  clearSelection: () =>
    set({
      selectedDatasetId: null,
      selectedDatasetIds: [],
      focusedDatasetId: null,
      selectedDatasetVersionList: [],
      selectedDatasetCurrentVersion: null,
    }),
}));
