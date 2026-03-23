import { fabric } from "fabric";

import { ensureCanvas, toEventHandler } from "../imageLabelingCore";
import type { BrushOptions, LabelingTool } from "../imageLabelingTypes";
import { createBrushCursor } from "./common";

export const eraserTool = (): LabelingTool => {
  const init = ({ brush }: { brush: BrushOptions }) => {
    const activeCanvas = ensureCanvas();
    activeCanvas.freeDrawingBrush = new (fabric as any).EraserBrush(
      activeCanvas
    );

    activeCanvas.isDrawingMode = true;

    activeCanvas.freeDrawingBrush.strokeLineCap = brush.lineCap;
    activeCanvas.freeDrawingBrush.width = brush.lineWidth;

    const { brushCursor, handleOnMouseMove, handleOnMouseUp } =
      createBrushCursor(brush);

    const handleOnMouseOver = function () {
      activeCanvas.add(brushCursor);
    };

    const handleOnMouseOut = function () {
      activeCanvas.remove(brushCursor);
    };

    activeCanvas.add(brushCursor);
    activeCanvas.on("mouse:over", toEventHandler(handleOnMouseOver));
    activeCanvas.on("mouse:out", toEventHandler(handleOnMouseOut));
    activeCanvas.on("mouse:move", toEventHandler(handleOnMouseMove));
    activeCanvas.on("mouse:up", toEventHandler(handleOnMouseUp));

    return () => {
      activeCanvas.remove(brushCursor);
      activeCanvas.off("mouse:over", toEventHandler(handleOnMouseOver));
      activeCanvas.off("mouse:out", toEventHandler(handleOnMouseOut));
      activeCanvas.off("mouse:move", toEventHandler(handleOnMouseMove));
      activeCanvas.off("mouse:up", toEventHandler(handleOnMouseUp));
      activeCanvas.isDrawingMode = false;
    };
  };

  return {
    id: "eraser",
    init,
  };
};
