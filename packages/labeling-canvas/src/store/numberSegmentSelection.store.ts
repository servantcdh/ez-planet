import { create } from "zustand";

interface NumberSegmentSelection {
  key: string;
  labelIds: string[];
  tempIds: string[];
  start: number;
  end: number;
  color?: string;
  opacity?: number;
  zindex?: number;
  policyId?: string | null;
  classIndex?: number;
  className?: string;
  columnName?: string;
}

interface NumberSegmentSelectionState {
  selectedSegment: NumberSegmentSelection | null;
  setSelectedSegment: (segment: NumberSegmentSelection | null) => void;
}

export const useNumberSegmentSelectionStore =
  create<NumberSegmentSelectionState>((set) => ({
    selectedSegment: null,
    setSelectedSegment: (segment) => set({ selectedSegment: segment }),
  }));
