/**
 * Canvas Core — Fabric v6 initialization, event system, and utility functions.
 *
 * Uses dynamic import for SSR safety: `await import('fabric')`.
 * All Fabric classes are re-exported after lazy initialization.
 */
import { EXPORT_PROPS } from './constants'
import type {
  CanvasExportJSON,
  CanvasJSON,
  FabricCanvas,
  FabricPointerEvent,
  LabeledFabricImage,
  LabeledFabricObject,
  LabeledPolygon,
  LabelEventData,
  LabelEventListener,
  LabelEventType,
} from '../types/internal'

// ─── Lazy Fabric Imports (SSR-safe) ───

let fabricModule: typeof import('fabric') | null = null

export const loadFabric = async () => {
  if (!fabricModule) {
    fabricModule = await import('fabric')
  }
  return fabricModule
}

export const getFabric = () => {
  if (!fabricModule) {
    throw new Error(
      'Fabric has not been loaded. Call loadFabric() first (async).',
    )
  }
  return fabricModule
}

// ─── Fabric Class Accessors (use after loadFabric) ───

export const getCanvas = () => getFabric().Canvas
export const getPoint = () => getFabric().Point
export const getPath = () => getFabric().Path
export const getLine = () => getFabric().Line
export const getRect = () => getFabric().Rect
export const getPolygon = () => getFabric().Polygon
export const getPencilBrush = () => getFabric().PencilBrush
export const getCircle = () => getFabric().Circle
export const getActiveSelection = () => getFabric().ActiveSelection
export const getFabricObject = () => getFabric().FabricObject
export const getFabricImage = () => getFabric().FabricImage
export const getControl = () => getFabric().Control
export const getStaticCanvas = () => getFabric().StaticCanvas
export const getUtil = (): any => getFabric().util

// ─── Canvas Singleton ───

let canvas: FabricCanvas = null as unknown as FabricCanvas
let objects: LabeledFabricObject[] = []
let isDoing = false
let timeoutRef: ReturnType<typeof setTimeout> | null = null

let lastMousePosition = { x: 0, y: 0 }
let movedMousePosition = { x: 0, y: 0 }

export const getCanvasInstance = () => canvas
export const setCanvasInstance = (instance: FabricCanvas | null) => {
  canvas = instance as FabricCanvas
}

export const getObjects = () => objects
export const setObjects = (values: LabeledFabricObject[]) => {
  objects = values
}

export const getIsDoing = () => isDoing
export const setIsDoing = (flag: boolean) => {
  isDoing = flag
}

export const getTimeoutRef = () => timeoutRef
export const setTimeoutRef = (ref: ReturnType<typeof setTimeout> | null) => {
  timeoutRef = ref
}

export const getLastMousePosition = () => lastMousePosition
export const getMovedMousePosition = () => movedMousePosition

export const resetMousePositions = () => {
  lastMousePosition = { x: 0, y: 0 }
  movedMousePosition = { x: 0, y: 0 }
}

export const ensureCanvas = (): FabricCanvas => {
  if (!canvas) {
    throw new Error('Canvas has not been initialized.')
  }
  return canvas
}

// ─── Label Event System ───

const LABEL_EVENTS: LabelEventType[] = [
  'load',
  'selected',
  'deleted',
  'zoom',
  'copy',
  'paste',
  'deleteSelected',
  'selectAll',
  'reset',
  'combine',
  'seq',
  'addClass',
  'deleteObjectsOfTool',
  'addObjects',
  'deselectAll',
  'undo',
  'redo',
  'changed',
  'blur',
  'focus',
  'init',
]

export const subscribeLabelEvents = (listener: LabelEventListener) => {
  const target = getCanvasInstance()
  if (!target) {
    return () => undefined
  }

  const handlers = LABEL_EVENTS.map((action) => {
    const eventName = `label:${action}`
    const handler = (event: any) => {
      listener(action, (event as { data?: LabelEventData }).data)
    }
    ;(target as any).on(eventName, handler)
    return { eventName, handler }
  })

  return () => {
    handlers.forEach(({ eventName, handler }) => {
      ;(target as any).off(eventName, handler)
    })
  }
}

export const emitLabelEvent = (
  action: LabelEventType,
  data?: LabelEventData,
) => {
  const target = getCanvasInstance()
  if (!target) {
    return
  }
  ;(target as any).fire(`label:${action}`, { data })
}

// ─── Canvas JSON Helpers ───

export const createCanvasJSON = (
  targetObjects: LabeledFabricObject[] = [],
  version = '6.0.0',
): CanvasJSON => ({
  version,
  objects: targetObjects,
})

// ─── Type Cast Helpers ───

export const toLabeledObject = (object: any): LabeledFabricObject =>
  object as LabeledFabricObject

export const toLabeledImage = (image: any): LabeledFabricImage =>
  image as LabeledFabricImage

export const toLabeledPolygon = (polygon: any): LabeledPolygon =>
  polygon as LabeledPolygon

export const toLabeledObjects = (
  items: any[],
): LabeledFabricObject[] => items as LabeledFabricObject[]

export const getLabeledObjects = (
  targetCanvas: FabricCanvas = ensureCanvas(),
) => toLabeledObjects(targetCanvas.getObjects())

export const getActiveLabeledObjects = (
  targetCanvas: FabricCanvas = ensureCanvas(),
) => targetCanvas.getActiveObjects() as LabeledFabricObject[]

export const toLabeledCanvasJSON = (json: CanvasExportJSON): CanvasJSON => ({
  ...json,
  objects: toLabeledObjects(json.objects as any[]),
})

export const getCanvasJSON = (
  targetCanvas: FabricCanvas = ensureCanvas(),
): CanvasJSON =>
  toLabeledCanvasJSON((targetCanvas as any).toJSON(EXPORT_PROPS) as CanvasExportJSON)

// ─── Event Handler Helpers ───

export const wrapPointerHandler =
  (handler: (event: FabricPointerEvent) => void) =>
  (event: any) =>
    handler(event as FabricPointerEvent)

export const toEventHandler = (handler: any): ((...args: any[]) => void) =>
  handler as (...args: any[]) => void

// ─── Pointer / Zoom Helpers ───

const safeDivide = (a: number, b: number): number =>
  b === 0 ? 0 : a / b

export const getPointerWithZoom = ({ x, y }: { x: number; y: number }) => {
  const activeCanvas = ensureCanvas()
  const level = activeCanvas.getZoom()
  return { x: safeDivide(x, level), y: safeDivide(y, level) }
}

export const getOffset = (el: HTMLElement) => {
  if (el.localName !== 'canvas') {
    return { top: 0, left: 0 }
  }
  const activeCanvas = ensureCanvas()
  const level = activeCanvas.getZoom()
  const { top, left } = el.getBoundingClientRect()
  const scrollLeft = document.documentElement.scrollLeft
  const scrollTop = document.documentElement.scrollTop
  return {
    top: safeDivide(top, level) + scrollTop,
    left: safeDivide(left, level) + scrollLeft,
  }
}

export const getMousePosition = (e: MouseEvent) => {
  return getPointerWithZoom({
    x: e.offsetX,
    y: e.offsetY,
  })
}

// ─── Render Helper ───

export const renderAllSafe = (targetCanvas?: FabricCanvas) => {
  const c = targetCanvas ?? canvas
  if (
    c &&
    (c as unknown as { contextContainer?: CanvasRenderingContext2D | null })
      .contextContainer
  ) {
    c.renderAll()
  }
}
