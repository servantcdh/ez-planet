import { create } from 'zustand'
import type { NumberSegmentSelection } from '../types/internal'

interface NumberSegmentSelectionState {
  selectedSegment: NumberSegmentSelection | null
  setSelectedSegment: (segment: NumberSegmentSelection | null) => void
}

export const useNumberSegmentSelectionStore = create<NumberSegmentSelectionState>((set) => ({
  selectedSegment: null,
  setSelectedSegment(selectedSegment) {
    set({ selectedSegment })
  },
}))
