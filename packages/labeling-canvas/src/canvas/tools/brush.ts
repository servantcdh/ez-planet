import {
  ensureCanvas,
  getPencilBrush,
  toEventHandler,
} from '../core'
import type { BrushInitConfig, LabelingTool } from '../../types/internal'
import { createBrushCursor } from './common'

export const brushTool = (): LabelingTool => {
  const init = ({ brush, colorCode }: BrushInitConfig) => {
    const activeCanvas = ensureCanvas()
    const PencilBrush = getPencilBrush()

    activeCanvas.isDrawingMode = true
    activeCanvas.freeDrawingBrush = new PencilBrush(activeCanvas)
    activeCanvas.freeDrawingBrush.color = colorCode
    activeCanvas.freeDrawingBrush.strokeLineCap = brush.lineCap as CanvasLineCap
    activeCanvas.freeDrawingBrush.width = brush.lineWidth

    const { brushCursor, handleOnMouseMove, handleOnMouseUp } =
      createBrushCursor(brush, colorCode)

    const handleOnMouseOver = function () {
      activeCanvas.add(brushCursor)
    }

    const handleOnMouseOut = function () {
      activeCanvas.remove(brushCursor)
    }

    activeCanvas.add(brushCursor)
    activeCanvas.on('mouse:over', toEventHandler(handleOnMouseOver))
    activeCanvas.on('mouse:out', toEventHandler(handleOnMouseOut))
    activeCanvas.on('mouse:move', toEventHandler(handleOnMouseMove))
    activeCanvas.on('mouse:up', toEventHandler(handleOnMouseUp))

    return () => {
      activeCanvas.remove(brushCursor)
      activeCanvas.off('mouse:over', toEventHandler(handleOnMouseOver))
      activeCanvas.off('mouse:out', toEventHandler(handleOnMouseOut))
      activeCanvas.off('mouse:move', toEventHandler(handleOnMouseMove))
      activeCanvas.off('mouse:up', toEventHandler(handleOnMouseUp))
      activeCanvas.isDrawingMode = false
    }
  }

  return { id: 'brush', init }
}
