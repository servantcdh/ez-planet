import {
  SEGMENT_ANYTHING_MASKINPUT_NEGATIVE,
  SEGMENT_ANYTHING_MASKINPUT_POSITIVE,
  STROKE_WIDTH_BOUNDED_BOX,
  STROKE_WIDTH_SEGMENT_ANYTHING_BOX,
  TOOL_INFO_BOUNDED_BOX,
  TOOL_INFO_BRUSHCURSOR,
  TOOL_INFO_FILLED_BOX,
  TOOL_INFO_SEGMENT_ANYTHING_BOX,
} from '../constants'
import {
  emitLabelEvent,
  ensureCanvas,
  getCircle,
  getLastMousePosition,
  getLabeledObjects,
  getPointerWithZoom,
  getRect,
  renderAllSafe,
  toEventHandler,
} from '../core'
import type { BrushOptions, RectInitConfig } from '../../types/internal'

export const createBrushCursor = (brush: BrushOptions, colorCode?: string) => {
  const activeCanvas = ensureCanvas()
  const Circle = getCircle()
  const Rect = getRect()
  const lastMousePosition = getLastMousePosition()

  activeCanvas.remove(
    ...getLabeledObjects(activeCanvas).filter(
      ({ info }) => info === TOOL_INFO_BRUSHCURSOR,
    ),
  )

  const cursorConfig: any = {
    info: TOOL_INFO_BRUSHCURSOR,
    left: -100,
    top: -100,
    width: brush.lineWidth,
    height: brush.lineWidth,
    radius: brush.lineWidth / 2,
    ...(colorCode
      ? { fill: colorCode }
      : {
          fill: 'rgba(0, 0, 0, 0)',
          stroke: 'white',
          strokeWidth: 1.5,
          strokeDashArray: [3, 3],
        }),
    originX: 'center',
    originY: 'center',
    selectable: false,
  }

  const brushCursor =
    brush.lineCap === 'round'
      ? new Circle(cursorConfig)
      : new Rect(cursorConfig)

  const renderCursor = (e?: any) => {
    if (!e && !lastMousePosition.x) {
      return
    }
    const sourceEvent = e?.e as MouseEvent | undefined
    const { x, y } = sourceEvent
      ? activeCanvas.getScenePoint(sourceEvent)
      : lastMousePosition
    lastMousePosition.x = x
    lastMousePosition.y = y
    brushCursor.set({ top: y, left: x })
    brushCursor.setCoords()
    activeCanvas.renderAll()
  }

  const handleOnMouseMove = (e: any) => {
    renderCursor(e)
  }

  const handleOnMouseUp = () => {
    emitLabelEvent('init')
  }

  renderCursor()

  return { brushCursor, handleOnMouseMove, handleOnMouseUp }
}

export const getRectInit = (
  { colorCode, callback }: RectInitConfig,
  isBlank: boolean,
  isSegmentAnything = false,
) => {
  const activeCanvas = ensureCanvas()
  const Rect = getRect()

  if (isSegmentAnything) {
    isBlank = isSegmentAnything
    activeCanvas.getObjects().forEach((object) => object.set({ visible: false }))
    activeCanvas.renderAll()
  }

  let lastPointX = 0
  let lastPointY = 0

  const handleOnMouseDown = function (event: any) {
    const pointer = event.scenePoint ?? event.pointer
    if (!pointer) {
      return
    }
    const { x, y } = getPointerWithZoom(pointer)
    lastPointX = x
    lastPointY = y
  }

  const handleOnMouseUp = function (event: any) {
    const pointer = event.scenePoint ?? event.pointer
    if (!pointer) {
      return
    }
    const { x, y } = getPointerWithZoom(pointer)
    const diffX = x - lastPointX
    const diffY = y - lastPointY
    let width = Math.abs(diffX)
    let height = Math.abs(diffY)
    let left = diffX > 0 ? lastPointX : x
    let top = diffY > 0 ? lastPointY : y

    const hasOverLeft = left < 0
    const hasOverTop = top < 0

    width = hasOverLeft ? width + left : width
    height = hasOverTop ? height + top : height
    left = hasOverLeft ? 0 : left
    top = hasOverTop ? 0 : top

    const level = activeCanvas.getZoom()
    const canvasWidth = Number(activeCanvas.width ?? 0) / level
    const canvasHeight = Number(activeCanvas.height ?? 0) / level

    const hasOverWidth = left + width > canvasWidth
    const hasOverHeight = top + height > canvasHeight

    width = hasOverWidth ? width - (left + width - canvasWidth) : width
    height = hasOverHeight ? height - (top + height - canvasHeight) : height

    const rect =
      width && height
        ? new Rect({
            left,
            top,
            width,
            height,
            ...(isBlank
              ? {
                  fill: '',
                  stroke: colorCode,
                  strokeWidth: isSegmentAnything
                    ? STROKE_WIDTH_SEGMENT_ANYTHING_BOX
                    : STROKE_WIDTH_BOUNDED_BOX,
                  erasable: false,
                  info: isSegmentAnything
                    ? TOOL_INFO_SEGMENT_ANYTHING_BOX
                    : TOOL_INFO_BOUNDED_BOX,
                  ...(isSegmentAnything
                    ? {
                        strokeDashArray: [7, 5],
                        lockMovementX: true,
                        lockMovementY: true,
                      }
                    : {}),
                }
              : {
                  fill: colorCode,
                  info: TOOL_INFO_FILLED_BOX,
                }),
            objectCaching: false,
            selectable: false,
          } as any)
        : null

    if (isSegmentAnything && !rect && callback) {
      callback({
        point: { x, y, maskInput: SEGMENT_ANYTHING_MASKINPUT_POSITIVE },
      })
    }

    if (isSegmentAnything && rect && callback) {
      const x1 = Number(left ?? 0)
      const y1 = Number(top ?? 0)
      const x2 = x1 + width
      const y2 = y1 + height
      callback({ box: { x1, y1, x2, y2 } })
    }

    if (rect) {
      activeCanvas.add(rect)
    }
  }

  const handleOnContextMenu = function (e: MouseEvent) {
    e.preventDefault()
    const { x, y } = getPointerWithZoom({ x: e.offsetX, y: e.offsetY })
    if (
      e.target &&
      (e.target as HTMLElement).localName === 'canvas' &&
      callback
    ) {
      callback({
        point: { x, y, maskInput: SEGMENT_ANYTHING_MASKINPUT_NEGATIVE },
      })
    }
  }

  activeCanvas.defaultCursor = 'crosshair'
  activeCanvas.hoverCursor = isSegmentAnything ? 'crosshair' : 'default'
  activeCanvas.selection = true
  activeCanvas.on('mouse:down', toEventHandler(handleOnMouseDown))
  activeCanvas.on('mouse:up', toEventHandler(handleOnMouseUp))
  if (isSegmentAnything) {
    document.addEventListener('contextmenu', handleOnContextMenu)
  }

  return () => {
    activeCanvas.defaultCursor = 'default'
    activeCanvas.selection = false
    activeCanvas.off('mouse:down', toEventHandler(handleOnMouseDown))
    activeCanvas.off('mouse:up', toEventHandler(handleOnMouseUp))
    if (isSegmentAnything) {
      document.removeEventListener('contextmenu', handleOnContextMenu)
      activeCanvas.remove(
        ...getLabeledObjects(activeCanvas).filter(
          ({ info }) => info === TOOL_INFO_SEGMENT_ANYTHING_BOX,
        ),
      )
      getLabeledObjects(activeCanvas).forEach((object) =>
        object.set({ visible: true }),
      )
    }
    renderAllSafe(activeCanvas)
  }
}
