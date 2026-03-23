import { create } from "zustand";

interface MagicBrushConfigStore {
  config: { threshold: number; radius: number };
  setConfig: (config: { threshold: number; radius: number }) => void;
  reset: () => void;
}

export const useMagicBrushConfigStore = create<MagicBrushConfigStore>(
  (set) => ({
    config: { threshold: 15, radius: 5 },
    setConfig(config) {
      set({ config });
    },
    reset() {
      set({ config: { threshold: 15, radius: 5 } });
    },
  })
);
