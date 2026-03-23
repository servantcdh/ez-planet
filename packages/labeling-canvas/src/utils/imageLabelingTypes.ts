import { fabric } from "fabric";

import type { LabelInsertData } from "../types/domain";

export type FabricCanvas = fabric.Canvas & {
  lowerCanvasEl?: HTMLCanvasElement | null;
  upperCanvasEl?: HTMLCanvasElement | null;
};

export type FabricObservablePayload =
  | "load"
  | "selected"
  | "deleted"
  | "zoom"
  | "copy"
  | "paste"
  | "deleteSelected"
  | "selectAll"
  | "reset"
  | "combine"
  | "seq"
  | "addClass"
  | "deleteObjectsOfTool"
  | "addObjects"
  | "deselectAll"
  | "undo"
  | "redo"
  | "changed"
  | "blur"
  | "focus"
  | "init";

export type FabricObservableListener = (
  action: FabricObservablePayload,
  data?: ExternalEventData
) => void | Promise<void>;

export type CanvasExportJSON = {
  version: string;
  objects: LabeledFabricObject[];
};

export interface LabelExportObject {
  labelType?: string;
  left?: number;
  top?: number;
  hex?: string;
  fill?: string;
  alpha?: string;
  info?: string;
  unique?: string;
}

export type LabelingTool = {
  id: string;
  init: (...args: any[]) => Promise<(() => void) | undefined> | (() => void);
};

export type LabeledFabricObject = fabric.Object & {
  info?: string;
  unique?: string;
  hex?: string;
  alpha?: string;
  selected?: boolean;
  class?: string;
  added?: boolean;
  index?: number;
  seq?: number;
  copied?: boolean;
  combinded?: boolean;
  labeler?: string;
  undo?: boolean;
  redo?: boolean;
  passStack?: boolean;
  replaced?: boolean;
  trueLeft?: number;
  trueTop?: number;
  eraser?: fabric.BaseBrush | boolean;
  toHex?: string;
  _objects?: LabeledFabricObject[];
  [key: string]: unknown;
};

export type LabeledFabricImage = fabric.Image & LabeledFabricObject;
export type LabeledPolygon = fabric.Polygon & LabeledFabricObject;

export type FabricPointerEvent = fabric.IEvent<MouseEvent> & {
  pointer?: fabric.Point;
  absolutePointer?: fabric.Point;
  target?: LabeledFabricObject;
  deselected?: LabeledFabricObject[];
  e?: MouseEvent;
};

export interface ImageToolSelectionStore {
  undoStack: string[];
  redoStack: string[];
  setUndoStack: (stack: string[]) => void;
  setRedoStack: (stack: string[]) => void;
  setOveredUniques: (uniques: string[]) => void;
}

export interface ExternalEventData {
  uniques?: string[];
  unique?: string;
  selected?: boolean;
  objects?: LabeledFabricObject[];
  info?: string;
  callback?: (json: CanvasExportJSON | string) => void;
  direction?: ZoomPayload["direction"];
  level?: number;
  onChange?: ZoomPayload["onChange"];
  class?: string;
  hex?: string;
  opacity?: number;
  onDone?: () => void;
  imageWidth?: number;
  imageHeight?: number;
  canvasJSON?: CanvasExportJSON;
  seq?: Array<{ unique: string; seq: number }>;
  action?: string;
  point?: { x: number; y: number };
  labelInsertData?: LabelInsertData;
}

export interface GlobalInitParams {
  labeler: string;
  cvs: HTMLCanvasElement | string;
  width: number;
  height: number;
  readOnly: boolean;
  setCanvasJSON?: (json: CanvasExportJSON) => void;
  setSelectedObject: (objects: LabeledFabricObject[]) => void;
  addLabelObject: (
    object: LabeledFabricObject | Record<string, unknown>
  ) => void;
  addLabelObjects: (objects: LabeledFabricObject[]) => void;
  updateLabelObject: (objects: LabeledFabricObject[]) => void;
  deleteLabelObject: (object: LabeledFabricObject) => void;
  compareByObjects: (objects: LabeledFabricObject[]) => void;
  setObjects: (objects: LabeledFabricObject[]) => void;
  resetSegmentations?: () => void;
  selectedLayoutStyle?: {
    borderColor?: string;
    borderDashArray?: number[];
    borderScaleFactor?: number;
  };
  onDone: () => void;
}

export interface ZoomPayload {
  direction: 1 | 0 | -1;
  level: number;
  point?: { x: number; y: number };
  onChange: (payload: { level: number; width: number; height: number }) => void;
}

export interface BrushOptions {
  lineWidth: number;
  lineCap: CanvasLineCap | "round" | "square";
}

export interface BrushInitConfig {
  brush: BrushOptions;
  colorCode: string;
}

export interface SegmentAnythingCallbackPayload {
  point?: { x: number; y: number; maskInput: number };
  box?: { x1: number; y1: number; x2: number; y2: number };
}

export interface RectInitConfig {
  colorCode: string;
  callback?: (payload: SegmentAnythingCallbackPayload) => void;
}

export interface MagicBrushInitConfig {
  src: string;
  colorCode: string;
  brush: BrushOptions;
  magicbrushConfig: {
    threshold: number;
    radius: number;
  };
}

export interface SuperpixelInitConfig {
  src: string;
  colorCode: string;
  superpixelConfig: Record<string, number>;
  previousTool?: { id: string } | null;
}

export type CanvasJSON = CanvasExportJSON & {
  objects: LabeledFabricObject[];
};
