import { create } from 'zustand'

interface TextAutoHighlightState {
  english: boolean
  number: boolean
  special: boolean
  setEnglish: (value: boolean) => void
  setNumber: (value: boolean) => void
  setSpecial: (value: boolean) => void
  reset: () => void
}

export const useTextAutoHighlightStore = create<TextAutoHighlightState>((set) => ({
  english: false,
  number: false,
  special: false,
  setEnglish(english) {
    set({ english })
  },
  setNumber(number) {
    set({ number })
  },
  setSpecial(special) {
    set({ special })
  },
  reset() {
    set({ english: false, number: false, special: false })
  },
}))
