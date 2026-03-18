import { ensureCanvas, toEventHandler } from '../core'
import type { BrushOptions, LabelingTool } from '../../types/internal'
import { createBrushCursor } from './common'

export const eraserTool = (): LabelingTool => {
  const init = async ({ brush }: { brush: BrushOptions }) => {
    const activeCanvas = ensureCanvas()

    // Fabric v6: EraserBrush removed from core, use @erase2d/fabric
    const { EraserBrush } = await import('@erase2d/fabric')
    activeCanvas.freeDrawingBrush = new EraserBrush(activeCanvas)

    activeCanvas.isDrawingMode = true
    activeCanvas.freeDrawingBrush.strokeLineCap = brush.lineCap as CanvasLineCap
    activeCanvas.freeDrawingBrush.width = brush.lineWidth

    const { brushCursor, handleOnMouseMove, handleOnMouseUp } =
      createBrushCursor(brush)

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

  return { id: 'eraser', init }
}
