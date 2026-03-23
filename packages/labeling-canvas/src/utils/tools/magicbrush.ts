import { fabric } from "fabric";

import { toHex } from "../imageLabelingColors";
import {
  EXCEPTION_TOOLS,
  TOOL_INFO_MAGIC_BRUSH,
} from "../imageLabelingConstants";
import {
  ensureCanvas,
  FabricImage,
  getCanvasJSON,
  getMousePosition,
  toEventHandler,
} from "../imageLabelingCore";
import { createImage, cropAlphaArea } from "../imageLabelingImage";
import { getImageToolSelectionStore } from "../imageLabelingStore";
import type { LabelingTool, MagicBrushInitConfig } from "../imageLabelingTypes";
import { MagicBrush } from "../magicbrush";
import { createBrushCursor } from "./common";

export const magicbrushTool = (): LabelingTool => {
  const init = async ({
    src,
    colorCode,
    brush,
    magicbrushConfig,
  }: MagicBrushInitConfig) => {
    const activeCanvas = ensureCanvas();
    const hasContext = () =>
      Boolean(
        (activeCanvas as unknown as {
          contextContainer?: CanvasRenderingContext2D | null;
        }).contextContainer
      );
    const renderAllSafe = () => {
      if (hasContext()) {
        activeCanvas.renderAll();
      }
    };
    activeCanvas.defaultCursor = "crosshair";
    activeCanvas.hoverCursor = "crosshair";

    const { threshold, radius } = magicbrushConfig;

    let baseImageData: ImageData | null = null;
    let downPoint: { x: number; y: number } | null = null;

    const img = await createImage(src);
    const { width, height } = img;

    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.canvas.width = width;
    ctx.canvas.height = height;

    ctx.drawImage(img, 0, 0);
    baseImageData = ctx.getImageData(0, 0, width, height);

    const normalizePoint = ({ x, y }: { x: number; y: number }) => ({
      x: Math.min(Math.max(Math.round(x), 0), width - 1),
      y: Math.min(Math.max(Math.round(y), 0), height - 1),
    });

    const convertMagicBrushToPolygon = (object: fabric.Image) => {
      const element = object.getElement();
      const ctx = document.createElement("canvas").getContext("2d");
      if (!element || !ctx) {
        return null;
      }

      const naturalWidth =
        (element as HTMLImageElement).naturalWidth || element.width;
      const naturalHeight =
        (element as HTMLImageElement).naturalHeight || element.height;

      ctx.canvas.width = naturalWidth;
      ctx.canvas.height = naturalHeight;
      ctx.drawImage(element, 0, 0, naturalWidth, naturalHeight);

      const imageData = ctx.getImageData(
        0,
        0,
        naturalWidth,
        naturalHeight
      ).data;
      const mask = new Uint8Array(naturalWidth * naturalHeight);
      let minX = naturalWidth;
      let minY = naturalHeight;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < naturalHeight; y += 1) {
        for (let x = 0; x < naturalWidth; x += 1) {
          const alpha = imageData[(y * naturalWidth + x) * 4 + 3];
          if (!alpha) {
            continue;
          }
          mask[y * naturalWidth + x] = 1;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }

      ctx.canvas.remove();

      if (maxX < minX || maxY < minY) {
        return null;
      }

      const contours = MagicBrush.traceContours({
        data: mask,
        width: naturalWidth,
        height: naturalHeight,
        bounds: { minX, minY, maxX, maxY },
      });
      const simplified = MagicBrush.simplifyContours(contours, 1, 6).filter(
        ({ points }) => points.length
      );
      if (!simplified.length) {
        return null;
      }

      const scaleX = object.scaleX ?? 1;
      const scaleY = object.scaleY ?? 1;
      const offsetLeft = object.left ?? 0;
      const offsetTop = object.top ?? 0;

      let globalMinX = Infinity;
      let globalMinY = Infinity;

      const scaledContours = simplified.map((contour) => {
        let contourMinX = Infinity;
        let contourMinY = Infinity;
        const scaledPoints = contour.points.map(({ x, y }) => {
          const px = x * scaleX;
          const py = y * scaleY;
          contourMinX = Math.min(contourMinX, px);
          contourMinY = Math.min(contourMinY, py);
          globalMinX = Math.min(globalMinX, px);
          globalMinY = Math.min(globalMinY, py);
          return new fabric.Point(px, py);
        });
        return { inner: contour.inner, points: scaledPoints };
      });

      if (!Number.isFinite(globalMinX) || !Number.isFinite(globalMinY)) {
        return null;
      }

      const baseOffset = { x: globalMinX, y: globalMinY };
      const relativeContours = scaledContours
        .map((contour) => ({
          inner: contour.inner,
          points: contour.points.map(
            ({ x, y }) => new fabric.Point(x - baseOffset.x, y - baseOffset.y)
          ),
        }))
        .sort((a, b) => Number(a.inner) - Number(b.inner));

      const editableIndexRaw = relativeContours.findIndex(
        ({ inner }) => !inner
      );
      const editableIndex = editableIndexRaw >= 0 ? editableIndexRaw : 0;
      const editableContour =
        relativeContours[editableIndex] ?? relativeContours[0];
      const editablePoints =
        editableContour?.points.map(({ x, y }) => new fabric.Point(x, y)) ?? [];

      const pathParts: string[] = [];
      relativeContours.forEach(({ points }) => {
        if (!points.length) {
          return;
        }
        const [first, ...rest] = points;
        pathParts.push(`M ${first.x} ${first.y}`);
        rest.forEach(({ x, y }) => {
          pathParts.push(`L ${x} ${y}`);
        });
        pathParts.push("Z");
      });

      return new fabric.Path(pathParts.join(" "), {
        left: offsetLeft + baseOffset.x,
        top: offsetTop + baseOffset.y,
        originX: "left",
        originY: "top",
        objectCaching: false,
        selectable: false,
        evented: true,
        fillRule: "evenodd",
        pathOffset: new fabric.Point(0, 0),
        points: editablePoints as unknown as fabric.Point[],
        pathContours: relativeContours,
        pathBaseOffset: baseOffset,
        pathEditableContourIndex: editableIndex,
        info: (object as any).info ?? TOOL_INFO_MAGIC_BRUSH,
        fill: object.fill as string,
        hex: (object as any).hex,
        alpha: (object as any).alpha,
        index: (object as any).index,
        class: (object as any).class,
        unique: (object as any).unique,
        labeler: (object as any).labeler,
        combinded: (object as any).combinded,
        lockMovementX: (object as any).lockMovementX,
        lockMovementY: (object as any).lockMovementY,
        passStack: true,
        replaced: true,
      } as fabric.IObjectOptions);
    };

    const drawMask = () => {
      if (!baseImageData || !downPoint) {
        return;
      }

      const image = {
        data: baseImageData.data,
        width: baseImageData.width,
        height: baseImageData.height,
        bytes: 4,
      } as any;

      const { x, y } = downPoint;

      let mask = MagicBrush.floodFill(image, x, y, threshold) as any;
      mask = MagicBrush.gaussBlurOnlyBorder(mask, radius) as any;

      paint(mask, colorCode);
    };

    const paint = (
      mask: {
        data: Uint8Array;
        bounds: { minY: number; maxY: number; minX: number; maxX: number };
        width: number;
      },
      colorCodeValue: string
    ) => {
      if (!baseImageData) {
        return;
      }
      const toArray = (str: string) => {
        const sliced = str.substring(5);
        const values = sliced.substring(0, sliced.length - 1);
        const arr = values.split(",").map((value) => +value);
        arr[3] = Math.round(arr[3] * 255);
        return arr as [number, number, number, number];
      };

      const rgba = toArray(colorCodeValue);

      const tmpCanvas = document.createElement("canvas");
      const tmpCtx = tmpCanvas.getContext("2d");
      if (!tmpCtx) {
        return;
      }
      tmpCtx.canvas.width = baseImageData.width;
      tmpCtx.canvas.height = baseImageData.height;

      const data = mask.data;
      const bounds = mask.bounds;
      const maskW = mask.width;
      const w = baseImageData?.width ?? 0;
      const h = baseImageData?.height ?? 0;
      const curserAreaData = tmpCtx.createImageData(w, h);
      const res = curserAreaData.data;

      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          if (data[y * maskW + x] === 0) {
            continue;
          }
          const k = (y * w + x) * 4;
          res[k] = rgba[0];
          res[k + 1] = rgba[1];
          res[k + 2] = rgba[2];
          res[k + 3] = rgba[3];
        }
      }

      tmpCanvas.remove();

      const { canvas, minX, minY } = cropAlphaArea(curserAreaData);
      addToCanvas(canvas, minX, minY);
    };

    const addToCanvas = (
      tmpCanvas: HTMLCanvasElement,
      minX: number,
      minY: number
    ) => {
      if (!downPoint) {
        return;
      }
      const left = minX;
      const top = minY;
      const dataUrl = tmpCanvas.toDataURL();

      tmpCanvas.remove();

      FabricImage.fromURL(
        dataUrl,
        (image) => {
          const labeledImage = image as fabric.Image & {
            hex?: string;
            alpha?: string;
            index?: number;
            class?: string;
            unique?: string;
            labeler?: string;
            combinded?: boolean;
            passStack?: boolean;
            replaced?: boolean;
            evented?: boolean;
            info?: string;
          };
          const { hex, alpha } = toHex(colorCode);
          labeledImage.set({
            left,
            top,
            objectCaching: false,
            selectable: false,
            info: TOOL_INFO_MAGIC_BRUSH,
            fill: colorCode,
            hex,
            alpha,
            evented: false,
            passStack: true,
            replaced: true,
            lockMovementX: true,
            lockMovementY: true,
          });
          activeCanvas.add(labeledImage);
          const polygon = convertMagicBrushToPolygon(labeledImage);
          if (polygon) {
            activeCanvas.remove(labeledImage);
            activeCanvas.add(polygon);
            const canvasJsonObject = getCanvasJSON(activeCanvas);
            canvasJsonObject.objects = canvasJsonObject.objects.filter(
              ({ info }) => !EXCEPTION_TOOLS.includes(info ?? "")
            );
            canvasJsonObject.objects.forEach(
              (object) => (object.evented = false)
            );
            const canvasJsonString = JSON.stringify(canvasJsonObject);
            const { undoStack, setUndoStack, setRedoStack } =
              getImageToolSelectionStore();
            setUndoStack([...undoStack, canvasJsonString]);
            setRedoStack([]);
          }
        },
        {
          left,
          top,
          objectCaching: false,
          selectable: false,
          info: TOOL_INFO_MAGIC_BRUSH,
          fill: colorCode,
          lockMovementX: true,
          lockMovementY: true,
        } as fabric.IImageOptions
      );
    };

    const handleOnMouseDown = function ({
      e,
    }: fabric.IEvent<MouseEvent> & { e?: MouseEvent }) {
      if (e?.button === 0) {
        downPoint = normalizePoint(getMousePosition(e));
        drawMask();
      }
    };

    const {
      brushCursor,
      handleOnMouseMove: handleOnCursorMove,
      handleOnMouseUp: handleOnCursorUp,
    } = createBrushCursor({
      ...brush,
      lineCap: "square",
    });

    const handleOnMouseUp = () => {
      handleOnCursorUp();
    };

    const handleOnMouseOver = function () {
      activeCanvas.add(brushCursor);
    };

    const handleOnMouseOut = function () {
      activeCanvas.remove(brushCursor);
    };

    activeCanvas.add(brushCursor);
    activeCanvas.on("mouse:over", toEventHandler(handleOnMouseOver));
    activeCanvas.on("mouse:out", toEventHandler(handleOnMouseOut));
    activeCanvas.on("mouse:down", toEventHandler(handleOnMouseDown));
    activeCanvas.on("mouse:move", toEventHandler(handleOnCursorMove));
    activeCanvas.on("mouse:up", toEventHandler(handleOnMouseUp));

    return () => {
      activeCanvas.remove(brushCursor);
      renderAllSafe();
      activeCanvas.off("mouse:over", toEventHandler(handleOnMouseOver));
      activeCanvas.off("mouse:out", toEventHandler(handleOnMouseOut));
      activeCanvas.off("mouse:down", toEventHandler(handleOnMouseDown));
      activeCanvas.off("mouse:move", toEventHandler(handleOnCursorMove));
      activeCanvas.off("mouse:up", toEventHandler(handleOnMouseUp));
    };
  };

  return {
    id: "magic-wand",
    init,
  };
};
