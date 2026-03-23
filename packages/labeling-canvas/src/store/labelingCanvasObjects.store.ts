import { create } from "zustand";

import type { LabeledFabricObject } from "../utils/imageLabelingTypes";

interface LabelingCanvasObjectsState {
  objects: LabeledFabricObject[];
  setObjects: (objects: LabeledFabricObject[]) => void;
}

export const useLabelingCanvasObjectsStore =
  create<LabelingCanvasObjectsState>((set) => ({
    objects: [],
    setObjects: (objects) => set({ objects }),
  }));

