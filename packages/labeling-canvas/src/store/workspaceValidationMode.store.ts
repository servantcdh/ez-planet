import { create } from "zustand";

interface WorkspaceValidationModeState {
  isValidationMode: boolean;
  setValidationMode: (value: boolean) => void;
  toggleValidationMode: () => void;
}

export const useWorkspaceValidationModeStore =
  create<WorkspaceValidationModeState>((set) => ({
    isValidationMode: false,
    setValidationMode: (value) => set({ isValidationMode: value }),
    toggleValidationMode: () =>
      set((state) => ({ isValidationMode: !state.isValidationMode })),
  }));
