import { create } from "zustand";

interface SuperPixelConfigStore {
  config: { regionSize: number; minRegionSize: number; maxIterations: number };
  setConfig: (config: {
    regionSize: number;
    minRegionSize: number;
    maxIterations: number;
  }) => void;
  reset: () => void;
}

export const useSuperPixelConfigStore = create<SuperPixelConfigStore>(
  (set) => ({
    config: {
      regionSize: 16,
      minRegionSize: 10,
      maxIterations: 10,
    },
    setConfig(config) {
      set({ config });
    },
    reset() {
      set({
        config: {
          regionSize: 16,
          minRegionSize: 10,
          maxIterations: 10,
        },
      });
    },
  })
);
