import { fabric } from "fabric";
import { v4 as uuidv4 } from "uuid";

import { divide, minus, multiple, plus } from "@/utils/calculator";

import { useImageTypeLabelingToolSelectionStore } from "../store/imageTypeLabelingToolSelection.store";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useLabelInsertPayloadStore } from "../store/labelInsertPayload.store";
import type { LabelInferenceType, LabelInsertData } from "../types/domain";
import { toHex, toRgba, toRgbaArray } from "./imageLabelingColors";
import {
  EXCEPTION_TOOLS,
  LABEL_TYPE_CLASSIFICATION,
  MOVEMENT_LOCK_TOOLS,
  STROKE_WIDTH_BOUNDED_BOX,
  TOOL_INFO_BOUNDED_BOX,
  TOOL_INFO_BRUSH,
  TOOL_INFO_COMBINED_LABELS,
  TOOL_INFO_FILLED_BOX,
  TOOL_INFO_FILLED_POLYGON,
  TOOL_INFO_SEGMENT_ANYTHING,
  TOOL_INFO_UPLOADED_LABEL,
} from "./imageLabelingConstants";
import {
  ActiveSelection,
  Canvas,
  createCanvasJSON,
  emitLabelEvent,
  ensureCanvas,
  FabricImage,
  FabricObject,
  getActiveLabeledObjects,
  getCanvasInstance,
  getCanvasJSON,
  getIsDoing,
  getLabeledObjects,
  // getLastMousePosition,
  getMovedMousePosition,
  getObjects,
  getTimeoutRef,
  Path,
  Polygon,
  setCanvasInstance,
  setIsDoing,
  setObjects,
  setTimeoutRef,
  subscribeLabelEvents,
  toLabeledImage,
  toLabeledObject,
  toLabeledObjects,
  toLabeledPolygon,
} from "./imageLabelingCore";
import { createImage, cropAlphaArea } from "./imageLabelingImage";
import { getImageToolSelectionStore } from "./imageLabelingStore";
import type {
  CanvasExportJSON,
  CanvasJSON,
  ExternalEventData,
  FabricCanvas,
  FabricObservablePayload,
  FabricPointerEvent,
  GlobalInitParams,
  LabeledFabricObject,
  ZoomPayload,
} from "./imageLabelingTypes";
import { MagicBrush } from "./magicbrush";

const BOUNDED_BOX_TOOL_INFOS = [TOOL_INFO_BOUNDED_BOX, TOOL_INFO_FILLED_BOX];

const getInferenceType = (info?: string): LabelInferenceType =>
  BOUNDED_BOX_TOOL_INFOS.includes(info ?? "")
    ? "OBJECT_DETECTION"
    : "SEGMENTATION";

const convertImageToPolygon = (
  object: fabric.Image & LabeledFabricObject
): fabric.Path | null => {
  const element = object.getElement();
  if (!element) {
    return null;
  }
  const width = (element as HTMLImageElement).naturalWidth || element.width;
  const height = (element as HTMLImageElement).naturalHeight || element.height;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  ctx.drawImage(element, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height).data;
  ctx.canvas.remove();

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
  if (maxX < minX || maxY < minY) {
    return null;
  }

  const contours = MagicBrush.traceContours({
    data: mask,
    width,
    height,
    bounds: { minX, minY, maxX, maxY },
  });
  const simplified = MagicBrush.simplifyContours(contours, 1, 6).filter(
    ({ points }) => points.length > 0
  );
  if (!simplified.length) {
    return null;
  }

  let globalMinX = Infinity;
  let globalMinY = Infinity;
  const scaleX = object.scaleX ?? 1;
  const scaleY = object.scaleY ?? 1;
  const offsetLeft = object.left ?? 0;
  const offsetTop = object.top ?? 0;

  const scaledContours = simplified.map((contour) => {
    const scaledPoints = contour.points.map(({ x, y }) => {
      const px = x * scaleX;
      const py = y * scaleY;
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

  const relativeContours = scaledContours.map(({ inner, points }) => ({
    inner,
    points: points.map(
      ({ x, y }) => new fabric.Point(x - baseOffset.x, y - baseOffset.y)
    ),
  }));

  const editableIndexRaw = relativeContours.findIndex(({ inner }) => !inner);
  const editableIndex = editableIndexRaw >= 0 ? editableIndexRaw : 0;
  const editableContour =
    relativeContours[editableIndex] ?? relativeContours[0];
  const editablePoints =
    editableContour?.points.map(
      (point) => new fabric.Point(point.x, point.y)
    ) ?? [];

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
    selectable: true,
    evented: true,
    fillRule: "evenodd",
    pathOffset: new fabric.Point(0, 0),
    points: editablePoints,
    pathContours: relativeContours,
    pathBaseOffset: baseOffset,
    pathEditableContourIndex: editableIndex,
    info: object.info ?? TOOL_INFO_COMBINED_LABELS,
    fill: object.fill ?? "rgba(0,0,0,0)",
    hex: object.hex,
    alpha: object.alpha,
    index: object.index,
    class: object.class,
    unique: object.unique,
    labeler: object.labeler,
    combinded: object.combinded,
    lockMovementX: object.lockMovementX,
    lockMovementY: object.lockMovementY,
    labelInsertData: object.labelInsertData,
  } as fabric.IObjectOptions);
};

export { toHex, toRgba, toRgbaArray, toRGBAHex } from "./imageLabelingColors";
export {
  BUFFER_TOOLS,
  EXCEPTION_TOOLS,
  EXPORT_PROPS,
  LABEL_TYPE_CLASSIFICATION,
  LABEL_TYPE_OBJECT_DETECTION,
  LABEL_TYPE_SEGMENTATION,
  MOVEMENT_LOCK_TOOLS,
  SEGMENT_ANYTHING_MASKINPUT_NEGATIVE,
  SEGMENT_ANYTHING_MASKINPUT_POSITIVE,
  STROKE_WIDTH_BOUNDED_BOX,
  STROKE_WIDTH_SEGMENT_ANYTHING_BOX,
  TOOL_INFO_AUTO_LABELING,
  TOOL_INFO_BOUNDED_BOX,
  TOOL_INFO_BRUSH,
  TOOL_INFO_BRUSHCURSOR,
  TOOL_INFO_COMBINED_LABELS,
  TOOL_INFO_FILLED_BOX,
  TOOL_INFO_FILLED_POLYGON,
  TOOL_INFO_MAGIC_BRUSH,
  TOOL_INFO_SEGMENT_ANYTHING,
  TOOL_INFO_SEGMENT_ANYTHING_BOX,
  TOOL_INFO_SUPERPIXEL,
  TOOL_INFO_SUPERPIXEL_BOUNDARY,
  TOOL_INFO_UPLOADED_LABEL,
} from "./imageLabelingConstants";
export { emitLabelEvent, subscribeLabelEvents } from "./imageLabelingCore";
export {
  createFabricImage,
  createImage,
  cropAlphaArea,
  transparentBlackPixel,
} from "./imageLabelingImage";
export type {
  BrushInitConfig,
  BrushOptions,
  CanvasExportJSON,
  CanvasJSON,
  FabricCanvas,
  FabricObservablePayload,
  FabricPointerEvent,
  GlobalInitParams,
  ImageToolSelectionStore,
  LabeledFabricImage,
  LabeledFabricObject,
  LabeledPolygon,
  LabelExportObject,
  LabelingTool,
  MagicBrushInitConfig,
  RectInitConfig,
  SegmentAnythingCallbackPayload,
  SuperpixelInitConfig,
  ZoomPayload,
} from "./imageLabelingTypes";
export {
  blankRectTool,
  brushTool,
  eraserTool,
  filledRectTool,
  magicbrushTool,
  polygonTool,
  segmentAnythingTool,
  selectionTool,
  superpixelTool,
} from "./tools";

let canvas = getCanvasInstance();
let objects = getObjects();
let isDoing = getIsDoing();
let timeoutRef = getTimeoutRef();
// const lastMousePosition: fabric.Point = getLastMousePosition();
const movedMousePosition: fabric.Point = getMovedMousePosition();
let resetKeyboardState: (() => void) | null = null;
let keyboardEventsEnabled = true;
let isCanvasSyncSuppressed = false;

export const setKeyboardEventsEnabled = (enabled: boolean) => {
  keyboardEventsEnabled = enabled;
  if (!keyboardEventsEnabled && resetKeyboardState) {
    resetKeyboardState();
  }
};

const isUndoRedoBlockedMode = () => {
  const id = useImageTypeLabelingToolSelectionStore.getState().tool?.id;
  return id === "superpixel" || id === "pen";
};

const alertUndoBlocked = () => {
  // TODO: replace alert with toast
  alert(
    "Undo/redo is disabled while the current tool is active. Please switch tools first."
  );
};

const setColor = (
  object: fabric.Object,
  hex: string,
  opacity: number
): Promise<fabric.Object> => {
  const normalizedHex = hex.includes("#") ? hex.substring(1) : hex;
  const opacityPercent = Number.isFinite(opacity) ? opacity : 100;
  const normalizedLabelOpacity = Math.max(0, Math.min(opacityPercent, 100));
  const activeCanvas = ensureCanvas();
  const labeled = toLabeledObject(object);
  const element = (object as { _element?: HTMLImageElement })._element;
  if (element?.currentSrc) {
    return new Promise((resolve) => {
      const run = async () => {
        const dataUrl = element.currentSrc;
        const rgba = toRgba(normalizedHex, 1);
        const [r, g, b] = toRgbaArray(rgba);
        const image = await createImage(dataUrl);
        const ctx = document.createElement("canvas").getContext("2d");
        if (!ctx) {
          resolve(object);
          return;
        }
        ctx.canvas.width = image.width;
        ctx.canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, image.width, image.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          if (imageData.data[i + 3]) {
            imageData.data[i] = r;
            imageData.data[i + 1] = g;
            imageData.data[i + 2] = b;
            imageData.data[i + 3] = 255;
          }
        }
        ctx.clearRect(0, 0, image.width, image.height);
        ctx.putImageData(imageData, 0, 0);
        const coloredDataUrl = ctx.canvas.toDataURL();
        FabricImage.fromURL(
          coloredDataUrl,
          (fabricImage) => {
            const labeledImage = toLabeledImage(fabricImage);
            if (labeled.eraser) {
              labeledImage.set({ eraser: labeled.eraser });
            }
            labeled.replaced = true;
            labeledImage.set({
              info: labeled.info,
              unique: labeled.unique,
              seq: labeled.seq,
              hex: normalizedHex,
              alpha: `${normalizedLabelOpacity}%`,
              index: labeled.index,
              class: labeled.class,
              labeler: labeled.labeler,
              combinded: true,
              selected: true,
              copied: true,
              passStack: true,
              replaced: true,
            });
            activeCanvas.add(labeledImage).remove(object).renderAll();
            labeledImage.replaced = undefined;
            resolve(fabricImage);
          },
          {
            left: labeled.trueLeft ?? labeled.left,
            top: labeled.trueTop ?? labeled.top,
            objectCaching: false,
            selectable: true,
          } as fabric.IImageOptions
        );
      };
      void run();
    });
  }
  return new Promise((resolve) => {
    const rgba = toRgba(normalizedHex, 1);
    labeled.set({
      stroke: rgba,
      alpha: `${normalizedLabelOpacity}%`,
      hex: normalizedHex,
      copied: true,
    });
    if (
      ![TOOL_INFO_BOUNDED_BOX, TOOL_INFO_BRUSH].includes(labeled.info ?? "")
    ) {
      labeled.set({ fill: rgba });
    }
    activeCanvas.renderAll();
    resolve(labeled);
  });
};

export const globalInit = ({
  labeler,
  cvs,
  width,
  height,
  readOnly,
  setCanvasJSON,
  setSelectedObject,
  addLabelObject,
  addLabelObjects,
  updateLabelObject,
  deleteLabelObject,
  compareByObjects,
  resetSegmentations,
  selectedLayoutStyle,
  onDone,
}: GlobalInitParams) => {
  if (!canvas) {
    canvas = new Canvas(cvs);
    setCanvasInstance(canvas);
    canvas.setWidth(width);
    canvas.setHeight(height);
    canvas.selection = false;
    const control = FabricObject.prototype.controls;
    Object.keys(control).forEach((key) => {
      control[key].visible = false;
    });
    canvas.renderAll();
  }

  let isMouseDown = false;
  let isCtrlDown = false;
  let activeObjects: LabeledFabricObject[] = [];
  resetKeyboardState = () => {
    isCtrlDown = false;
    activeObjects = [];
    if (!readOnly) {
      objects.forEach((object) => {
        object.selectable = true;
      });
    }
    if (canvas && canvas.lowerCanvasEl) {
      canvas.renderAll();
    }
  };

  const crop = (
    imageWidth: number,
    imageHeight: number,
    object: LabeledFabricObject & { src: string }
  ): Promise<LabeledFabricObject> => {
    return new Promise((resolve) => {
      const run = async () => {
        const img = await createImage(object.src);
        const cvs = document.createElement("canvas");
        const ctx = cvs.getContext("2d");
        if (!ctx) {
          resolve(object);
          return;
        }
        ctx.canvas.width = imageWidth;
        ctx.canvas.height = imageHeight;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, imageWidth, imageHeight);
        const { canvas } = cropAlphaArea(imgData);
        const dataUrl = canvas.toDataURL();
        canvas.remove();
        cvs.remove();
        FabricImage.fromURL(
          dataUrl,
          (image) => resolve(toLabeledImage(image)),
          {
            left: object.left,
            top: object.top,
            objectCaching: false,
            selectable: object.selectable,
          } as fabric.IImageOptions
        );
      };
      void run();
    });
  };

  const loadLabels = async ({
    imageWidth,
    imageHeight,
    canvasJSON,
    callback,
  }: {
    imageWidth: number;
    imageHeight: number;
    canvasJSON: CanvasExportJSON;
    callback?: (dataUrl: string) => void;
  }) => {
    const activeCanvas = ensureCanvas();
    // TODO: seq 보장
    const load = (json: CanvasExportJSON) =>
      new Promise<boolean>((resolve) => {
        fabric.util.enlivenObjects(
          json.objects,
          (objects: fabric.Object[]) => {
            const enlivedObjects = objects.map((raw: fabric.Object) => {
              const labeledObject = toLabeledObject(raw);
              if (
                [TOOL_INFO_FILLED_POLYGON, TOOL_INFO_SEGMENT_ANYTHING].includes(
                  labeledObject.info ?? ""
                )
              ) {
                const polygon = raw as fabric.Polygon;
                const points = polygon?.points ?? [];
                return toLabeledPolygon(
                  new Polygon(
                    points as fabric.Point[],
                    {
                      objectCaching: false,
                      selectable: false,
                      evented: true,
                      fill: labeledObject.fill as string,
                      hex: labeledObject.hex,
                      opacity: labeledObject.opacity,
                      alpha: labeledObject.alpha,
                      stroke: labeledObject.stroke as string,
                      class: labeledObject.class,
                      seq: labeledObject.seq,
                      info: labeledObject.info,
                      id: labeledObject.id,
                      labelType: labeledObject.labelType,
                      labeler: labeledObject.labeler,
                      unique: labeledObject.unique,
                      ...(labeledObject.eraser
                        ? { eraser: labeledObject.eraser }
                        : {}),
                    } as fabric.IObjectOptions
                  )
                );
              }
              return labeledObject;
            });
            activeCanvas.add(...enlivedObjects);
            enlivedObjects.forEach((object) =>
              activeCanvas.moveTo(object, object.seq ?? 0)
            );
            activeCanvas.renderAll();
            resolve(true);
          },
          "fabric"
        );
      });

    const execute = async (objectsToLoad: LabeledFabricObject[]) => {
      const json = createCanvasJSON(objectsToLoad);
      await load(json);
    };

    isDoing = true;
    setIsDoing(isDoing);

    const canvasObjects = toLabeledObjects(canvasJSON.objects);
    canvasObjects.forEach((item) => {
      item.selectable = false;
      if (readOnly) {
        item.evented = false;
      }
    });

    const objectsFromExternal = canvasObjects.filter(({ type, info }) => {
      return type !== "image" || info === TOOL_INFO_UPLOADED_LABEL;
    });
    if (objectsFromExternal.length) {
      await execute(objectsFromExternal);
    }

    const imageObjects = canvasObjects.filter(
      ({ type, info }) => type === "image" && info !== TOOL_INFO_UPLOADED_LABEL
    ) as Array<LabeledFabricObject & { src: string }>;
    const croppedImages: LabeledFabricObject[] = [];
    for (const object of imageObjects) {
      croppedImages.push(await crop(imageWidth, imageHeight, object));
    }
    if (croppedImages.length) {
      activeCanvas.add(...croppedImages);
    }
    croppedImages.forEach((object) =>
      activeCanvas.moveTo(object, object.seq ?? 0)
    );

    getLabeledObjects(activeCanvas).forEach((object) => {
      if (MOVEMENT_LOCK_TOOLS.includes(object.info ?? "")) {
        object.set({ lockMovementX: true, lockMovementY: true });
      }
    });
    activeCanvas.renderAll();
    objects = getLabeledObjects(activeCanvas);
    setObjects(objects);
    compareByObjects([...objects]);

    const canvasJsonObject = getCanvasJSON(activeCanvas);

    canvasJsonObject.objects = canvasJsonObject.objects.filter(
      ({ info }) => !EXCEPTION_TOOLS.includes(info ?? "")
    );

    if (setCanvasJSON) {
      setCanvasJSON(canvasJsonObject);
    }
    pushUndoStack();

    if (callback) {
      callback(activeCanvas.toDataURL());
    }
  };

  const zoom = ({ direction, level, onChange }: ZoomPayload, value = 1) => {
    if (direction === 1) {
      value = divide(
        Math.floor(multiple(plus(canvas.getZoom(), 0.1), 10)),
        10,
        2
      );
    }
    if (direction === 0 && level > 0) {
      value = level;
    }
    if (direction === -1) {
      const z = canvas.getZoom();
      const mv = multiple(z, 10);
      const sv = multiple(minus(z, 0.1), 10);
      const isToSubtract = mv % 1 === 0;
      value = divide(Math.floor(isToSubtract ? sv : mv), 10, 2);
    }
    if (value <= 0) {
      value = 0.1;
    }

    const zoomWidth = multiple(width, value);
    const zoomHeight = multiple(height, value);

    onChange({
      level: value,
      width: zoomWidth,
      height: zoomHeight,
    });

    canvas.setZoom(value);
    canvas.setWidth(zoomWidth);
    canvas.setHeight(zoomHeight);
  };

  const updateSeq = (data: Array<{ unique: string; seq: number }>) => {
    if (!data || !data.length) {
      return;
    }

    getLabeledObjects()
      .filter(({ info }) => !EXCEPTION_TOOLS.includes(info ?? ""))
      .forEach((item) => {
        const move = ({ seq }: { seq: number }) => {
          item.seq = seq;
          canvas.moveTo(item, seq);
        };
        const object = data.find(({ unique }) => item.unique === unique);
        if (object) {
          move(object);
        }
      });
  };

  /**
   * 외부 발생 이벤트 옵저버
   * @param {"load" | "selected" | "deleted" | "zoom" | "paste"} action
   * @param {*} data
   */
  const observeOnExternalEvent = async function (
    action: FabricObservablePayload,
    data?: ExternalEventData
  ) {
    if (action === "load") {
      if (data?.canvasJSON && data.imageWidth && data.imageHeight) {
        loadLabels({
          imageWidth: data.imageWidth,
          imageHeight: data.imageHeight,
          canvasJSON: data.canvasJSON,
          callback: data.callback,
        });
      }
      return;
    }

    if (action === "selected") {
      const objects = getLabeledObjects().filter(({ unique }) =>
        unique ? (data?.uniques ?? []).includes(unique) : false
      );
      canvas.discardActiveObject();
      if (objects.length) {
        selectByGroup(objects);
      }
      return;
    }

    if (action === "deleted") {
      const labeledObjects = getLabeledObjects();
      const object = labeledObjects.find(
        (item) => item.unique === data?.unique
      );
      if (object) {
        canvas.remove(object);
        canvas.renderAll();
      }
      // Always refresh state to keep stores in sync even if the target was missing.
      objects = getLabeledObjects();
      setObjects(objects);
      compareByObjects([...objects]);
      useLabelBatchStore.getState().syncFabricObjects(objects);
      emitLabelEvent("changed", { action: "removed", objects });
      return;
    }

    if (action === "zoom") {
      if (data) {
        zoom({
          direction: data.direction ?? 0,
          level: data.level ?? 1,
          onChange: data.onChange ?? (() => undefined),
        });
      }
      return;
    }

    if (action === "copy") {
      const canvasJsonObject = getCanvasJSON();

      canvasJsonObject.objects = canvasJsonObject.objects.filter(
        ({ info, selected }) =>
          data?.selected ? selected : info !== TOOL_INFO_BOUNDED_BOX
      );

      data?.callback?.(canvasJsonObject);
      return;
    }

    if (action === "paste") {
      const canvasJsonObject = getCanvasJSON();
      canvasJsonObject.objects = canvasJsonObject.objects.concat(
        data?.objects ?? []
      );
      canvas.loadFromJSON(canvasJsonObject, () => {
        canvas.renderAll();
      });
      return;
    }

    if (action === "deleteSelected") {
      deleteSelected();
    }

    if (action === "selectAll") {
      selectByGroup(
        getLabeledObjects().filter(({ info }) => TOOL_INFO_BOUNDED_BOX !== info)
      );
      return;
    }

  if (action === "reset") {
    isCanvasSyncSuppressed = true;
    try {
      objects = [];
      setObjects(objects);
      canvas.clear();
      canvas.renderAll();
      const { setUndoStack, setRedoStack } = getImageToolSelectionStore();
      setUndoStack([]);
      setRedoStack([]);
    } finally {
      isCanvasSyncSuppressed = false;
    }
    return;
  }

    if (action === "combine") {
      combineLabels(getActiveLabeledObjects(), { width, height });
      return;
    }

    if (action === "seq") {
      if (Array.isArray(data?.seq)) {
        updateSeq(data.seq);
      } else if (Array.isArray(data)) {
        updateSeq(data as Array<{ unique: string; seq: number }>);
      }
      return;
    }

    if (action === "addClass") {
      const activeObjects = getActiveLabeledObjects();

      const label: Partial<LabeledFabricObject> & { labelType?: string } = {
        class: data?.class,
        labelType: LABEL_TYPE_CLASSIFICATION,
      };
      if (activeObjects.length) {
        label.labelType = undefined;
      }

      addLabelObject(label as LabeledFabricObject);

      const applyClassToObjects = async (
        targets: LabeledFabricObject[]
      ): Promise<void> => {
        if (!targets.length) {
          pushUndoStack();
          return;
        }
        const updatedTargets: LabeledFabricObject[] = [];
        for (const object of targets) {
          object.class = data?.class ?? object.class;
          if (data?.labelInsertData) {
            const nextInsertData = data.labelInsertData as
              | (LabelInsertData & { id?: string })
              | undefined;
            const currentInsertData = object.labelInsertData as
              | (LabelInsertData & { id?: string })
              | undefined;
            if (currentInsertData) {
              object.labelInsertData = {
                ...currentInsertData,
                ...nextInsertData,
                id: currentInsertData.id ?? nextInsertData?.id,
                policyId:
                  nextInsertData?.policyId ?? currentInsertData.policyId,
                inferenceType:
                  currentInsertData.inferenceType ??
                  nextInsertData?.inferenceType,
                unitType:
                  currentInsertData.unitType ?? nextInsertData?.unitType,
                labelType:
                  nextInsertData?.labelType ?? currentInsertData.labelType,
              };
            } else {
              object.labelInsertData = nextInsertData;
            }
          }
          const normalizedOpacity =
            typeof data?.opacity === "number"
              ? data.opacity
              : typeof object.opacity === "number"
                ? object.opacity
                : 1;
          object.opacity = normalizedOpacity;
          if (data?.hex) {
            const targetOpacityPercent = multiple(normalizedOpacity, 100);
            const colored = toLabeledObject(
              await setColor(object, data.hex, targetOpacityPercent)
            );
            colored.opacity = normalizedOpacity;
            updatedTargets.push(colored);
          } else {
            updatedTargets.push(object);
          }
        }
        updateLabelObject(updatedTargets);
        setSelectedObject(updatedTargets);
        if (updatedTargets.length === 1) {
          canvas.setActiveObject(updatedTargets[0]).renderAll();
        } else if (updatedTargets.length > 1) {
          const selection = new ActiveSelection(updatedTargets, { canvas });
          canvas.setActiveObject(selection).renderAll();
        }
        pushUndoStack();
        compareByObjects([...getLabeledObjects()]);
      };

      if (activeObjects.length > 1) {
        combineLabels(activeObjects, { width, height }, (combinedObject) => {
          if (!combinedObject) {
            return;
          }
          void applyClassToObjects([combinedObject]);
        });
        return;
      }

      if (activeObjects.length === 1) {
        void applyClassToObjects(activeObjects);
        return;
      }

      pushUndoStack();
      return;
    }

    if (action === "deleteObjectsOfTool") {
      canvas.remove(
        ...getLabeledObjects().filter(({ info }) => info === data?.info)
      );
    }

    if (action === "addObjects") {
      canvas.add(...(data?.objects ?? []));
      if (data?.onDone) {
        if (onDone) {
          onDone();
        }
      }
    }

    if (action === "deselectAll") {
      canvas.discardActiveObject().renderAll();
    }

    if (action === "undo") {
      undo();
    }

    if (action === "redo") {
      redo();
    }
  };

  /**
   * zustand 반영
   * @param {"added" | "modified" | "removed" | "deselected"} action
   * @param {FabricObject} state
   */
  const dispatchState = function (
    action: "added" | "modified" | "removed" | "deselected",
    state: LabeledFabricObject & { _objects?: LabeledFabricObject[] }
  ) {
    if (action === "added") {
      setSelectedObject([state]);
      addLabelObject(state);
    }

    if (action === "modified") {
      if (!state._objects) {
        setSelectedObject([state]);
        updateLabelObject([state]);
      } else {
        const updatedObjects = state._objects.map((object) => {
          const trueLeft =
            (object.trueLeft ?? object.left ?? 0) + movedMousePosition.x;
          const trueTop =
            (object.trueTop ?? object.top ?? 0) + movedMousePosition.y;
          object.set({ trueLeft, trueTop });
          object.trueLeft = trueLeft;
          object.trueTop = trueTop;
          return object;
        });
        movedMousePosition.x = 0;
        movedMousePosition.y = 0;
        setSelectedObject(updatedObjects);
        updateLabelObject(updatedObjects);
      }
    }

    if (action === "removed") {
      if (!state.replaced) {
        deleteLabelObject(state);
      }
    }

    if (action === "deselected") {
      setSelectedObject([]);
    }
  };

  const combineLabels = (
    targetObjects: LabeledFabricObject[],
    { width, height }: { width: number; height: number },
    onCombined?: (object: LabeledFabricObject | null) => void
  ) => {
    if (!targetObjects.length) {
      onCombined?.(null);
      return;
    }
    const ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) {
      onCombined?.(null);
      return;
    }
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    const c = new Canvas(ctx.canvas);
    c.setWidth(width);
    c.setHeight(height);
    c.add(...targetObjects);
    c.renderAll();
    const imageData = c
      .getContext()
      .getImageData(0, 0, c.getWidth(), c.getHeight());
    const { canvas: croppedCanvas, minX, minY } = cropAlphaArea(imageData);
    const dataUrl = croppedCanvas.toDataURL();
    const { fill, hex, alpha, toHex, stroke } = targetObjects[0];
    const isBrushOnly = targetObjects.every(
      ({ info }) => (info ?? "") === TOOL_INFO_BRUSH
    );
    const strokeValue = isBrushOnly ? undefined : stroke;
    FabricImage.fromURL(
      dataUrl,
      (image) => {
        const labeledImage = image as fabric.Image & LabeledFabricObject;
        canvas.remove(...targetObjects);
        const polygon = convertImageToPolygon(labeledImage);
        if (polygon) {
          const labeledPolygon = polygon as fabric.Path & LabeledFabricObject;
          labeledPolygon.set({
            fill,
          });
          labeledPolygon.set(
            strokeValue
              ? { stroke: strokeValue }
              : { stroke: undefined, strokeWidth: 0 }
          );
          labeledPolygon.info = TOOL_INFO_COMBINED_LABELS;
          labeledPolygon.hex = hex;
          labeledPolygon.alpha = alpha;
          labeledPolygon.toHex = toHex;
          labeledPolygon.labelInsertData = labeledImage.labelInsertData;
          canvas.add(labeledPolygon);
          canvas.setActiveObject(labeledPolygon);
          onCombined?.(labeledPolygon);
        } else {
          canvas.add(labeledImage);
          canvas.setActiveObject(labeledImage);
          onCombined?.(labeledImage);
        }
        canvas.renderAll();
      },
      {
        left: minX,
        top: minY,
        objectCaching: false,
        selectable: true,
        info: TOOL_INFO_COMBINED_LABELS,
        fill,
        hex,
        alpha,
        toHex,
        ...(strokeValue ? { stroke: strokeValue } : {}),
      } as fabric.IImageOptions & LabeledFabricObject
    );
    c.dispose();
    ctx.canvas.remove();
  };

  const handleOnChange = function (
    action: "added" | "modified" | "removed",
    object: any
  ) {
    if (isCanvasSyncSuppressed) {
      return;
    }
    const execute = () => {
      if (!object.target) {
        return;
      }
      const { target } = object;
      const modify = (target: LabeledFabricObject) => {
        const isBox = [TOOL_INFO_BOUNDED_BOX, TOOL_INFO_FILLED_BOX].includes(
          target.info ?? ""
        );
        const level = canvas.getZoom();
        const canvasWidth = divide(Number(canvas.width), level);
        const canvasHeight = divide(Number(canvas.height), level);
        let left = target.left ?? 0;
        let top = target.top ?? 0;
        let width = target.width ?? 0;
        let height = target.height ?? 0;

        const trim = () => {
          if (
            left < 0 ||
            top < 0 ||
            left + width < 0 ||
            top + height < 0 ||
            left > canvasWidth ||
            top > canvasHeight ||
            left + width > canvasWidth ||
            top + height > canvasHeight
          ) {
            canvas.remove(target);
            target.removed = true;
            dispatchState("removed", target);
            return;
          }
        };

        const modifyLayout = () => {
          if (canvasWidth < left + width) {
            width =
              canvasWidth -
              left -
              (target.info === TOOL_INFO_BOUNDED_BOX
                ? STROKE_WIDTH_BOUNDED_BOX
                : 0);
          }

          if (canvasHeight < top + height) {
            height =
              canvasHeight -
              top -
              (target.info === TOOL_INFO_BOUNDED_BOX
                ? STROKE_WIDTH_BOUNDED_BOX
                : 0);
          }

          if (0 > left) {
            width = width + left;
            left = 0;
          }

          if (0 > top) {
            height = height + top;
            top = 0;
          }

          target.set({ left, top, width, height });
          canvas.renderAll();
        };

        if (isBox) {
          modifyLayout();
        } else {
          trim();
        }
      };

      if (isDoing) {
        isDoing = false;
        setIsDoing(isDoing);
        return;
      }

      if (!target.evented) {
        return;
      }

      if (action === "added") {
        if (
          target instanceof Path &&
          !(target as unknown as LabeledFabricObject).info
        ) {
          (target as unknown as LabeledFabricObject).info = TOOL_INFO_BRUSH;
          target.selectable = false;
        }

        target.unique = target.unique || uuidv4();
        target.labeler = labeler;
        const fillOrStroke =
          typeof target.fill === "string"
            ? target.fill
            : typeof target.stroke === "string"
              ? target.stroke
              : "rgba(0,0,0,1)";
        const { hex, alpha } = toHex(fillOrStroke);
        target.hex = target.hex || hex;
        target.alpha = target.alpha || alpha;
        const seqs = objects
          .map(({ seq }) => seq)
          .filter(
            (seq): seq is number => typeof seq === "number" && !isNaN(seq)
          );
        const nextSeq = (seqs.length ? Math.max(...seqs) : -1) + 1;
        target.seq = target.seq || nextSeq;

        const { payload, classMeta } = useLabelInsertPayloadStore.getState();
        if (payload) {
          const inferenceType = getInferenceType(target.info);
          const labelData: LabelInsertData = {
            ...payload,
            inferenceType,
          };
          target.set({
            labelInsertData: labelData,
            labelPayload: labelData,
          });
          const colorValue = classMeta?.color;
          const opacityValue =
            typeof classMeta?.opacity === "number"
              ? classMeta.opacity
              : (target.opacity ?? 1);
          if (colorValue) {
            const { hex: policyHex, alpha: policyAlpha } = toHex(colorValue);
            const isBrush = target.info === TOOL_INFO_BRUSH;
            const isBoundedBox = target.info === TOOL_INFO_BOUNDED_BOX;
            const fillValue =
              isBrush || isBoundedBox ? "rgba(0,0,0,0)" : colorValue;
            const shouldColorStroke = isBrush || isBoundedBox;
            target.set({
              ...(shouldColorStroke ? { stroke: colorValue } : {}),
              fill: fillValue,
              opacity: opacityValue,
            });
            target.hex = policyHex;
            target.alpha = policyAlpha;
          }
        }
      }

      if (!target.replaced) {
        dispatchState(action, target);
      }
      objects = getLabeledObjects();
      setObjects(objects);
      // TODO: 재정렬
      if (target.info !== TOOL_INFO_SEGMENT_ANYTHING) {
        modify(target);
      }
      if (!target.passStack && !target.replaced) {
        pushUndoStack();
      }
      if (action !== "added") {
        dispatchState(action, target);
      }

      compareByObjects([...getLabeledObjects()]);

      emitLabelEvent("changed", {
        action,
        objects:
          target._objects && target._objects.length > 1 ? [target] : objects,
      });
    };

    if (EXCEPTION_TOOLS.includes(object.target.info ?? "")) {
      const canvasJsonObject = getCanvasJSON();
      canvasJsonObject.objects = canvasJsonObject.objects.filter(
        ({ info }) => !EXCEPTION_TOOLS.includes(info ?? "")
      );
      if (setCanvasJSON) {
        setCanvasJSON(canvasJsonObject);
      }
      return;
    }

    if (action === "removed") {
      const target = object.target as LabeledFabricObject | undefined;
      if (!target) {
        return;
      }
      if (!isDoing) {
        dispatchState(action, target);
      }
      objects = getLabeledObjects();
      setObjects(objects);
      compareByObjects([...objects]);
      useLabelBatchStore.getState().syncFabricObjects(objects);
      emitLabelEvent("changed", { action, objects });
      return;
    }

    if (timeoutRef) {
      clearTimeout(timeoutRef);
    }

    if (object.target.info === TOOL_INFO_SEGMENT_ANYTHING) {
      isDoing = Boolean(object.target.undo || object.target.redo);
      setIsDoing(isDoing);
      return execute();
    }

    timeoutRef = setTimeout(() => {
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
      timeoutRef = null;
      setTimeoutRef(timeoutRef);
      execute();
    }, 100);
    setTimeoutRef(timeoutRef);
  };

  const syncCanvasObjectsStore = () => {
    const labeledObjects = getLabeledObjects();
    compareByObjects([...labeledObjects]);
  };

  const handleOnSelect = function ({ deselected, e }: FabricPointerEvent) {
    if (deselected) {
      deselected.forEach((item) => {
        const labeled = item as LabeledFabricObject;
        labeled.trueLeft = undefined;
        labeled.trueTop = undefined;
        labeled.set({
          selected: false,
          copied: false,
        });
      });
      updateLabelObject(deselected);
    }

    const items = getActiveLabeledObjects();

    if (!items || !items.length) {
      dispatchState("deselected", {} as LabeledFabricObject);
      emitLabelEvent("blur");
      const control = FabricObject.prototype.controls;
      Object.keys(control).forEach((key) => (control[key].visible = false));
      syncCanvasObjectsStore();
      return;
    }

    if (readOnly) {
      canvas.discardActiveObject().renderAll();
      emitLabelEvent("blur");
      syncCanvasObjectsStore();
      return;
    }

    if (
      !isCtrlDown &&
      items.length === 1 &&
      [TOOL_INFO_BOUNDED_BOX, TOOL_INFO_FILLED_BOX].includes(
        items[0].info ?? ""
      )
    ) {
      const control = FabricObject.prototype.controls;
      Object.keys(control).forEach((key) => {
        control[key].visible = !readOnly;
        control.mtr.visible = false;
      });
      canvas.renderAll();
    }

    if (
      items.length === 1 &&
      ![TOOL_INFO_BOUNDED_BOX, TOOL_INFO_FILLED_BOX].includes(
        items[0].info ?? ""
      )
    ) {
      const control = FabricObject.prototype.controls;
      Object.keys(control).forEach((key) => (control[key].visible = false));
      canvas.renderAll();
    }

    if (items.length === 1 && readOnly) {
      items[0].set({
        hasControls: false,
        lockMovementX: true,
        lockMovementY: true,
      });
      canvas.renderAll();
    }

    const activeObjectInstance = canvas.getActiveObject() as
      | LabeledFabricObject
      | undefined;

    if (items.find(({ info }) => MOVEMENT_LOCK_TOOLS.includes(info ?? ""))) {
      activeObjectInstance?.set({ lockMovementX: true, lockMovementY: true });
    }

    const { undoStack } = getImageToolSelectionStore();
    const str = undoStack[undoStack.length - 1];
    const stack: LabeledFabricObject[] = ((str
      ? (JSON.parse(str) as CanvasJSON).objects
      : getCanvasJSON().objects) || []) as LabeledFabricObject[];

    items.forEach((item) => {
      const state = stack.find(
        ({ unique }) => unique && item.unique === unique
      );
      const trueLeft = state?.left ?? item.left ?? 0;
      const trueTop = state?.top ?? item.top ?? 0;
      item.set({
        selected: true,
        ...(selectedLayoutStyle ? selectedLayoutStyle : {}),
        ...(items.length > 1
          ? {
              trueLeft,
              trueTop,
            }
          : {}),
      });
    });

    if (items.length === 1) {
      dispatchState("modified", items[0]);
    } else if (items.length > 1) {
      setSelectedObject(items);
    }

    if (e instanceof MouseEvent && !isUndoRedoBlockedMode()) {
      pushUndoStack();
    }

    if (activeObjectInstance) {
      emitLabelEvent("focus", {
        uniques: items
          .map(({ unique }) => unique)
          .filter((value): value is string => Boolean(value)),
        objects: [activeObjectInstance],
      });
    }

    syncCanvasObjectsStore();
  };

  const handleOnKeyDown = function (e: KeyboardEvent) {
    if (!keyboardEventsEnabled) {
      return;
    }

    if (e.shiftKey) {
      objects.forEach((object) => {
        object.selectable = false;
      });
    }

    if (e.code === "KeyZ" && (e.ctrlKey || e.metaKey)) {
      if (e.shiftKey) {
        if (isUndoRedoBlockedMode()) {
          alertUndoBlocked();
        } else {
          redo();
        }
      } else {
        if (isUndoRedoBlockedMode()) {
          alertUndoBlocked();
        } else {
          undo();
        }
      }
    }

    if (e.code === "KeyG" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      combineLabels(getActiveLabeledObjects(), { width, height });
    }

    if (e.ctrlKey || e.metaKey) {
      isCtrlDown = true;
      activeObjects = getActiveLabeledObjects();
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      deleteSelected(e.shiftKey);
    }

    if (e.key === "Escape") {
      canvas.discardActiveObject();
    }

    if (e.code === "Space") {
      canvas.defaultCursor = isMouseDown ? "grabbing" : "grab";
      canvas.discardActiveObject().renderAll();
      objects.forEach((object) => {
        object.selectable = false;
      });
    }
  };

  const handleOnKeyUp = function () {
    if (!keyboardEventsEnabled) {
      return;
    }
    if (resetKeyboardState) {
      resetKeyboardState();
    }
  };

  const handleOnMouseDown = function ({
    button,
  }: Pick<FabricPointerEvent, "button">) {
    if (button && isCtrlDown) {
      const control = FabricObject.prototype.controls;
      Object.keys(control).forEach((key) => (control[key].visible = false));
      const getFiltered = () => {
        const uniques: string[] = [];
        const filteredObjects: LabeledFabricObject[] = [];
        const execute = (item: LabeledFabricObject) => {
          if (item.unique && !uniques.includes(item.unique)) {
            item.lockMovementX = true;
            item.lockMovementY = true;
            uniques.push(item.unique);
            filteredObjects.push(item);
          }
        };
        activeObjects.forEach(execute);
        getActiveLabeledObjects().forEach(execute);
        return filteredObjects.filter(
          ({ info }) => info !== TOOL_INFO_BOUNDED_BOX
        );
      };
      selectByGroup(getFiltered());
    }
    isMouseDown = true;
  };

  const handleOnMouseUp = function () {
    isMouseDown = false;
  };

  const selectByGroup = (selectedObjects: LabeledFabricObject[]) => {
    if (!selectedObjects.length) {
      return;
    }
    canvas.setActiveObject(
      selectedObjects.length > 1
        ? new ActiveSelection(selectedObjects, { canvas })
        : selectedObjects[0]
    );
    canvas.renderAll();
  };

  const pushUndoStack = function () {
    const canvasInstance = getCanvasInstance();
    if (!canvasInstance) {
      // Canvas not yet initialized; skip storing undo snapshot.
      return;
    }
    const canvasJsonObject = getCanvasJSON(canvasInstance);

    canvasJsonObject.objects = canvasJsonObject.objects.filter(
      ({ info }) => !EXCEPTION_TOOLS.includes(info ?? "")
    );

    canvasJsonObject.objects.forEach((object) => (object.evented = false));

    const canvasJsonString = JSON.stringify(canvasJsonObject);

    const { undoStack, setUndoStack, setRedoStack } =
      getImageToolSelectionStore();
    setUndoStack([...undoStack, canvasJsonString]);
    setRedoStack([]);

    if (setCanvasJSON) {
      setCanvasJSON(canvasJsonObject);
    }
  };

  const undo = function () {
    if (!canvas) {
      return;
    }
    if (isUndoRedoBlockedMode()) {
      alertUndoBlocked();
      return;
    }
    const { undoStack, redoStack, setUndoStack, setRedoStack } =
      getImageToolSelectionStore();

    if (undoStack.length) {
      isDoing = true;
      setIsDoing(isDoing);
      const state = undoStack.pop();
      if (!state) {
        setUndoStack(undoStack);
        return;
      }
      setUndoStack(undoStack);
      setRedoStack([...redoStack, state]);

      const prevState = undoStack[undoStack.length - 1];

      const jsonObject: CanvasJSON = prevState
        ? (JSON.parse(prevState) as CanvasJSON)
        : createCanvasJSON();
      jsonObject.objects.forEach((object) => {
        object.undo = true;
      });

      canvas.loadFromJSON(
        jsonObject as unknown as fabric.ICanvasOptions,
        () => {
          renderSelectedObject();
          addLabelObjects(jsonObject.objects);
        }
      );
    }
  };

  const redo = function () {
    if (!canvas) {
      return;
    }
    if (isUndoRedoBlockedMode()) {
      alertUndoBlocked();
      return;
    }
    const { undoStack, redoStack, setUndoStack, setRedoStack } =
      getImageToolSelectionStore();

    if (redoStack.length > 0) {
      isDoing = true;
      setIsDoing(isDoing);
      const nextState = redoStack.pop();
      if (!nextState) {
        setRedoStack(redoStack);
        return;
      }
      setRedoStack(redoStack);
      setUndoStack([...undoStack, nextState]);

      const jsonObject = JSON.parse(nextState) as CanvasJSON;
      jsonObject.objects.forEach((object) => {
        object.redo = true;
      });

      canvas.loadFromJSON(
        jsonObject as unknown as fabric.ICanvasOptions,
        () => {
          renderSelectedObject();
          addLabelObjects(jsonObject.objects);
        }
      );
    }
  };

  const renderSelectedObject = function () {
    if (!canvas) {
      return;
    }
    objects = getLabeledObjects();
    setObjects(objects);
    const object = objects.find((item) => item.selected);
    if (object) {
      canvas.discardActiveObject().renderAll();
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        canvas.setActiveObject(object).renderAll();
      }, 100);
    }
    compareByObjects([...objects]);
    emitLabelEvent("init");
  };

  const deleteSelected = function (isSkipHasClass?: boolean) {
    if (!canvas) {
      return;
    }
    const objects = getActiveLabeledObjects();
    canvas.remove(
      ...(isSkipHasClass ? objects.filter((item) => !item.class) : objects)
    );
    canvas.discardActiveObject();
  };

  const { undoStack } = getImageToolSelectionStore();

  if (!undoStack.length) {
    pushUndoStack();
  }

  const onObjectAdded = (event: any) =>
    handleOnChange(
      "added",
      event as fabric.IEvent<Event> & {
        target: LabeledFabricObject & { _objects?: LabeledFabricObject[] };
      }
    );
  const onObjectModified = (event: any) =>
    handleOnChange(
      "modified",
      event as fabric.IEvent<Event> & {
        target: LabeledFabricObject & { _objects?: LabeledFabricObject[] };
      }
    );
  const onObjectRemoved = (event: any) =>
    handleOnChange(
      "removed",
      event as fabric.IEvent<Event> & {
        target: LabeledFabricObject & { _objects?: LabeledFabricObject[] };
      }
    );
  const onSelection = (event: any) =>
    handleOnSelect(event as FabricPointerEvent);
  const onMouseDownHandler = (event: any) =>
    handleOnMouseDown(event as FabricPointerEvent);
  const onMouseUpHandler = () => handleOnMouseUp();

  document.addEventListener("keydown", handleOnKeyDown);
  document.addEventListener("keyup", handleOnKeyUp);
  canvas.on("object:added", onObjectAdded);
  canvas.on("object:modified", onObjectModified);
  canvas.on("object:removed", onObjectRemoved);
  canvas.on("selection:created", onSelection);
  canvas.on("selection:updated", onSelection);
  canvas.on("selection:cleared", onSelection);
  canvas.on("mouse:down", onMouseDownHandler);
  canvas.on("mouse:up", onMouseUpHandler);

  const unsubscribeLabelEvents = subscribeLabelEvents(observeOnExternalEvent);

  onDone();

  const cleanUp = () => {
    if (!canvas) {
      return;
    }
    isCanvasSyncSuppressed = true;
    try {
      document.removeEventListener("keydown", handleOnKeyDown);
      document.removeEventListener("keyup", handleOnKeyUp);
      canvas.off("object:added", onObjectAdded);
      canvas.off("object:modified", onObjectModified);
      canvas.off("object:removed", onObjectRemoved);
      canvas.off("selection:created", onSelection);
      canvas.off("selection:updated", onSelection);
      canvas.off("selection:cleared", onSelection);
      canvas.off("mouse:down", onMouseDownHandler);
      canvas.off("mouse:up", onMouseUpHandler);

      unsubscribeLabelEvents();

      // Guard against partially initialized/already-disposed canvas to avoid fabric errors.
      if (typeof canvas.dispose === "function") {
        try {
          canvas.dispose();
        } catch (error) {
          // eslint-disable-next-line no-console -- cleanup failure diagnostic
          console.error("[imageLabelingTools] canvas dispose failed", error);
        }
      }
      canvas = null as unknown as FabricCanvas;
      setCanvasInstance(canvas);
      objects = [];
      setObjects(objects);
      const { setUndoStack, setRedoStack } = getImageToolSelectionStore();
      setUndoStack([]);
      setRedoStack([]);
      isDoing = false;
      setIsDoing(isDoing);

      if (resetSegmentations) {
        resetSegmentations();
      }
    } finally {
      isCanvasSyncSuppressed = false;
    }
  };

  return cleanUp;
};

export const toDataURL = ({
  width,
  height,
  object,
  format,
}: {
  width: number;
  height: number;
  object: LabeledFabricObject;
  format?: string;
}): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = new Canvas("canvas", {
      width,
      height,
    });

    const jsonObject = createCanvasJSON([object]);

    canvas.loadFromJSON(jsonObject, async () => {
      canvas.renderAll();
      const dataURL = canvas.toDataURL({ format });
      canvas.dispose();
      resolve(await replaceColors({ dataURL, object: object as any }));
    });
  });
};

async function replaceColors({
  dataURL,
  object,
}: {
  dataURL: string;
  object: LabeledFabricObject & { fill?: string; stroke?: string };
}): Promise<string> {
  const image = await createImage(dataURL);
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) {
    return dataURL;
  }
  ctx.canvas.width = image.width;
  ctx.canvas.height = image.height;
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const { data } = imageData;

  const { fill, stroke } = object;
  if (!stroke && !fill) {
    return dataURL;
  }
  const colorStr = String(stroke || fill);
  const rgba = colorStr
    .split(",")
    .map((str) => str.replaceAll("rgba(", "").replaceAll(")", ""));
  rgba.pop();
  const keepColor = rgba.join(",");

  const [rKeep, gKeep, bKeep] = keepColor.split(",").map(Number);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 0) {
      data[i] = rKeep;
      data[i + 1] = gKeep;
      data[i + 2] = bKeep;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const replacedDataURL = ctx.canvas.toDataURL();
  ctx.canvas.remove();
  return replacedDataURL;
}
