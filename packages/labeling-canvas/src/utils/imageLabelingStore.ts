import { useImageTypeLabelingToolSelectionStore } from "../store/imageTypeLabelingToolSelection.store";
import type { ImageToolSelectionStore } from "./imageLabelingTypes";

export const getImageToolSelectionStore = (): ImageToolSelectionStore =>
  useImageTypeLabelingToolSelectionStore.getState() as ImageToolSelectionStore;
