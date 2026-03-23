import { fabric } from "fabric";

import type { LabelInsertData, SegmentationBase64Value } from "../types/domain";
import { toHex } from "./imageLabelingColors";
import {
  EXPORT_PROPS,
  TOOL_INFO_BOUNDED_BOX,
  TOOL_INFO_FILLED_BOX,
} from "./imageLabelingConstants";
import type { LabeledFabricObject } from "./imageLabelingTypes";

type LabelInsertWithOptionalId = LabelInsertData & { id?: string };

const BOUNDING_BOX_INFOS = new Set([TOOL_INFO_BOUNDED_BOX, TOOL_INFO_FILLED_BOX]);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const toPositiveScale = (value?: unknown): number => {
  if (isFiniteNumber(value) && value !== 0) {
    return Math.abs(value);
  }
  return 1;
};

const getNumber = (value: unknown, fallback = 0) =>
  isFiniteNumber(value) ? value : fallback;

const ensureHexPrefix = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 7 || trimmed.length === 9) {
      return trimmed;
    }
    const { hex } = toHex(trimmed);
    return `#${hex}`;
  }
  const { hex } = toHex(trimmed);
  return `#${hex}`;
};

const resolveColorHex = (
  object: LabeledFabricObject,
  source: "fill" | "stroke" | "hex"
): string | undefined => {
  if (source === "fill" && typeof object.fill === "string") {
    return ensureHexPrefix(object.fill);
  }
  if (source === "stroke" && typeof object.stroke === "string") {
    return ensureHexPrefix(object.stroke);
  }
  if (source === "hex" && typeof object.hex === "string" && object.hex.length) {
    return ensureHexPrefix(`#${object.hex}`);
  }
  return undefined;
};

const extractClassInfo = (
  value: LabelInsertData["labelValue"]
): { className?: string; classIndex?: number } => {
  if (value && typeof value === "object") {
    const candidate = value as { className?: unknown; classIndex?: unknown };
    const className =
      typeof candidate.className === "string" ? candidate.className : undefined;
    const classIndex =
      typeof candidate.classIndex === "number" &&
      Number.isFinite(candidate.classIndex)
        ? candidate.classIndex
        : undefined;
    if (className !== undefined || classIndex !== undefined) {
      return { className, classIndex };
    }
  }
  return {};
};

const buildBoundingBoxValue = (
  object: LabeledFabricObject,
  baseValue: LabelInsertData["labelValue"]
): LabelInsertData["labelValue"] => {
  const classInfo = extractClassInfo(baseValue);
  const left = getNumber(object.left);
  const top = getNumber(object.top);
  const width = getNumber(object.width);
  const height = getNumber(object.height);
  const scaleX = toPositiveScale(object.scaleX);
  const scaleY = toPositiveScale(object.scaleY);
  const actualWidth = width * scaleX;
  const actualHeight = height * scaleY;

  const coord: [number, number, number, number] = [
    Math.round(left),
    Math.round(top),
    Math.round(left + Math.max(actualWidth, 0)),
    Math.round(top + Math.max(actualHeight, 0)),
  ];

  const fillHex =
    resolveColorHex(object, "fill") ??
    resolveColorHex(object, "hex") ??
    undefined;
  const strokeHex = resolveColorHex(object, "stroke") ?? fillHex;
  const opacity = isFiniteNumber(object.opacity)
    ? Number(object.opacity.toFixed(4))
    : undefined;
  const zindex = isFiniteNumber((object as { index?: number }).index)
    ? (object as { index?: number }).index
    : isFiniteNumber((object as { seq?: number }).seq)
      ? (object as { seq?: number }).seq
      : undefined;

  return {
    className: classInfo.className,
    classIndex: classInfo.classIndex,
    coord,
    color: fillHex,
    lineColor: strokeHex,
    opacity,
    zindex,
  };
};

const inferInferenceType = (
  object: LabeledFabricObject,
  base: LabelInsertWithOptionalId
): LabelInsertData["inferenceType"] => {
  if (base.inferenceType) {
    return base.inferenceType;
  }
  const info = object.info ?? "";
  return BOUNDING_BOX_INFOS.has(info) ? "OBJECT_DETECTION" : "SEGMENTATION";
};

const getOpacityPercent = (object: LabeledFabricObject): number | undefined => {
  if (typeof object.opacity === "number") {
    return Math.round(object.opacity * 100);
  }
  const alpha = typeof object.alpha === "string" ? object.alpha.trim() : "";
  if (alpha.endsWith("%")) {
    const numeric = Number(alpha.replace("%", "").trim());
    if (!Number.isNaN(numeric)) {
      return Math.round(numeric);
    }
  }
  return undefined;
};

const getSegOrder = (object: LabeledFabricObject): number | undefined => {
  if (typeof object.seq === "number" && Number.isFinite(object.seq)) {
    return Math.round(object.seq);
  }
  if (typeof object.index === "number" && Number.isFinite(object.index)) {
    return Math.round(object.index);
  }
  return undefined;
};

const getSegContentType = (dataUrl: string): string => {
  const match = /^data:(.+?);/i.exec(dataUrl);
  if (!match) {
    return "PNG";
  }
  const subtype = match[1]?.split("/")?.pop() ?? "png";
  return subtype?.toUpperCase() ?? "PNG";
};

const cloneObject = (
  object: LabeledFabricObject
): Promise<LabeledFabricObject> => {
  return new Promise((resolve) => {
    object.clone(
      (cloned: fabric.Object | null) => {
        resolve((cloned as LabeledFabricObject) ?? object);
      },
      EXPORT_PROPS
    );
  });
};

const exportSegmentationDataUrl = async (
  object: LabeledFabricObject
): Promise<string | null> => {
  if (typeof document === "undefined") {
    return null;
  }
  const rect = object.getBoundingRect(true, true);
  const width = Math.max(
    1,
    Math.round(rect?.width ?? (object.width ?? 0) * toPositiveScale(object.scaleX))
  );
  const height = Math.max(
    1,
    Math.round(rect?.height ?? (object.height ?? 0) * toPositiveScale(object.scaleY))
  );
  const canvasElement = document.createElement("canvas");
  canvasElement.width = width;
  canvasElement.height = height;
  const staticCanvas = new fabric.StaticCanvas(canvasElement, {
    width,
    height,
    renderOnAddRemove: false,
  });
  const cloned = await cloneObject(object);
  const offsetLeft = rect?.left ?? 0;
  const offsetTop = rect?.top ?? 0;
  cloned.set({
    left: (cloned.left ?? 0) - offsetLeft,
    top: (cloned.top ?? 0) - offsetTop,
  });
  staticCanvas.add(cloned);
  staticCanvas.renderAll();
  const dataUrl = staticCanvas.toDataURL({ format: "png" });
  staticCanvas.dispose();
  canvasElement.remove();
  return dataUrl;
};

const buildSegmentationValue = async (
  object: LabeledFabricObject,
  baseValue: LabelInsertData["labelValue"]
): Promise<SegmentationBase64Value | null> => {
  const dataUrl = await exportSegmentationDataUrl(object);
  if (!dataUrl) {
    return null;
  }
  const [, base64] = dataUrl.split(",");
  if (!base64) {
    return null;
  }
  const classInfo = extractClassInfo(baseValue);
  const segColor =
    resolveColorHex(object, "stroke") ??
    resolveColorHex(object, "fill") ??
    resolveColorHex(object, "hex") ??
    undefined;
  const segVector = JSON.stringify(object.toObject(EXPORT_PROPS));
  return {
    className: classInfo.className,
    classIndex: classInfo.classIndex,
    segColor: segColor ?? "#FFFFFF",
    segOrder: getSegOrder(object) ?? 0,
    segOpacity: getOpacityPercent(object) ?? 100,
    segBuffer: base64,
    segVector,
    segContentType: getSegContentType(dataUrl),
  };
};

export const serializeFabricObjectToLabel = async (
  object: LabeledFabricObject
): Promise<LabelInsertWithOptionalId | null> => {
  const base = object.labelInsertData as LabelInsertWithOptionalId | undefined;
  if (!base) {
    return null;
  }
  const inferenceType = inferInferenceType(object, base);
  let labelValue: LabelInsertData["labelValue"] = base.labelValue;
  let labelType = base.labelType;

  if (inferenceType === "OBJECT_DETECTION") {
    labelValue = buildBoundingBoxValue(object, base.labelValue);
  } else if (inferenceType === "SEGMENTATION") {
    const segmentationValue = await buildSegmentationValue(object, base.labelValue);
    if (segmentationValue) {
      labelValue = segmentationValue;
    }
    labelType = undefined;
  }

  return {
    ...base,
    labelType,
    inferenceType,
    labelValue,
  };
};
