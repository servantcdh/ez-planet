import { TOOL_INFO_FILLED_POLYGON } from '../constants'
import {
  ensureCanvas,
  getLine,
  getPoint,
  getPolygon,
  toEventHandler,
} from '../core'
import type { LabelingTool } from '../../types/internal'

export const polygonTool = (): LabelingTool => {
  const init = ({ colorCode }: { colorCode: string }) => {
    const activeCanvas = ensureCanvas()
    const Point = getPoint()
    const Polygon = getPolygon()
    const Line = getLine()

    let polygonPoints: Array<{ x: number; y: number }> = []
    let activeLines: any[] = []
    let isCompletedPoints = false

    const isNearFromLastPoint = function (
      e: MouseEvent,
      distanceThreshold: number,
    ) {
      if (!activeLines.length) {
        return false
      }

      const line = activeLines[0]
      if (line.x1 === undefined || line.y1 === undefined) {
        return false
      }
      const pointer = activeCanvas.getScenePoint(e)

      const x1 = line.x1 ?? 0
      const y1 = line.y1 ?? 0
      const { x, y } = pointer

      return (
        Math.abs(x1 - x) <= distanceThreshold &&
        Math.abs(y1 - y) <= distanceThreshold
      )
    }

    const handleOnContextMenu = function (e: MouseEvent) {
      e.preventDefault()
      activeCanvas.remove(...activeLines)
      activeLines = []
    }

    const handleOnMouseDown = function (event: any) {
      const e = event.e as MouseEvent
      if (e && isNearFromLastPoint(e, 10)) {
        isCompletedPoints = true
        return
      }

      const pointer = activeCanvas.getScenePoint(e)
      const line = activeLines.length
        ? activeLines[activeLines.length - 1]
        : null

      if (!line || line.x2) {
        const activeLine = new Line(
          [pointer.x, pointer.y, pointer.x, pointer.y],
          {
            stroke: 'red',
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
          } as any,
        )
        ;(activeLine as any).replaced = true

        activeCanvas.add(activeLine)
        activeLines.push(activeLine)
      } else {
        line.set({ x2: pointer.x, y2: pointer.y })
      }

      polygonPoints.push(new Point(pointer.x, pointer.y))
    }

    const handleOnMouseMove = function (event: any) {
      if (isCompletedPoints) {
        return
      }
      const line = activeLines.length
        ? activeLines[activeLines.length - 1]
        : null
      if (line) {
        const e = event.e as MouseEvent
        if (!e) {
          return
        }
        const pointer = activeCanvas.getScenePoint(e)
        line.set({ x2: pointer.x, y2: pointer.y })
        activeCanvas.renderAll()
      }
    }

    const handleOnMouseUp = function () {
      if (isCompletedPoints) {
        activeCanvas.remove(...activeLines)
        const polygon = new Polygon(polygonPoints, {
          fill: colorCode,
          objectCaching: false,
          selectable: false,
          evented: true,
          info: TOOL_INFO_FILLED_POLYGON,
        } as any)
        activeCanvas.add(polygon)
        activeCanvas.renderAll()
        polygonPoints = []
        activeLines = []
        isCompletedPoints = false
      }
    }

    activeCanvas.defaultCursor = 'crosshair'

    document.addEventListener('contextmenu', handleOnContextMenu)
    activeCanvas.on('mouse:down', toEventHandler(handleOnMouseDown))
    activeCanvas.on('mouse:move', toEventHandler(handleOnMouseMove))
    activeCanvas.on('mouse:up', toEventHandler(handleOnMouseUp))

    return () => {
      document.removeEventListener('contextmenu', handleOnContextMenu)
      activeCanvas.defaultCursor = 'default'
      activeCanvas.off('mouse:down', toEventHandler(handleOnMouseDown))
      activeCanvas.off('mouse:move', toEventHandler(handleOnMouseMove))
      activeCanvas.off('mouse:up', toEventHandler(handleOnMouseUp))

      activeCanvas.remove(...activeLines)
      activeLines = []
    }
  }

  return { id: 'pen', init }
}
