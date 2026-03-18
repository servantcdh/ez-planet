import { toHex } from '../colors'
import {
  EXCEPTION_TOOLS,
  TOOL_INFO_MAGIC_BRUSH,
} from '../constants'
import {
  ensureCanvas,
  getCanvasJSON,
  getFabric,
  getFabricImage,
  getMousePosition,
  getPoint,
  toEventHandler,
} from '../core'
import { createImage, cropAlphaArea } from '../image'
import type {
  LabelingTool,
  MagicBrushInitConfig,
} from '../../types/internal'
import { createBrushCursor } from './common'

// Note: MagicBrush (flood-fill / contour tracing) is expected to be provided
// by the host app via extension or injected at a higher level.
// For now, we keep a placeholder import path — the actual MagicBrush module
// will be bundled from the existing iris-web utility.
let MagicBrush: any = null

export const setMagicBrushModule = (module: any) => {
  MagicBrush = module
}

export const magicbrushTool = (): LabelingTool => {
  const init = async ({
    src,
    colorCode,
    brush,
    magicbrushConfig,
  }: MagicBrushInitConfig) => {
    if (!MagicBrush) {
      console.warn(
        '[@ez-planet/labeling-canvas] MagicBrush module not provided. Call setMagicBrushModule() first.',
      )
      return
    }

    const activeCanvas = ensureCanvas()
    const FabricImage = getFabricImage()
    const Point = getPoint()
    const fabric = getFabric()

    const renderAllSafe = () => {
      if (
        (activeCanvas as any).contextContainer
      ) {
        activeCanvas.renderAll()
      }
    }

    activeCanvas.defaultCursor = 'crosshair'
    activeCanvas.hoverCursor = 'crosshair'

    const { threshold, radius } = magicbrushConfig

    let baseImageData: ImageData | null = null
    let downPoint: { x: number; y: number } | null = null

    const img = await createImage(src)
    const { width, height } = img

    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) {
      return
    }
    ctx.canvas.width = width
    ctx.canvas.height = height
    ctx.drawImage(img, 0, 0)
    baseImageData = ctx.getImageData(0, 0, width, height)

    const normalizePoint = ({ x, y }: { x: number; y: number }) => ({
      x: Math.min(Math.max(Math.round(x), 0), width - 1),
      y: Math.min(Math.max(Math.round(y), 0), height - 1),
    })

    const convertMagicBrushToPolygon = async (object: any) => {
      const element = object.getElement()
      const innerCtx = document.createElement('canvas').getContext('2d')
      if (!element || !innerCtx) {
        return null
      }

      const naturalWidth =
        (element as HTMLImageElement).naturalWidth || element.width
      const naturalHeight =
        (element as HTMLImageElement).naturalHeight || element.height

      innerCtx.canvas.width = naturalWidth
      innerCtx.canvas.height = naturalHeight
      innerCtx.drawImage(element, 0, 0, naturalWidth, naturalHeight)

      const imageData = innerCtx.getImageData(0, 0, naturalWidth, naturalHeight).data
      const mask = new Uint8Array(naturalWidth * naturalHeight)
      let minX = naturalWidth
      let minY = naturalHeight
      let maxX = -1
      let maxY = -1

      for (let y = 0; y < naturalHeight; y += 1) {
        for (let x = 0; x < naturalWidth; x += 1) {
          const alpha = imageData[(y * naturalWidth + x) * 4 + 3]
          if (!alpha) continue
          mask[y * naturalWidth + x] = 1
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }

      innerCtx.canvas.remove()

      if (maxX < minX || maxY < minY) return null

      const contours = MagicBrush.traceContours({
        data: mask,
        width: naturalWidth,
        height: naturalHeight,
        bounds: { minX, minY, maxX, maxY },
      })
      const simplified = MagicBrush.simplifyContours(contours, 1, 6).filter(
        ({ points }: any) => points.length,
      )
      if (!simplified.length) return null

      const scaleX = object.scaleX ?? 1
      const scaleY = object.scaleY ?? 1
      const offsetLeft = object.left ?? 0
      const offsetTop = object.top ?? 0

      let globalMinX = Infinity
      let globalMinY = Infinity

      const scaledContours = simplified.map((contour: any) => {
        const scaledPoints = contour.points.map(({ x, y }: any) => {
          const px = x * scaleX
          const py = y * scaleY
          globalMinX = Math.min(globalMinX, px)
          globalMinY = Math.min(globalMinY, py)
          return new Point(px, py)
        })
        return { inner: contour.inner, points: scaledPoints }
      })

      if (!Number.isFinite(globalMinX) || !Number.isFinite(globalMinY)) return null

      const baseOffset = { x: globalMinX, y: globalMinY }
      const relativeContours = scaledContours
        .map((contour: any) => ({
          inner: contour.inner,
          points: contour.points.map(
            ({ x, y }: any) => new Point(x - baseOffset.x, y - baseOffset.y),
          ),
        }))
        .sort((a: any, b: any) => Number(a.inner) - Number(b.inner))

      const editableIndexRaw = relativeContours.findIndex(
        ({ inner }: any) => !inner,
      )
      const editableIndex = editableIndexRaw >= 0 ? editableIndexRaw : 0
      const editableContour = relativeContours[editableIndex] ?? relativeContours[0]
      const editablePoints =
        editableContour?.points.map(({ x, y }: any) => new Point(x, y)) ?? []

      const pathParts: string[] = []
      relativeContours.forEach(({ points }: any) => {
        if (!points.length) return
        const [first, ...rest] = points
        pathParts.push(`M ${first.x} ${first.y}`)
        rest.forEach(({ x, y }: any) => {
          pathParts.push(`L ${x} ${y}`)
        })
        pathParts.push('Z')
      })

      return new fabric.Path(pathParts.join(' '), {
        left: offsetLeft + baseOffset.x,
        top: offsetTop + baseOffset.y,
        originX: 'left',
        originY: 'top',
        objectCaching: false,
        selectable: false,
        evented: true,
        fillRule: 'evenodd',
        pathOffset: new Point(0, 0),
        points: editablePoints,
        pathContours: relativeContours,
        pathBaseOffset: baseOffset,
        pathEditableContourIndex: editableIndex,
        info: object.info ?? TOOL_INFO_MAGIC_BRUSH,
        fill: object.fill as string,
        hex: object.hex,
        alpha: object.alpha,
        index: object.index,
        class: object.class,
        unique: object.unique,
        labeler: object.labeler,
        combinded: object.combinded,
        lockMovementX: object.lockMovementX,
        lockMovementY: object.lockMovementY,
        passStack: true,
        replaced: true,
      } as any)
    }

    const drawMask = () => {
      if (!baseImageData || !downPoint) return

      const image = {
        data: baseImageData.data,
        width: baseImageData.width,
        height: baseImageData.height,
        bytes: 4,
      }

      const { x, y } = downPoint

      let mask = MagicBrush.floodFill(image, x, y, threshold)
      mask = MagicBrush.gaussBlurOnlyBorder(mask, radius)

      paint(mask, colorCode)
    }

    const paint = (
      mask: {
        data: Uint8Array
        bounds: { minY: number; maxY: number; minX: number; maxX: number }
        width: number
      },
      colorCodeValue: string,
    ) => {
      if (!baseImageData) return

      const toArray = (str: string) => {
        const sliced = str.substring(5)
        const values = sliced.substring(0, sliced.length - 1)
        const arr = values.split(',').map((value) => +value)
        arr[3] = Math.round(arr[3] * 255)
        return arr as [number, number, number, number]
      }

      const rgba = toArray(colorCodeValue)

      const tmpCanvas = document.createElement('canvas')
      const tmpCtx = tmpCanvas.getContext('2d')
      if (!tmpCtx) return
      tmpCtx.canvas.width = baseImageData.width
      tmpCtx.canvas.height = baseImageData.height

      const data = mask.data
      const bounds = mask.bounds
      const maskW = mask.width
      const w = baseImageData.width
      const h = baseImageData.height
      const curserAreaData = tmpCtx.createImageData(w, h)
      const res = curserAreaData.data

      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          if (data[y * maskW + x] === 0) continue
          const k = (y * w + x) * 4
          res[k] = rgba[0]
          res[k + 1] = rgba[1]
          res[k + 2] = rgba[2]
          res[k + 3] = rgba[3]
        }
      }

      tmpCanvas.remove()

      const { canvas, minX, minY } = cropAlphaArea(curserAreaData)
      addToCanvas(canvas, minX, minY)
    }

    const addToCanvas = async (
      tmpCanvas: HTMLCanvasElement,
      minX: number,
      minY: number,
    ) => {
      if (!downPoint) return
      const left = minX
      const top = minY
      const dataUrl = tmpCanvas.toDataURL()
      tmpCanvas.remove()

      // Fabric v6: fromURL returns Promise
      const image = await FabricImage.fromURL(dataUrl, {}, {
        left,
        top,
        objectCaching: false,
        selectable: false,
        info: TOOL_INFO_MAGIC_BRUSH,
        fill: colorCode,
        lockMovementX: true,
        lockMovementY: true,
      } as any)

      const { hex, alpha } = toHex(colorCode)
      ;(image as any).set({
        hex,
        alpha,
        evented: false,
        passStack: true,
        replaced: true,
      })

      activeCanvas.add(image)
      const polygon = await convertMagicBrushToPolygon(image)
      if (polygon) {
        activeCanvas.remove(image)
        activeCanvas.add(polygon)
        const canvasJsonObject = getCanvasJSON(activeCanvas)
        canvasJsonObject.objects = canvasJsonObject.objects.filter(
          ({ info }) => !EXCEPTION_TOOLS.includes(info ?? ''),
        )
        canvasJsonObject.objects.forEach((object) => (object.evented = false))
      }
    }

    const handleOnMouseDown = function (event: any) {
      const e = event.e as MouseEvent
      if (e?.button === 0) {
        downPoint = normalizePoint(getMousePosition(e))
        drawMask()
      }
    }

    const {
      brushCursor,
      handleOnMouseMove: handleOnCursorMove,
      handleOnMouseUp: handleOnCursorUp,
    } = createBrushCursor({ ...brush, lineCap: 'square' })

    const handleOnMouseUp = () => {
      handleOnCursorUp()
    }

    const handleOnMouseOver = function () {
      activeCanvas.add(brushCursor)
    }

    const handleOnMouseOut = function () {
      activeCanvas.remove(brushCursor)
    }

    activeCanvas.add(brushCursor)
    activeCanvas.on('mouse:over', toEventHandler(handleOnMouseOver))
    activeCanvas.on('mouse:out', toEventHandler(handleOnMouseOut))
    activeCanvas.on('mouse:down', toEventHandler(handleOnMouseDown))
    activeCanvas.on('mouse:move', toEventHandler(handleOnCursorMove))
    activeCanvas.on('mouse:up', toEventHandler(handleOnMouseUp))

    return () => {
      activeCanvas.remove(brushCursor)
      renderAllSafe()
      activeCanvas.off('mouse:over', toEventHandler(handleOnMouseOver))
      activeCanvas.off('mouse:out', toEventHandler(handleOnMouseOut))
      activeCanvas.off('mouse:down', toEventHandler(handleOnMouseDown))
      activeCanvas.off('mouse:move', toEventHandler(handleOnCursorMove))
      activeCanvas.off('mouse:up', toEventHandler(handleOnMouseUp))
    }
  }

  return { id: 'magic-wand', init }
}
