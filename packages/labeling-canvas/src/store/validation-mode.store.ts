import { create } from 'zustand'

interface ValidationModeState {
  isValidationMode: boolean
  setValidationMode: (value: boolean) => void
  toggleValidationMode: () => void
}

export const useValidationModeStore = create<ValidationModeState>((set, get) => ({
  isValidationMode: false,
  setValidationMode(isValidationMode) {
    set({ isValidationMode })
  },
  toggleValidationMode() {
    set({ isValidationMode: !get().isValidationMode })
  },
}))
