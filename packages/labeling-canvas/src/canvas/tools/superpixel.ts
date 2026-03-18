import { toHex, toRgbaArray } from '../colors'
import {
  TOOL_INFO_SUPERPIXEL,
  TOOL_INFO_SUPERPIXEL_BOUNDARY,
} from '../constants'
import {
  ensureCanvas,
  getFabric,
  getFabricImage,
  getLabeledObjects,
  getMousePosition,
  getPoint,
  toEventHandler,
} from '../core'
import { createImage, cropAlphaArea } from '../image'
import type {
  LabeledFabricImage,
  LabelingTool,
  SuperpixelInitConfig,
} from '../../types/internal'

// SLIC and MagicBrush modules — injected by host app
let SLIC: any = null
let MagicBrush: any = null

export const setSuperpixelModules = (modules: {
  SLIC: any
  MagicBrush: any
}) => {
  SLIC = modules.SLIC
  MagicBrush = modules.MagicBrush
}

export const superpixelTool = (): LabelingTool => {
  const init = async ({
    src,
    colorCode,
    superpixelConfig: config,
    previousTool,
  }: SuperpixelInitConfig) => {
    if (!SLIC || !MagicBrush) {
      console.warn(
        '[@ez-planet/labeling-canvas] SLIC/MagicBrush modules not provided. Call setSuperpixelModules() first.',
      )
      return
    }

    const activeCanvas = ensureCanvas()
    const FabricImage = getFabricImage()
    const Point = getPoint()
    const fabric = getFabric()

    activeCanvas.defaultCursor = 'crosshair'
    activeCanvas.hoverCursor = 'crosshair'

    const isInit = !previousTool || previousTool.id !== 'superpixel'

    const img = await createImage(src) as HTMLImageElement
    const { width, height } = img

    const existingObject = getLabeledObjects(activeCanvas)
      .filter(({ info }) => info === TOOL_INFO_SUPERPIXEL)
      .pop()

    const baseIndex = (existingObject as any)?.index ?? 0
    const index = isInit ? baseIndex + 1 : baseIndex

    const ctx = document.createElement('canvas').getContext('2d')
    if (!ctx) return
    ctx.canvas.width = width
    ctx.canvas.height = height

    const boundaryLayer = document.createElement('canvas').getContext('2d')
    if (!boundaryLayer) return
    boundaryLayer.canvas.width = width
    boundaryLayer.canvas.height = height

    const annotationLayer = document.createElement('canvas').getContext('2d')
    if (!annotationLayer) return
    annotationLayer.canvas.width = width
    annotationLayer.canvas.height = height

    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, width, height)

    const slic = new SLIC(imageData, config)
    const maskImageData = slic.result
    slic.createPixelIndex(maskImageData)

    boundaryLayer.putImageData(maskImageData, 0, 0)
    const boundaryImageData = boundaryLayer.getImageData(0, 0, width, height)
    slic.computeEdgemap(boundaryImageData)

    ctx.clearRect(0, 0, width, height)
    ctx.putImageData(boundaryImageData, 0, 0)

    const dataUrl = ctx.canvas.toDataURL()
    ctx.canvas.remove()

    let timeout: ReturnType<typeof setTimeout> | null = setTimeout(async () => {
      if (timeout) clearTimeout(timeout)
      timeout = null
      const image = await FabricImage.fromURL(dataUrl, {}, {
        left: 0,
        top: 0,
        objectCaching: false,
        selectable: false,
        info: TOOL_INFO_SUPERPIXEL_BOUNDARY,
      } as any)
      activeCanvas.add(image)
    }, 1)

    let isDraggingMode = false
    let superpixelIndex: number | null = null
    let currentSuperpixel: LabeledFabricImage | null = null

    const normalizePoint = ({ x, y }: { x: number; y: number }) => ({
      x: Math.min(Math.max(Math.round(x), 0), width - 1),
      y: Math.min(Math.max(Math.round(y), 0), height - 1),
    })

    const convertSuperpixelToPolygon = (object: LabeledFabricImage) => {
      const element = (object as any).getElement()
      const innerCtx = document.createElement('canvas').getContext('2d')
      if (!element || !innerCtx) return null

      const w = (element as HTMLImageElement).naturalWidth || element.width
      const h = (element as HTMLImageElement).naturalHeight || element.height

      innerCtx.canvas.width = w
      innerCtx.canvas.height = h
      innerCtx.drawImage(element, 0, 0, w, h)

      const imgData = innerCtx.getImageData(0, 0, w, h).data
      const mask = new Uint8Array(w * h)
      let minX = w, minY = h, maxX = -1, maxY = -1

      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          const alpha = imgData[(y * w + x) * 4 + 3]
          if (!alpha) continue
          mask[y * w + x] = 1
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }

      innerCtx.canvas.remove()
      if (maxX < minX || maxY < minY) return null

      const contours = MagicBrush.traceContours({
        data: mask, width: w, height: h,
        bounds: { minX, minY, maxX, maxY },
      })
      const scaleX = object.scaleX ?? 1
      const scaleY = object.scaleY ?? 1
      const offsetLeft = object.left ?? 0
      const offsetTop = object.top ?? 0

      const simplified = MagicBrush.simplifyContours(contours, 1, 6).filter(
        ({ points }: any) => points.length,
      )
      if (!simplified.length) return null

      let globalMinX = Infinity, globalMinY = Infinity
      const scaledContours = simplified.map((contour: any) => {
        const scaledPoints = contour.points.map(({ x, y }: any) => {
          const px = x * scaleX
          const py = y * scaleY
          globalMinX = Math.min(globalMinX, px)
          globalMinY = Math.min(globalMinY, py)
          return { x: px, y: py }
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

      const editableIndexRaw = relativeContours.findIndex(({ inner }: any) => !inner)
      const editableIndex = editableIndexRaw >= 0 ? editableIndexRaw : 0
      const editableContour = relativeContours[editableIndex] ?? relativeContours[0]
      const editablePoints =
        editableContour?.points.map(({ x, y }: any) => new Point(x, y)) ?? []

      const pathParts: string[] = []
      relativeContours.forEach(({ points }: any) => {
        if (!points.length) return
        const [first, ...rest] = points
        pathParts.push(`M ${first.x} ${first.y}`)
        rest.forEach(({ x, y }: any) => pathParts.push(`L ${x} ${y}`))
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
        info: (object as any).info ?? TOOL_INFO_SUPERPIXEL,
        fill: (object as any).fill as string,
        hex: (object as any).hex,
        alpha: (object as any).alpha,
        opacity: (object as any).opacity ?? 1,
        index: (object as any).index,
        class: (object as any).class,
        unique: (object as any).unique,
        labeler: (object as any).labeler,
        combinded: (object as any).combinded,
        lockMovementX: (object as any).lockMovementX,
        lockMovementY: (object as any).lockMovementY,
      } as any)
    }

    const handleOnMouseMove = (event: any) => {
      const e = event.e as MouseEvent
      if (isDraggingMode && e?.button === 0) {
        const pos = normalizePoint(getMousePosition(e))
        if (!pos.x && !pos.y) return
        const offset = slic.getClickOffset(pos, width)

        const superpixelData = maskImageData.data
        const annotationImageData = annotationLayer.getImageData(0, 0, width, height)
        const pixelIndex = slic.getEncodedLabel(superpixelData, offset)

        if (superpixelIndex === pixelIndex) return
        superpixelIndex = pixelIndex

        const pixels = slic.getPixelIndex()[pixelIndex]
        const rgbaComponents = toRgbaArray(colorCode) as [number, number, number, number]
        const normalizedAlpha = Math.max(0, Math.min(1, rgbaComponents[3] ?? 1))
        const rgbaArray: [number, number, number, number] = [
          rgbaComponents[0],
          rgbaComponents[1],
          rgbaComponents[2],
          Math.round(normalizedAlpha * 255),
        ]

        slic.highlightPixels(pixels, rgbaArray, annotationImageData, boundaryImageData)
        slic.fillPixels(pixels, rgbaArray, annotationImageData)

        annotationLayer.clearRect(0, 0, width, height)
        annotationLayer.putImageData(annotationImageData, 0, 0)

        const { canvas: croppedCanvas, minX, minY } = cropAlphaArea(annotationImageData)
        const { hex, alpha } = toHex(colorCode)

        const image = new (fabric.FabricImage as any)(croppedCanvas, {
          left: minX,
          top: minY,
          objectCaching: false,
          selectable: false,
          info: TOOL_INFO_SUPERPIXEL,
          evented: false,
          replaced: true,
          fill: colorCode,
          hex,
          alpha,
          opacity: normalizedAlpha,
          index,
          lockMovementX: true,
          lockMovementY: true,
        }) as LabeledFabricImage

        if (currentSuperpixel) {
          activeCanvas.remove(currentSuperpixel)
        }
        currentSuperpixel = image
        activeCanvas.add(image)
      }
    }

    const handleOnMouseDown = (event: any) => {
      isDraggingMode = true
      handleOnMouseMove(event)
    }

    const handleOnMouseUp = () => {
      isDraggingMode = false
      superpixelIndex = null

      const superpixelObjects = getLabeledObjects(activeCanvas).filter(
        (object) =>
          object.info === TOOL_INFO_SUPERPIXEL &&
          (object as any).index === index &&
          object.type === 'image',
      )

      const final = superpixelObjects[superpixelObjects.length - 1]
      if (!final) return
      final.combinded = true
      final.evented = true

      activeCanvas.remove(...superpixelObjects)
      activeCanvas.add(final)
      currentSuperpixel = final as LabeledFabricImage
    }

    activeCanvas.on('mouse:down', toEventHandler(handleOnMouseDown))
    activeCanvas.on('mouse:move', toEventHandler(handleOnMouseMove))
    activeCanvas.on('mouse:up', toEventHandler(handleOnMouseUp))

    return () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }

      try {
        const objects = getLabeledObjects(activeCanvas)
        const boundaryObject = objects.find(
          ({ info }) => info === TOOL_INFO_SUPERPIXEL_BOUNDARY,
        )
        if (boundaryObject) {
          activeCanvas.remove(boundaryObject)
        }
        const superpixelObject =
          currentSuperpixel ||
          (objects
            .filter(
              (object): object is LabeledFabricImage =>
                object.info === TOOL_INFO_SUPERPIXEL &&
                object instanceof fabric.FabricImage,
            )
            .pop() ?? null)

        if (superpixelObject) {
          const polygon = convertSuperpixelToPolygon(superpixelObject)
          if (polygon) {
            activeCanvas.remove(superpixelObject)
            activeCanvas.add(polygon)
            activeCanvas.renderAll()
          }
        }
      } finally {
        activeCanvas.off('mouse:down', toEventHandler(handleOnMouseDown))
        activeCanvas.off('mouse:move', toEventHandler(handleOnMouseMove))
        activeCanvas.off('mouse:up', toEventHandler(handleOnMouseUp))
        currentSuperpixel = null
      }
    }
  }

  return { id: 'superpixel', init }
}
