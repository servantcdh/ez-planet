import { create } from "zustand";

import type { LabeledFabricObject } from "../utils/imageLabelingTypes";

interface SelectedLabelObjectsState {
  objects: LabeledFabricObject[];
  setObjects: (objects: LabeledFabricObject[]) => void;
}

export const useSelectedLabelObjectsStore =
  create<SelectedLabelObjectsState>((set) => ({
    objects: [],
    setObjects: (objects) => set({ objects }),
  }));

