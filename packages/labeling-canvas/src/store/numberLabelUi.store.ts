import { create } from "zustand";

export const NUMBER_CHART_TYPES = {
  LINE: "line",
  BAR: "bar",
} as const;

export type NumberChartType =
  (typeof NUMBER_CHART_TYPES)[keyof typeof NUMBER_CHART_TYPES];

interface NumberLabelUiState {
  hiddenSegmentIds: Record<string, boolean>;
  lockedLabelIds: Record<string, boolean>;
  chartType: NumberChartType;
  setSegmentVisibility: (
    labelId: string | null | undefined,
    hidden: boolean
  ) => void;
  setLabelLock: (labelId: string | null | undefined, locked: boolean) => void;
  setChartType: (chartType: NumberChartType) => void;
  pruneLabelState: (ids: Set<string>) => void;
  reset: () => void;
}

export const useNumberLabelUiStore = create<NumberLabelUiState>((set) => ({
  hiddenSegmentIds: {},
  lockedLabelIds: {},
  chartType: NUMBER_CHART_TYPES.LINE,
  setSegmentVisibility: (labelId, hidden) =>
    set((state) => {
      if (!labelId) {
        return state;
      }
      const next = { ...state.hiddenSegmentIds };
      if (hidden) {
        next[labelId] = true;
      } else {
        delete next[labelId];
      }
      return { hiddenSegmentIds: next };
    }),
  setLabelLock: (labelId, locked) =>
    set((state) => {
      if (!labelId) {
        return state;
      }
      const next = { ...state.lockedLabelIds };
      if (locked) {
        next[labelId] = true;
      } else {
        delete next[labelId];
      }
      return { lockedLabelIds: next };
    }),
  setChartType: (chartType) => set({ chartType }),
  pruneLabelState: (ids) =>
    set((state) => {
      const nextHidden: Record<string, boolean> = {};
      Object.keys(state.hiddenSegmentIds).forEach((key) => {
        if (ids.has(key)) {
          nextHidden[key] = true;
        }
      });
      const nextLocked: Record<string, boolean> = {};
      Object.keys(state.lockedLabelIds).forEach((key) => {
        if (ids.has(key)) {
          nextLocked[key] = true;
        }
      });
      return {
        hiddenSegmentIds: nextHidden,
        lockedLabelIds: nextLocked,
      };
    }),
  reset: () => ({
    hiddenSegmentIds: {},
    lockedLabelIds: {},
    chartType: NUMBER_CHART_TYPES.LINE,
  }),
}));
