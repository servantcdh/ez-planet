import { fabric } from "fabric";

import { TOOL_INFO_FILLED_POLYGON } from "../imageLabelingConstants";
import {
  ensureCanvas,
  Point,
  Polygon,
  toEventHandler,
} from "../imageLabelingCore";
import type { LabelingTool } from "../imageLabelingTypes";

export const polygonTool = (): LabelingTool => {
  const init = ({ colorCode }: { colorCode: string }) => {
    const activeCanvas = ensureCanvas();
    let polygonPoints: fabric.Point[] = [];
    let activeLines: fabric.Line[] = [];
    let isCompletedPoints = false;

    const isNearFromLastPoint = function (
      e: MouseEvent,
      distanceThreshold: number
    ) {
      if (!activeLines.length) {
        return false;
      }

      const line = activeLines[0];
      if (line.x1 === undefined || line.y1 === undefined) {
        return false;
      }
      const pointer = activeCanvas.getPointer(e);

      const x1 = line.x1 ?? 0;
      const y1 = line.y1 ?? 0;
      const { x, y } = pointer;

      return (
        Math.abs(x1 - x) <= distanceThreshold &&
        Math.abs(y1 - y) <= distanceThreshold
      );
    };

    const handleOnContextMenu = function (e: MouseEvent) {
      e.preventDefault();
      activeCanvas.remove(...activeLines);
      activeLines = [];
    };

    const handleOnMouseDown = function ({ e }: fabric.IEvent<MouseEvent>) {
      if (e && isNearFromLastPoint(e, 10)) {
        isCompletedPoints = true;
        return;
      }

      const pointer = activeCanvas.getPointer(e);
      const line = activeLines.length
        ? activeLines[activeLines.length - 1]
        : null;

      if (!line || line.x2) {
        const activeLine = new fabric.Line(
          [pointer.x, pointer.y, pointer.x, pointer.y],
          {
            stroke: "red",
            strokeWidth: 2,
            strokeDashArray: [5, 5],
            selectable: false,
            replaced: true,
            evented: false,
          } as fabric.ILineOptions
        );

        activeCanvas.add(activeLine);
        activeLines.push(activeLine);
      } else {
        line.set({ x2: pointer.x, y2: pointer.y });
      }

      polygonPoints.push(new Point(pointer.x, pointer.y));
    };

    const handleOnMouseMove = function ({ e }: fabric.IEvent<MouseEvent>) {
      if (isCompletedPoints) {
        return;
      }
      const line = activeLines.length
        ? activeLines[activeLines.length - 1]
        : null;
      if (line) {
        if (!e) {
          return;
        }
        const pointer = activeCanvas.getPointer(e);
        line.set({ x2: pointer.x, y2: pointer.y });
        activeCanvas.renderAll();
      }
    };

    const handleOnMouseUp = function () {
      if (isCompletedPoints) {
        activeCanvas.remove(...activeLines);
        const polygon = new Polygon(polygonPoints, {
          fill: colorCode,
          objectCaching: false,
          selectable: false,
          evented: true,
          info: TOOL_INFO_FILLED_POLYGON,
        } as fabric.IObjectOptions);
        activeCanvas.add(polygon);
        activeCanvas.renderAll();
        polygonPoints = [];
        activeLines = [];
        isCompletedPoints = false;
      }
    };

    activeCanvas.defaultCursor = "crosshair";

    document.addEventListener("contextmenu", handleOnContextMenu);
    activeCanvas.on("mouse:down", toEventHandler(handleOnMouseDown));
    activeCanvas.on("mouse:move", toEventHandler(handleOnMouseMove));
    activeCanvas.on("mouse:up", toEventHandler(handleOnMouseUp));

    return () => {
      document.removeEventListener("contextmenu", handleOnContextMenu);
      activeCanvas.defaultCursor = "default";
      activeCanvas.off("mouse:down", toEventHandler(handleOnMouseDown));
      activeCanvas.off("mouse:move", toEventHandler(handleOnMouseMove));
      activeCanvas.off("mouse:up", toEventHandler(handleOnMouseUp));

      activeCanvas.remove(...activeLines);
      activeLines = [];
    };
  };

  return {
    id: "pen",
    init,
  };
};
