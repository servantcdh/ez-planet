import { fabric } from "fabric";

import { toHex, toRgbaArray } from "../imageLabelingColors";
import {
  TOOL_INFO_SUPERPIXEL,
  TOOL_INFO_SUPERPIXEL_BOUNDARY,
} from "../imageLabelingConstants";
import {
  ensureCanvas,
  getLabeledObjects,
  getMousePosition,
  toEventHandler,
} from "../imageLabelingCore";
import { createImage, cropAlphaArea } from "../imageLabelingImage";
import { getImageToolSelectionStore } from "../imageLabelingStore";
import type {
  LabeledFabricImage,
  LabelingTool,
  SuperpixelInitConfig,
} from "../imageLabelingTypes";
import { MagicBrush } from "../magicbrush";
import { SLIC } from "../superpixel";

export const superpixelTool = (): LabelingTool => {
  const init = async ({
    src,
    colorCode,
    superpixelConfig: config,
    previousTool,
  }: SuperpixelInitConfig) => {
    const activeCanvas = ensureCanvas();
    activeCanvas.defaultCursor = "crosshair";
    activeCanvas.hoverCursor = "crosshair";

    const isInit = !previousTool || previousTool.id !== "superpixel";

    const img = (await createImage(src)) as HTMLImageElement;

    const { width, height } = img;

    const object = getLabeledObjects(activeCanvas)
      .filter(({ info }) => info === TOOL_INFO_SUPERPIXEL)
      .pop();

    const baseIndex = object?.index ?? 0;
    const index = isInit ? baseIndex + 1 : baseIndex;

    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.canvas.width = width;
    ctx.canvas.height = height;

    const boundaryLayer = document.createElement("canvas").getContext("2d");
    if (!boundaryLayer) {
      return;
    }
    boundaryLayer.canvas.width = width;
    boundaryLayer.canvas.height = height;

    const annotationLayer = document.createElement("canvas").getContext("2d");
    if (!annotationLayer) {
      return;
    }
    annotationLayer.canvas.width = width;
    annotationLayer.canvas.height = height;

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);

    const slic = new SLIC(imageData, config);
    const maskImageData = slic.result;
    slic.createPixelIndex(maskImageData);

    boundaryLayer.putImageData(maskImageData, 0, 0);
    const boundaryImageData = boundaryLayer.getImageData(0, 0, width, height);

    slic.computeEdgemap(boundaryImageData);

    ctx.clearRect(0, 0, width, height);
    ctx.putImageData(boundaryImageData, 0, 0);

    const dataUrl = ctx.canvas.toDataURL();
    ctx.canvas.remove();

    let timeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = null;
      fabric.Image.fromURL(dataUrl, (image) => activeCanvas.add(image), {
        left: 0,
        top: 0,
        objectCaching: false,
        selectable: false,
        info: TOOL_INFO_SUPERPIXEL_BOUNDARY,
      } as fabric.IImageOptions);
    }, 1);

    let isDraggingMode = false;
    let superpixelIndex: number | null = null;
    let currentSuperpixel: LabeledFabricImage | null = null;
    const normalizePoint = ({ x, y }: { x: number; y: number }) => ({
      x: Math.min(Math.max(Math.round(x), 0), width - 1),
      y: Math.min(Math.max(Math.round(y), 0), height - 1),
    });

    const convertSuperpixelToPolygon = (object: LabeledFabricImage) => {
      const element = object.getElement();
      const ctx = document.createElement("canvas").getContext("2d");
      if (!element || !ctx) {
        return null;
      }

      const width = (element as HTMLImageElement).naturalWidth || element.width;
      const height =
        (element as HTMLImageElement).naturalHeight || element.height;

      ctx.canvas.width = width;
      ctx.canvas.height = height;
      ctx.drawImage(element, 0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height).data;
      const mask = new Uint8Array(width * height);
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const alpha = imageData[(y * width + x) * 4 + 3];
          if (!alpha) {
            continue;
          }
          mask[y * width + x] = 1;
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
        width,
        height,
        bounds: { minX, minY, maxX, maxY },
      });
      const scaleX = object.scaleX ?? 1;
      const scaleY = object.scaleY ?? 1;
      const offsetLeft = object.left ?? 0;
      const offsetTop = object.top ?? 0;

      const simplified = MagicBrush.simplifyContours(contours, 1, 6).filter(
        ({ points }) => points.length
      );

      if (!simplified.length) {
        return null;
      }

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
          return { x: px, y: py };
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
        info: object.info ?? TOOL_INFO_SUPERPIXEL,
        fill: object.fill as string,
        hex: object.hex,
        alpha: object.alpha,
        opacity: object.opacity ?? 1,
        index: object.index,
        class: object.class,
        unique: object.unique,
        labeler: object.labeler,
        combinded: object.combinded,
        lockMovementX: object.lockMovementX,
        lockMovementY: object.lockMovementY,
      } as fabric.IObjectOptions);
    };

    const handleOnMouseMove = ({ e }: fabric.IEvent<MouseEvent>) => {
      if (isDraggingMode && e?.button === 0) {
        const pos = normalizePoint(getMousePosition(e));
        if (!pos.x && !pos.y) {
          return;
        }
        const offset = slic.getClickOffset(pos, width);

        const superpixelData = maskImageData.data;
        const annotationImageData = annotationLayer.getImageData(
          0,
          0,
          width,
          height
        );
        const pixelIndex = slic.getEncodedLabel(superpixelData, offset);

        if (superpixelIndex === pixelIndex) {
          return;
        }

        superpixelIndex = pixelIndex;
        const pixels = slic.getPixelIndex()[pixelIndex];

        const rgbaComponents = toRgbaArray(colorCode) as [
          number,
          number,
          number,
          number,
        ];
        const normalizedAlpha = Math.max(
          0,
          Math.min(1, rgbaComponents[3] ?? 1)
        );
        const rgbaArray: [number, number, number, number] = [
          rgbaComponents[0],
          rgbaComponents[1],
          rgbaComponents[2],
          Math.round(normalizedAlpha * 255),
        ];

        slic.highlightPixels(
          pixels,
          rgbaArray,
          annotationImageData,
          boundaryImageData
        );

        slic.fillPixels(pixels, rgbaArray, annotationImageData);

        annotationLayer.clearRect(0, 0, width, height);
        annotationLayer.putImageData(annotationImageData, 0, 0);

        const {
          canvas: croppedCanvas,
          minX,
          minY,
        } = cropAlphaArea(annotationImageData);

        const { hex, alpha } = toHex(colorCode);

        const image = new fabric.Image(croppedCanvas, {
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
        } as fabric.IImageOptions) as LabeledFabricImage;

        if (currentSuperpixel) {
          activeCanvas.remove(currentSuperpixel);
        }
        currentSuperpixel = image;
        activeCanvas.add(image);
      }
    };
    const handleOnMouseDown = (e: fabric.IEvent<MouseEvent>) => {
      isDraggingMode = true;
      handleOnMouseMove(e);
    };
    const handleOnMouseUp = () => {
      isDraggingMode = false;
      superpixelIndex = null;

      const superpixelObjects = getLabeledObjects(activeCanvas).filter(
        (object) =>
          object.info === TOOL_INFO_SUPERPIXEL &&
          object.index === index &&
          object.type === "image"
      );

      const final = superpixelObjects[superpixelObjects.length - 1];
      if (!final) {
        return;
      }
      final.combinded = true;
      final.evented = true;

      const { undoStack, setUndoStack } = getImageToolSelectionStore();

      const trimedStack = undoStack.filter((str) => {
        const { objects: stackObjects } = JSON.parse(str) as {
          objects: any[];
        };
        return !stackObjects.find((object: any) => {
          return (
            object.info === TOOL_INFO_SUPERPIXEL &&
            object.index === index &&
            object.unique !== final.unique
          );
        });
      });

      setUndoStack(trimedStack);
      activeCanvas.remove(...superpixelObjects);
      activeCanvas.add(final);
      currentSuperpixel = final as LabeledFabricImage;
    };

    activeCanvas.on("mouse:down", toEventHandler(handleOnMouseDown));
    activeCanvas.on("mouse:move", toEventHandler(handleOnMouseMove));
    activeCanvas.on("mouse:up", toEventHandler(handleOnMouseUp));

    return () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      try {
        const objects = getLabeledObjects(activeCanvas);
        const boundaryObject = objects.find(
          ({ info }) => info === TOOL_INFO_SUPERPIXEL_BOUNDARY
        );
        if (boundaryObject) {
          activeCanvas.remove(boundaryObject);
        }
        const superpixelObject =
          currentSuperpixel ||
          objects
            .filter(
              (object): object is LabeledFabricImage =>
                object.info === TOOL_INFO_SUPERPIXEL &&
                object instanceof fabric.Image
            )
            .pop();

        if (superpixelObject) {
          const polygon = convertSuperpixelToPolygon(superpixelObject);
          if (polygon) {
            activeCanvas.remove(superpixelObject);
            activeCanvas.add(polygon).renderAll();
          }
        }
      } finally {
        activeCanvas.off("mouse:down", toEventHandler(handleOnMouseDown));
        activeCanvas.off("mouse:move", toEventHandler(handleOnMouseMove));
        activeCanvas.off("mouse:up", toEventHandler(handleOnMouseUp));
        currentSuperpixel = null;
      }
    };
  };

  return {
    id: "superpixel",
    init,
  };
};
