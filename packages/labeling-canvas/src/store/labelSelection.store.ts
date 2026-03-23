import { create } from "zustand";

interface SelectedClassificationInfo {
  policyId?: string | null;
  classIndex?: number | null;
  className?: string | null;
  labelId?: string | null;
  tempId?: string | null;
  isCanvasFocused?: boolean;
}

interface LabelSelectionState {
  selectedClassificationId: string | null;
  selectedClassificationInfo: SelectedClassificationInfo | null;
  setSelectedClassificationId: (
    id: string | null,
    info?: SelectedClassificationInfo | null
  ) => void;
}

export const useLabelSelectionStore = create<LabelSelectionState>((set) => ({
  selectedClassificationId: null,
  selectedClassificationInfo: null,
  setSelectedClassificationId: (id, info = null) =>
    set({
      selectedClassificationId: id,
      selectedClassificationInfo: info,
    }),
}));
