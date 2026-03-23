import { create } from "zustand";

export type LayerMode = [number, number] | [number];

export const ORIGIN_LAYER_INDEX = 0;
export const OVERLAY_LAYER_INDEX = 1;

export const LAYER_MODE: Record<string, LayerMode> = {
  NORMAL: [ORIGIN_LAYER_INDEX, OVERLAY_LAYER_INDEX],
  ONLY_ORIGIN: [ORIGIN_LAYER_INDEX],
  ONLY_OVERLAY: [OVERLAY_LAYER_INDEX],
};

const LAYER_MODE_SEQUENCE: LayerMode[] = [
  LAYER_MODE.NORMAL,
  LAYER_MODE.ONLY_ORIGIN,
  LAYER_MODE.ONLY_OVERLAY,
];

interface LayerModeState {
  mode: LayerMode;
  setMode: (mode: LayerMode) => void;
  cycleMode: () => void;
}

export const useLayerModeStore = create<LayerModeState>((set, get) => ({
  mode: LAYER_MODE.NORMAL,
  setMode: (mode) => set({ mode }),
  cycleMode: () => {
    const current = get().mode;
    const currentIndex = LAYER_MODE_SEQUENCE.findIndex(
      (item) => item.length === current.length && item.every((v, idx) => v === current[idx])
    );
    const next =
      currentIndex >= 0
        ? LAYER_MODE_SEQUENCE[(currentIndex + 1) % LAYER_MODE_SEQUENCE.length]
        : LAYER_MODE.NORMAL;
    set({ mode: next });
  },
}));
