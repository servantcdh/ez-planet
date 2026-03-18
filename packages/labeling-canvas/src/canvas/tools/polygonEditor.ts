import {
  TOOL_INFO_MAGIC_BRUSH,
  TOOL_INFO_SUPERPIXEL,
} from '../constants'
import {
  getControl,
  getFabric,
  getLabeledObjects,
  getPoint,
  getPolygon,
} from '../core'
import type { FabricCanvas, LabeledPolygon } from '../../types/internal'

type EditablePolygon = LabeledPolygon & {
  edit?: boolean
  pathContours?: Array<{ inner?: boolean; points: Array<{ x: number; y: number }> }>
  pathBaseOffset?: { x: number; y: number }
  pathEditableContourIndex?: number
  editSnapshot?: {
    dragIndex?: number
    absolutePoints: Array<{ x: number; y: number }>
  }
}

export const isEditablePolygon = (
  object: any,
): object is EditablePolygon => {
  if (!object) {
    return false
  }
  const Polygon = getPolygon()
  const fabric = getFabric()
  if (object instanceof Polygon) {
    return true
  }
  if (
    object instanceof fabric.Path &&
    [TOOL_INFO_SUPERPIXEL, TOOL_INFO_MAGIC_BRUSH].includes(
      (object as any).info ?? '',
    ) &&
    Array.isArray((object as any).points) &&
    Array.isArray((object as any).pathContours)
  ) {
    return true
  }
  return false
}

const updatePathFromPoints = (target: any) => {
  const fabric = getFabric()
  if (
    !(target instanceof fabric.Path) ||
    !Array.isArray((target as any).pathContours) ||
    !Array.isArray((target as any).points)
  ) {
    return
  }
  // Use `t` to avoid TS narrowing from instanceof stripping custom props
  const t = target as any
  const contours = t.pathContours as Array<{
    inner?: boolean
    points: Array<{ x: number; y: number }>
  }>
  const editableIndex = t.pathEditableContourIndex ?? 0
  if (!contours[editableIndex]) {
    return
  }
  const Point = getPoint()
  contours[editableIndex].points = (t.points as Array<{ x: number; y: number }>).map(
    ({ x, y }) => new Point(x, y),
  )

  const pathParts: string[] = []
  contours.forEach(({ points }) => {
    if (!points.length) {
      return
    }
    const [first, ...rest] = points
    pathParts.push(`M ${first.x} ${first.y}`)
    rest.forEach(({ x, y }) => {
      pathParts.push(`L ${x} ${y}`)
    })
    pathParts.push('Z')
  })

  const tmp = new fabric.Path(pathParts.join(' '))
  t.set({ path: (tmp as any).path })
  t.pathContours = contours
  t.dirty = true
  t.setCoords()
}

const getObjectSizeWithStroke = (object: LabeledPolygon) => {
  const Point = getPoint()
  const sw = object.strokeWidth ?? 0
  const sx = (object.strokeUniform ? 1 / (object.scaleX ?? 1) : 1) * sw
  const sy = (object.strokeUniform ? 1 / (object.scaleY ?? 1) : 1) * sw
  return new Point(
    Math.max((object.width ?? 0) + sx, 1),
    Math.max((object.height ?? 0) + sy, 1),
  )
}

const setPositionDimensions = (object: any) => {
  const fn = object._setPositionDimensions
  if (typeof fn === 'function') {
    fn.call(object, {})
  } else {
    object.setCoords()
  }
}

const pointInPolygon = (
  point: { x: number; y: number },
  vertices: Array<{ x: number; y: number }>,
) => {
  let inside = false
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x
    const yi = vertices[i].y
    const xj = vertices[j].x
    const yj = vertices[j].y
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x <
        ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersect) {
      inside = !inside
    }
  }
  return inside
}

const getPolygonArea = (vertices: Array<{ x: number; y: number }>) => {
  if (vertices.length < 3) {
    return 0
  }
  let sum = 0
  for (let i = 0; i < vertices.length; i += 1) {
    const { x: x1, y: y1 } = vertices[i]
    const { x: x2, y: y2 } = vertices[(i + 1) % vertices.length]
    sum += x1 * y2 - x2 * y1
  }
  return Math.abs(sum / 2)
}

const polygonPositionHandler = function (
  this: { pointIndex?: number },
  _dim: any,
  _finalMatrix: number[],
  fabricObject: EditablePolygon & { points: Array<{ x: number; y: number }> },
) {
  const Point = getPoint()
  const util = getFabric().util
  const point = fabricObject.points[this.pointIndex ?? 0]
  const x = point.x - fabricObject.pathOffset.x
  const y = point.y - fabricObject.pathOffset.y
  return util.transformPoint(
    new Point(x, y),
    util.multiplyTransformMatrices(
      fabricObject.canvas?.viewportTransform as any ?? [1, 0, 0, 1, 0, 0],
      fabricObject.calcTransformMatrix(),
    ),
  )
}

const getAbsolutePolygonPoints = (poly: EditablePolygon) => {
  const Point = getPoint()
  const util = getFabric().util
  if (!poly.points || !poly.pathOffset) {
    return [] as Array<{ x: number; y: number }>
  }
  const baseMatrix = poly.calcTransformMatrix()
  const matrix = poly.canvas?.viewportTransform
    ? util.multiplyTransformMatrices(poly.canvas.viewportTransform, baseMatrix)
    : baseMatrix
  return (poly as any).points.map((point: { x: number; y: number }) =>
    util.transformPoint(
      new Point(point.x - poly.pathOffset.x, point.y - poly.pathOffset.y),
      matrix,
    ),
  )
}

const actionHandler = function (
  _eventData: any,
  transform: any,
  x: number,
  y: number,
) {
  const Point = getPoint()
  const fabric = getFabric()
  const polygon = transform.target as EditablePolygon & { __corner?: string }
  if (!polygon || !polygon.points || !polygon.pathOffset) {
    return false
  }
  const currentControl = polygon.controls?.[
    polygon.__corner ?? ''
  ] as unknown as { pointIndex?: number } | undefined
  if (!currentControl) {
    return false
  }
  const pointIndex = currentControl.pointIndex ?? 0
  const mouseLocalPosition = (polygon as any).toLocalPoint(
    new Point(x, y),
    'center',
    'center',
  )
  const polygonBaseSize = getObjectSizeWithStroke(polygon)
  const size = (polygon as any)._getTransformedDimensions(0, 0)
  const finalPointPosition = {
    x:
      (mouseLocalPosition.x * polygonBaseSize.x) / size.x +
      polygon.pathOffset.x,
    y:
      (mouseLocalPosition.y * polygonBaseSize.y) / size.y +
      polygon.pathOffset.y,
  }
  ;(polygon as any).points[pointIndex] = finalPointPosition
  if (polygon instanceof fabric.Path) {
    updatePathFromPoints(polygon)
  }
  return true
}

const anchorWrapper = function (
  anchorIndex: number,
  fn: typeof actionHandler,
) {
  return function (
    _eventData: any,
    transform: any,
    x: number,
    y: number,
  ) {
    const Point = getPoint()
    const fabricObject = transform.target as EditablePolygon
    if (!fabricObject.points || !fabricObject.pathOffset) {
      return false
    }
    const controls = fabricObject.controls as
      | Record<string, any>
      | undefined
    const cornerKey =
      typeof fabricObject.__corner === 'string' ? fabricObject.__corner : ''
    const currentControl = controls?.[cornerKey] as
      | { pointIndex?: number }
      | undefined
    const movedIndex = currentControl?.pointIndex ?? anchorIndex
    const util = getFabric().util
    const absolutePoint = util.transformPoint(
      new Point(
        (fabricObject as any).points[anchorIndex].x - fabricObject.pathOffset.x,
        (fabricObject as any).points[anchorIndex].y - fabricObject.pathOffset.y,
      ),
      fabricObject.calcTransformMatrix(),
    )
    const actionPerformed = fn(_eventData, transform, x, y)
    const polygonBaseSize = getObjectSizeWithStroke(fabricObject)
    const newX =
      ((fabricObject as any).points[anchorIndex].x - fabricObject.pathOffset.x) /
      polygonBaseSize.x
    const newY =
      ((fabricObject as any).points[anchorIndex].y - fabricObject.pathOffset.y) /
      polygonBaseSize.y
    setPositionDimensions(fabricObject)
    ;(fabricObject as any).setPositionByOrigin(
      absolutePoint,
      newX + 0.5,
      newY + 0.5,
    )
    const editSnapshot = fabricObject.editSnapshot
    if (editSnapshot?.absolutePoints?.length) {
      const currentPoints = getAbsolutePolygonPoints(fabricObject)
      const deltas = currentPoints
        .map((point: { x: number; y: number }, index: number) => {
          if (index === movedIndex) {
            return null
          }
          const original = editSnapshot.absolutePoints[index]
          if (!original) {
            return null
          }
          return {
            dx: original.x - point.x,
            dy: original.y - point.y,
          }
        })
        .filter(
          (value: any): value is { dx: number; dy: number } => value !== null,
        )
      if (deltas.length) {
        const deltaX =
          deltas.reduce((sum: number, { dx }: { dx: number }) => sum + dx, 0) / deltas.length
        const deltaY =
          deltas.reduce((sum: number, { dy }: { dy: number }) => sum + dy, 0) / deltas.length
        if (deltaX !== 0 || deltaY !== 0) {
          fabricObject.set({
            left: (fabricObject.left ?? 0) + deltaX,
            top: (fabricObject.top ?? 0) + deltaY,
          })
          fabricObject.setCoords()
        }
      }
    }
    return actionPerformed
  }
}

const preparePathContourPoints = (
  poly: EditablePolygon,
  absolutePointer?: { x: number; y: number },
) => {
  const fabric = getFabric()
  const Point = getPoint()
  if (
    !(poly instanceof fabric.Path) ||
    !Array.isArray(poly.pathContours) ||
    !absolutePointer
  ) {
    return
  }
  const localPoint = (poly as any).toLocalPoint(
    new Point(absolutePointer.x, absolutePointer.y),
    'left',
    'top',
  )
  const candidates = poly.pathContours.map(
    ({ points }: { points: Array<{ x: number; y: number }> }, index: number) => ({
      index,
      inside: pointInPolygon(localPoint, points),
      distance: Math.min(
        ...points.map((p) =>
          Math.hypot(p.x - localPoint.x, p.y - localPoint.y),
        ),
      ),
      area: getPolygonArea(points),
    }),
  )
  const insideCandidates = candidates
    .filter(({ inside }: { inside: boolean }) => inside)
    .sort((a: { area: number }, b: { area: number }) => a.area - b.area)
  const pickedIndex =
    insideCandidates[0]?.index ??
    candidates.sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance)[0]?.index ??
    0
  poly.pathEditableContourIndex = pickedIndex
  const picked = poly.pathContours[pickedIndex]
  if (picked) {
    ;(poly as any).points = picked.points.map(
      ({ x, y }: { x: number; y: number }) => new Point(x, y),
    )
  }
}

const buildControls = (poly: EditablePolygon) => {
  const Control = getControl()
  const lastControl = ((poly as any).points?.length ?? 1) - 1
  poly.controls = ((poly as any).points ?? []).reduce(
    function (
      acc: Record<string, any>,
      _point: any,
      index: number,
    ) {
      const captureSnapshot = () => {
        poly.editSnapshot = {
          dragIndex: index,
          absolutePoints: getAbsolutePolygonPoints(poly),
        }
        return false
      }
      const clearSnapshot = () => {
        delete poly.editSnapshot
        return false
      }
      acc['p' + index] = new Control({
        positionHandler: polygonPositionHandler,
        actionHandler: anchorWrapper(
          index > 0 ? index - 1 : lastControl,
          actionHandler,
        ),
        actionName: 'editPolygon',
        pointIndex: index,
        mouseDownHandler: captureSnapshot,
        mouseUpHandler: clearSnapshot,
      } as any)
      return acc
    },
    {},
  )
}

const notifyPolygonEditingChange = (canvas: FabricCanvas, poly: EditablePolygon) => {
  const prevPassStack = poly.passStack
  poly.passStack = true
  canvas.fire('object:modified', { target: poly } as any)
  poly.passStack = prevPassStack
}

export const enablePolygonEditing = (
  canvas: FabricCanvas,
  target: any,
  absolutePointer?: { x: number; y: number },
) => {
  if (!target || !isEditablePolygon(target)) {
    resetPolygonEditing(canvas)
    return null
  }
  const poly = target as EditablePolygon
  if (!poly.edit) {
    preparePathContourPoints(poly, absolutePointer)
    poly.edit = true
    poly.cornerStyle = 'circle'
    buildControls(poly)
    poly.transparentCorners = false
    poly.hasBorders = false
  }
  resetPolygonEditing(canvas, poly)
  canvas.requestRenderAll()
  notifyPolygonEditingChange(canvas, poly)
  return poly
}

export const resetPolygonEditing = (
  canvas: FabricCanvas,
  target?: any,
) => {
  const FabricObject = getFabric().FabricObject
  getLabeledObjects(canvas).forEach((object) => {
    if (!target || ((object as any) !== target && target.edit)) {
      const poly = object as LabeledPolygon & { edit?: boolean }
      const wasEditing = poly.edit
      poly.edit = false
      poly.cornerStyle = 'rect'
      poly.controls = FabricObject.prototype.controls
      poly.hasBorders = true
      poly.transparentCorners = true
      delete (poly as EditablePolygon).editSnapshot
      if (wasEditing) {
        notifyPolygonEditingChange(canvas, poly)
      }
    }
  })
  canvas.requestRenderAll()
}
