import type {
  Canvas as FabricCanvasType,
  FabricObject as FabricObjectType,
  FabricImage as FabricImageType,
  Polygon as PolygonType,
  TPointerEventInfo,
} from 'fabric'

// ─── Extended Fabric Object ───

export interface LabeledFabricObject extends FabricObjectType {
  info?: string
  unique?: string
  hex?: string
  alpha?: string
  selected?: boolean
  class?: string
  added?: boolean
  index?: number
  seq?: number
  copied?: boolean
  combinded?: boolean
  labeler?: string
  undo?: boolean
  redo?: boolean
  passStack?: boolean
  replaced?: boolean
  removed?: boolean
  trueLeft?: number
  trueTop?: number
  toHex?: string
  eraser?: unknown
  labelType?: string
  labelPayload?: Record<string, unknown>
  _objects?: LabeledFabricObject[]
  labelInsertData?: Record<string, unknown>
  [key: string]: unknown
}

export type LabeledFabricImage = FabricImageType & LabeledFabricObject

export type LabeledPolygon = PolygonType & LabeledFabricObject & {
  pathOffset: { x: number; y: number }
}

export type FabricCanvas = FabricCanvasType & {
  lowerCanvasEl?: HTMLCanvasElement | null
  upperCanvasEl?: HTMLCanvasElement | null
}

export type FabricPointerEvent = TPointerEventInfo<MouseEvent> & {
  pointer?: { x: number; y: number }
  absolutePointer?: { x: number; y: number }
  target?: LabeledFabricObject
  deselected?: LabeledFabricObject[]
  button?: number
  e?: MouseEvent
}

// ─── Label Events ───

export type LabelEventType =
  | 'load'
  | 'selected'
  | 'deleted'
  | 'zoom'
  | 'copy'
  | 'paste'
  | 'deleteSelected'
  | 'selectAll'
  | 'reset'
  | 'combine'
  | 'seq'
  | 'addClass'
  | 'deleteObjectsOfTool'
  | 'addObjects'
  | 'deselectAll'
  | 'undo'
  | 'redo'
  | 'changed'
  | 'blur'
  | 'focus'
  | 'init'

export interface LabelEventData {
  uniques?: string[]
  unique?: string
  selected?: boolean
  objects?: LabeledFabricObject[]
  info?: string
  canvasJSON?: CanvasExportJSON
  seq?: Array<{ unique: string; seq: number }>
  callback?: (json: CanvasExportJSON | string) => void
  direction?: ZoomPayload['direction']
  level?: number
  onChange?: ZoomPayload['onChange']
  class?: string
  hex?: string
  opacity?: number
  onDone?: () => void
  imageWidth?: number
  imageHeight?: number
  action?: string
  point?: { x: number; y: number }
  labelInsertData?: Record<string, unknown>
  [key: string]: unknown
}

export type LabelEventListener = (
  action: LabelEventType,
  data?: LabelEventData,
) => void | Promise<void>

export interface CanvasExportJSON {
  version: string
  objects: Record<string, unknown>[]
}

export interface CanvasJSON {
  version: string
  objects: LabeledFabricObject[]
}

// ─── Tool Types ───

export interface BrushOptions {
  lineCap: string
  lineWidth: number
}

export interface BrushInitConfig {
  brush: BrushOptions
  colorCode: string
}

export interface RectInitConfig {
  colorCode: string
  callback?: (payload: SegmentAnythingCallbackPayload) => void
}

export interface SegmentAnythingCallbackPayload {
  point?: { x: number; y: number; maskInput: number }
  box?: { x1: number; y1: number; x2: number; y2: number }
}

export interface MagicBrushInitConfig {
  src: string
  colorCode: string
  brush: BrushOptions
  magicbrushConfig: {
    threshold: number
    radius: number
  }
}

export interface SuperpixelInitConfig {
  src: string
  colorCode: string
  superpixelConfig: Record<string, number>
  previousTool?: { id: string } | null
}

export interface LabelingTool {
  id: string
  init: (...args: any[]) => Promise<(() => void) | void | undefined> | (() => void) | void
}

export interface ImageToolSelectionStore {
  undoStack: string[]
  redoStack: string[]
  setUndoStack: (stack: string[]) => void
  setRedoStack: (stack: string[]) => void
  setOveredUniques: (uniques: string[]) => void
}

// ─── Zoom ───

export interface ZoomPayload {
  direction: 1 | 0 | -1
  level: number
  point?: { x: number; y: number }
  onChange: (payload: { level: number; width: number; height: number }) => void
}

// ─── Global Init ───

// ─── Text/Number Tool Types ───

export interface TextLabelingTool {
  id: 'selection' | 'drag-segment'
  label: string
}

export interface NumberLabelingTool {
  id: 'selection' | 'drag-segment'
  label: string
}

// ─── Text Segment Selection ───

export interface TextSegmentSelection {
  key: string
  labelId: string | null
  tempId: string | null
  start: number
  end: number
  text: string
  color?: string
  opacity?: number
}

// ─── Number Segment Selection ───

export interface NumberSegmentSelection {
  key: string
  labelId: string | null
  tempId: string | null
  start: number
  end: number
  color?: string
  opacity?: number
}

// ─── Global Init ───

export interface GlobalInitParams {
  labeler: string
  cvs: HTMLCanvasElement | string
  width: number
  height: number
  readOnly: boolean
  setCanvasJSON?: (json: CanvasExportJSON) => void
  setSelectedObject: (objects: LabeledFabricObject[]) => void
  addLabelObject: (object: LabeledFabricObject | Record<string, unknown>) => void
  addLabelObjects: (objects: LabeledFabricObject[]) => void
  updateLabelObject: (objects: LabeledFabricObject[]) => void
  deleteLabelObject: (object: LabeledFabricObject) => void
  compareByObjects: (objects: LabeledFabricObject[]) => void
  setObjects: (objects: LabeledFabricObject[]) => void
  resetSegmentations?: () => void
  selectedLayoutStyle?: {
    borderColor?: string
    borderDashArray?: number[]
    borderScaleFactor?: number
  }
  onDone: () => void
}
