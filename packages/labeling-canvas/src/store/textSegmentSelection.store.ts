import { create } from "zustand";

interface TextSegmentSelection {
  key: string;
  labelId: string | null;
  tempId: string | null;
  start: number;
  end: number;
  text: string;
  color?: string;
  opacity?: number;
}

interface TextSegmentSelectionState {
  selectedSegment: TextSegmentSelection | null;
  setSelectedSegment: (segment: TextSegmentSelection | null) => void;
}

export const useTextSegmentSelectionStore = create<TextSegmentSelectionState>(
  (set) => ({
    selectedSegment: null,
    setSelectedSegment: (segment) => set({ selectedSegment: segment }),
  })
);

