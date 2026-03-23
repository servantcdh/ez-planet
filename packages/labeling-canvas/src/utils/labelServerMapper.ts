import type {
  BoxValue,
  LabelDetailResponse,
  LabelInsertData,
  LabelValue,
  SegmentationResponseValue,
} from "../types/domain";
import {
  EXPORT_PROPS,
  STROKE_WIDTH_BOUNDED_BOX,
  TOOL_INFO_BOUNDED_BOX,
} from "./imageLabelingConstants";
import { Rect } from "./imageLabelingCore";
import type { LabeledFabricObject } from "./imageLabelingTypes";

type LabelInsertWithOptionalId = LabelInsertData & { id?: string };

const DEFAULT_RECT_STROKE = "#FF3B30";

const isBoxValue = (
  value: LabelValue | undefined,
  inferenceType: LabelDetailResponse["inferenceType"]
): value is BoxValue => {
  if (inferenceType !== "OBJECT_DETECTION") {
    return false;
  }
  return Boolean(value && typeof value === "object" && "coord" in value);
};

const isSegmentationValue = (
  value: LabelValue | undefined,
  inferenceType: LabelDetailResponse["inferenceType"]
): value is SegmentationResponseValue => {
  if (inferenceType !== "SEGMENTATION") {
    return false;
  }
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as {
    segVector?: unknown;
    vectorData?: unknown;
  };
  const hasSegVector =
    typeof candidate.segVector === "string" && candidate.segVector.length > 0;
  const hasVectorData =
    typeof candidate.vectorData === "string" && candidate.vectorData.length > 0;
  return hasSegVector || hasVectorData;
};

const buildLabelInsertData = (
  label: LabelDetailResponse
): LabelInsertWithOptionalId => ({
  id: label.id,
  contentSetId: label.contentSetId ?? undefined,
  elementId: label.elementId ?? undefined,
  policyId: label.policyId,
  schemaName: label.schemaName ?? undefined,
  inferenceType: label.inferenceType,
  labelType: label.labelType,
  unitType: label.unitType,
  labelValue: label.labelValue ?? undefined,
  attributeValues: label.attributeValues ?? [],
});

const toAlphaPercent = (value: number | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  if (value > 1) {
    return `${Math.round(value)}%`;
  }
  return `${Math.round(value * 100)}%`;
};

const buildBoundingBoxObject = (
  label: LabelDetailResponse,
  boxValue: BoxValue
): LabeledFabricObject | null => {
  const coords = boxValue.coord ?? [];
  const left = Number(coords[0]);
  const top = Number(coords[1]);
  const right = Number(coords[2]);
  const bottom = Number(coords[3]);
  if (
    !Number.isFinite(left) ||
    !Number.isFinite(top) ||
    !Number.isFinite(right) ||
    !Number.isFinite(bottom)
  ) {
    return null;
  }
  const width = Math.max(right - left, 1);
  const height = Math.max(bottom - top, 1);
  if (width <= 0 || height <= 0) {
    return null;
  }

  const rect = new Rect({
    left,
    top,
    width,
    height,
    fill: "",
    stroke: boxValue.lineColor ?? boxValue.color ?? DEFAULT_RECT_STROKE,
    strokeWidth: STROKE_WIDTH_BOUNDED_BOX,
    strokeUniform: true,
    objectCaching: false,
    selectable: false,
    evented: true,
  });
  const labeledRect = rect as LabeledFabricObject;
  labeledRect.info = TOOL_INFO_BOUNDED_BOX;
  labeledRect.unique = label.id;
  labeledRect.seq =
    (typeof boxValue.zindex === "number" && Number.isFinite(boxValue.zindex)
      ? boxValue.zindex
      : undefined) ?? 0;
  labeledRect.alpha = toAlphaPercent(boxValue.opacity);
  labeledRect.opacity =
    typeof boxValue.opacity === "number" ? boxValue.opacity : 1;
  labeledRect.class = boxValue.className;
  labeledRect.labelInsertData = buildLabelInsertData(label);
  labeledRect.labeler = label.createdBy ?? labeledRect.labeler;
  return labeledRect.toObject(EXPORT_PROPS) as LabeledFabricObject;
};

const buildSegmentationObject = (
  label: LabelDetailResponse,
  segValue: SegmentationResponseValue
): LabeledFabricObject | null => {
  const vector =
    segValue.segVector ??
    (segValue as unknown as { vectorData?: string }).vectorData;
  if (!vector) {
    return null;
  }
  try {
    const parsed = JSON.parse(vector) as LabeledFabricObject;
    parsed.labelInsertData = buildLabelInsertData(label);
    parsed.unique = label.id;
    parsed.seq =
      (typeof segValue.zindex === "number" && Number.isFinite(segValue.zindex)
        ? segValue.zindex
        : undefined) ?? parsed.seq;
    parsed.class = segValue.className ?? parsed.class;
    parsed.alpha = toAlphaPercent(
      typeof segValue.opacity === "number" ? segValue.opacity / 100 : undefined
    );
    parsed.labeler = label.createdBy ?? parsed.labeler;
    return parsed;
  } catch (error) {
    // eslint-disable-next-line no-console -- 서버 벡터 파싱 실패 진단용
    console.error("[labelServerMapper] failed to parse segmentation vector", {
      labelId: label.id,
      error,
    });
    return null;
  }
};

export function mapLabelResponsesToFabricObjects(
  labels: LabelDetailResponse[] | undefined
): LabeledFabricObject[] {
  if (!labels?.length) {
    return [];
  }
  const result: LabeledFabricObject[] = [];
  labels.forEach((label) => {
    if (isBoxValue(label.labelValue, label.inferenceType)) {
      const object = buildBoundingBoxObject(label, label.labelValue);
      if (object) {
        result.push(object);
      }
      return;
    }
    if (isSegmentationValue(label.labelValue, label.inferenceType)) {
      const object = buildSegmentationObject(label, label.labelValue);
      if (object) {
        result.push(object);
      }
    }
  });
  return result;
}
