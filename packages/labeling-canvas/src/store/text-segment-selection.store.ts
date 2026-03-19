import { create } from 'zustand'
import type { TextSegmentSelection } from '../types/internal'

interface TextSegmentSelectionState {
  selectedSegment: TextSegmentSelection | null
  setSelectedSegment: (segment: TextSegmentSelection | null) => void
}

export const useTextSegmentSelectionStore = create<TextSegmentSelectionState>((set) => ({
  selectedSegment: null,
  setSelectedSegment(selectedSegment) {
    set({ selectedSegment })
  },
}))
