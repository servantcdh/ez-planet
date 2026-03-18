/**
 * Serializer — bidirectional conversion between Fabric objects and Annotations.
 *
 * Fabric Object → Annotation (for onChange output)
 * Annotation → Fabric Object (for loading annotations into canvas)
 */
import { toHex, toRgba } from './colors'
import {
  EXPORT_PROPS,
  TOOL_INFO_BOUNDED_BOX,
  TOOL_INFO_FILLED_BOX,
} from './constants'
import {
  getStaticCanvas,
} from './core'
import type {
  LabeledFabricObject,
} from '../types/internal'
import type {
  Annotation,
  AnnotationGeometry,
  AnnotationStyle,
  AnnotationType,
  BoxGeometry,
  SegmentationGeometry,
} from '../types/public'

// ─── Constants ───

const BOUNDING_BOX_INFOS = new Set([TOOL_INFO_BOUNDED_BOX, TOOL_INFO_FILLED_BOX])

// ─── Helpers ───

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const toPositiveScale = (value?: unknown): number => {
  if (isFiniteNumber(value) && value !== 0) {
    return Math.abs(value)
  }
  return 1
}

const getNumber = (value: unknown, fallback = 0) =>
  isFiniteNumber(value) ? value : fallback

const ensureHexPrefix = (value?: string): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 7 || trimmed.length === 9) {
      return trimmed
    }
    const { hex } = toHex(trimmed)
    return `#${hex}`
  }
  const { hex } = toHex(trimmed)
  return `#${hex}`
}

const resolveColorHex = (
  object: LabeledFabricObject,
  source: 'fill' | 'stroke' | 'hex',
): string | undefined => {
  if (source === 'fill' && typeof object.fill === 'string') {
    return ensureHexPrefix(object.fill)
  }
  if (source === 'stroke' && typeof object.stroke === 'string') {
    return ensureHexPrefix(object.stroke as string)
  }
  if (source === 'hex' && typeof object.hex === 'string' && object.hex.length) {
    return ensureHexPrefix(`#${object.hex}`)
  }
  return undefined
}

// ─── Fabric Object → Annotation ───

const inferAnnotationType = (object: LabeledFabricObject): AnnotationType => {
  const info = object.info ?? ''
  if (BOUNDING_BOX_INFOS.has(info)) return 'box'
  return 'segmentation'
}

const buildBoxGeometry = (
  object: LabeledFabricObject,
  imageWidth: number,
  imageHeight: number,
): BoxGeometry => {
  const left = getNumber(object.left)
  const top = getNumber(object.top)
  const width = getNumber(object.width)
  const height = getNumber(object.height)
  const scaleX = toPositiveScale(object.scaleX)
  const scaleY = toPositiveScale(object.scaleY)
  const actualWidth = width * scaleX
  const actualHeight = height * scaleY

  return {
    type: 'box',
    x: imageWidth > 0 ? left / imageWidth : left,
    y: imageHeight > 0 ? top / imageHeight : top,
    width: imageWidth > 0 ? Math.max(actualWidth, 0) / imageWidth : actualWidth,
    height: imageHeight > 0 ? Math.max(actualHeight, 0) / imageHeight : actualHeight,
  }
}

const cloneObject = (
  object: LabeledFabricObject,
): Promise<LabeledFabricObject> => {
  return object.clone(EXPORT_PROPS).then((cloned: any) => {
    return (cloned as LabeledFabricObject) ?? object
  })
}

const exportSegmentationDataUrl = async (
  object: LabeledFabricObject,
): Promise<string | null> => {
  if (typeof document === 'undefined') return null

  const rect = object.getBoundingRect()
  const width = Math.max(
    1,
    Math.round(rect?.width ?? (object.width ?? 0) * toPositiveScale(object.scaleX)),
  )
  const height = Math.max(
    1,
    Math.round(rect?.height ?? (object.height ?? 0) * toPositiveScale(object.scaleY)),
  )

  const StaticCanvas = getStaticCanvas()
  const canvasElement = document.createElement('canvas')
  canvasElement.width = width
  canvasElement.height = height

  const staticCanvas = new StaticCanvas(canvasElement, {
    width,
    height,
    renderOnAddRemove: false,
  })

  const cloned = await cloneObject(object)
  const offsetLeft = rect?.left ?? 0
  const offsetTop = rect?.top ?? 0
  cloned.set({
    left: (cloned.left ?? 0) - offsetLeft,
    top: (cloned.top ?? 0) - offsetTop,
  })
  staticCanvas.add(cloned)
  staticCanvas.renderAll()

  const dataUrl = staticCanvas.toDataURL({ format: 'png', multiplier: 1 })
  staticCanvas.dispose()
  canvasElement.remove()
  return dataUrl
}

const buildSegmentationGeometry = async (
  object: LabeledFabricObject,
): Promise<SegmentationGeometry | null> => {
  const dataUrl = await exportSegmentationDataUrl(object)
  if (!dataUrl) return null
  const [, base64] = dataUrl.split(',')
  if (!base64) return null

  const segVector = JSON.stringify(object.toObject(EXPORT_PROPS))

  return {
    type: 'segmentation',
    mask: base64,
    vector: segVector,
  }
}

const buildAnnotationStyle = (object: LabeledFabricObject): AnnotationStyle => {
  const color =
    resolveColorHex(object, 'fill') ??
    resolveColorHex(object, 'hex') ??
    '#000000'
  const opacity = isFiniteNumber(object.opacity) ? object.opacity : 1
  const lineColor = resolveColorHex(object, 'stroke')
  const zIndex = isFiniteNumber(object.seq) ? object.seq : undefined

  return { color, opacity, lineColor, zIndex }
}

/**
 * Convert a Fabric object to an Annotation.
 */
export const fabricObjectToAnnotation = async (
  object: LabeledFabricObject,
  imageWidth: number,
  imageHeight: number,
): Promise<Annotation | null> => {
  const id = object.unique ?? ''
  if (!id) return null

  const type = inferAnnotationType(object)
  let geometry: AnnotationGeometry | null = null

  if (type === 'box') {
    geometry = buildBoxGeometry(object, imageWidth, imageHeight)
  } else {
    geometry = await buildSegmentationGeometry(object)
  }

  const style = buildAnnotationStyle(object)
  const label = {
    name: (object.class as string) ?? '',
    index: isFiniteNumber(object.seq) ? object.seq : 0,
  }

  return { id, type, label, style, geometry }
}

/**
 * Convert all canvas objects to Annotations.
 */
export const canvasToAnnotations = async (
  objects: LabeledFabricObject[],
  imageWidth: number,
  imageHeight: number,
): Promise<Annotation[]> => {
  const results: Annotation[] = []
  for (const object of objects) {
    const annotation = await fabricObjectToAnnotation(object, imageWidth, imageHeight)
    if (annotation) {
      results.push(annotation)
    }
  }
  return results
}

// ─── Annotation → Fabric Object ───

/**
 * Convert an Annotation back to Fabric object options (for canvas loading).
 * This creates the configuration that can be used with Fabric's enlivenObjects.
 */
export const annotationToFabricProps = (
  annotation: Annotation,
  imageWidth: number,
  imageHeight: number,
): Record<string, unknown> => {
  const { id, type, label, style, geometry } = annotation

  const base: Record<string, unknown> = {
    unique: id,
    class: label.name,
    seq: label.index,
    hex: style.color.replace('#', ''),
    alpha: `${Math.round(style.opacity * 100)}%`,
    opacity: style.opacity,
    objectCaching: false,
    selectable: false,
    evented: true,
  }

  if (style.lineColor) {
    base.stroke = style.lineColor
  }

  if (type === 'box' && geometry?.type === 'box') {
    const boxGeo = geometry as BoxGeometry
    return {
      ...base,
      type: 'rect',
      left: boxGeo.x * imageWidth,
      top: boxGeo.y * imageHeight,
      width: boxGeo.width * imageWidth,
      height: boxGeo.height * imageHeight,
      fill: style.lineColor ? '' : toRgba(style.color.replace('#', ''), style.opacity),
      stroke: style.lineColor ?? undefined,
      info: style.lineColor ? TOOL_INFO_BOUNDED_BOX : TOOL_INFO_FILLED_BOX,
    }
  }

  if (type === 'segmentation' && geometry?.type === 'segmentation') {
    const segGeo = geometry as SegmentationGeometry
    if (segGeo.vector) {
      try {
        return {
          ...base,
          ...JSON.parse(segGeo.vector),
          unique: id,
        }
      } catch {
        // Fall through to base64 loading
      }
    }
    return {
      ...base,
      type: 'image',
      src: `data:image/png;base64,${segGeo.mask}`,
    }
  }

  return base
}
