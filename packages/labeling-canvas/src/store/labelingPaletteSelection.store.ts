import { create } from "zustand";

import { toRgba } from "../utils/imageLabelingTools";

interface LabelingPaletteStore {
  colorCode: string;
  setColorCode: (colorCode: string) => void;
}

interface LabelingOpacityStore {
  opacity: number;
  setOpacity: (opacity: number) => void;
}

interface LabelingBrushStore {
  brush: { id: number; lineCap: string; lineWidth: number };
  setBrush: (brush: { id: number; lineCap: string; lineWidth: number }) => void;
}

export const basicColors = [
  "#C21460",
  "#8601AF",
  "#4424D6",
  "#0247FE",
  "#347C98",
  "#66B032",
  "#B2D732",
  "#FEFE33",
  "#FCCC1A",
  "#FB9902",
  "#FC600A",
  "#FE2712",
];

export const usePaletteStore = create<LabelingPaletteStore>((set) => ({
  colorCode: toRgba(basicColors[basicColors.length - 1], 1),
  setColorCode(colorCode) {
    set({ colorCode });
  },
}));

export const useOpacityStore = create<LabelingOpacityStore>((set) => ({
  opacity: 1,
  setOpacity(opacity) {
    set({ opacity });
  },
}));

export const basicBrushes = [
  { id: 1, lineCap: "square", lineWidth: 5 },
  { id: 3, lineCap: "square", lineWidth: 10 },
  { id: 5, lineCap: "square", lineWidth: 20 },
  { id: 2, lineCap: "round", lineWidth: 5 },
  { id: 4, lineCap: "round", lineWidth: 10 },
  { id: 6, lineCap: "round", lineWidth: 20 },
];

export const useBrushStore = create<LabelingBrushStore>((set) => ({
  brush: basicBrushes[0],
  setBrush(brush) {
    set({ brush });
  },
}));
