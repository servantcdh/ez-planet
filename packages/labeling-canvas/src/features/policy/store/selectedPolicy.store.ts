import { create } from "zustand";

interface SelectedPolicyState {
  selectedPolicyId: string | null;
  selectedPolicyIds: string[];
  focusedClassId: string | null;
  focusedElementIndex: number | null;
  selectPolicy: (policyId: string | null) => void;
  setSelectedPolicyIds: (policyIds: string[]) => void;
  setFocusedClassId: (classId: string | null) => void;
  setFocusedElementIndex: (elementIndex: number | null) => void;
}

export const useSelectedPolicyStore = create<SelectedPolicyState>((set) => ({
  selectedPolicyId: null,
  selectedPolicyIds: [],
  focusedClassId: null,
  focusedElementIndex: null,
  selectPolicy: (policyId) => set({ selectedPolicyId: policyId }),
  setSelectedPolicyIds: (policyIds) => set({ selectedPolicyIds: policyIds }),
  setFocusedClassId: (classId) => set({ focusedClassId: classId }),
  setFocusedElementIndex: (elementIndex) =>
    set({ focusedElementIndex: elementIndex }),
}));
