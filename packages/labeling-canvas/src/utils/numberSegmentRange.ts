import type { WorkspaceNavigationChartAxisSnapshot } from "../store/workspaceNavigationDetailSelection.store";
import type {
  ChartValue,
  LabelDetailResponse,
  LabelInsertData,
} from "../types/domain";

export type NumberSegmentSource = {
  label: LabelDetailResponse | (LabelInsertData & { id?: string });
  tempId?: string;
  color?: string;
};

export type NumberSegmentGroup = {
  key: string;
  start: number;
  end: number;
  color?: string;
  opacity?: number;
  zindex?: number;
  labelIds: string[];
  tempIds: string[];
  sources: NumberSegmentSource[];
  policyId?: string | null;
  classIndex?: number;
  className?: string;
  columnName?: string;
};

type SegmentEntry = {
  index: number;
  source: NumberSegmentSource;
  policyId?: string | null;
  classIndex?: number;
  className?: string;
  columnName: string;
  color?: string;
  opacity?: number;
  zindex?: number;
};

const buildPointIndexMap = (
  snapshot: WorkspaceNavigationChartAxisSnapshot
) => {
  const indexMap = new Map<string, number>();
  snapshot.yAxis.series.forEach((series) => {
    series.points.forEach((point, index) => {
      if (!point.elementId || !point.columnId) {
        return;
      }
      const key = `${point.elementId}::${point.columnId}`;
      if (!indexMap.has(key)) {
        indexMap.set(key, index);
      }
    });
  });
  return indexMap;
};

const buildSegmentKey = (
  labelIds: string[],
  tempIds: string[],
  fallback: string
) => {
  const uniqueLabelIds = Array.from(new Set(labelIds));
  const uniqueTempIds = Array.from(new Set(tempIds));
  const parts: string[] = [];
  if (uniqueLabelIds.length) {
    parts.push(`id:${uniqueLabelIds.sort().join(",")}`);
  }
  if (uniqueTempIds.length) {
    parts.push(`temp:${uniqueTempIds.sort().join(",")}`);
  }
  const base = parts.length ? parts.join("|") : fallback;
  return `segment:${base}`;
};

function buildSegmentGroup(
  current: { startIndex: number; endIndex: number; entries: SegmentEntry[] },
  metaKey: string
): NumberSegmentGroup {
  const labelIds = current.entries
    .map((entry) => entry.source.label.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const tempIds = current.entries
    .filter((entry) => !entry.source.label.id)
    .map((entry) => entry.source.tempId)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
  const key = buildSegmentKey(
    labelIds,
    tempIds,
    `${metaKey}::${current.startIndex}-${current.endIndex}`
  );
  const first = current.entries[0];
  return {
    key,
    start: current.startIndex,
    end: current.endIndex + 1,
    color: first.color,
    opacity: first.opacity,
    zindex: first.zindex,
    labelIds: Array.from(new Set(labelIds)),
    tempIds: Array.from(new Set(tempIds)),
    sources: current.entries.map((entry) => entry.source),
    policyId: first.policyId ?? null,
    classIndex: first.classIndex,
    className: first.className,
    columnName: first.columnName,
  };
}

export const buildNumberSegmentGroups = (
  sources: NumberSegmentSource[],
  snapshot: WorkspaceNavigationChartAxisSnapshot
): NumberSegmentGroup[] => {
  if (!sources.length || !snapshot.xAxis.ticks.length) {
    return [];
  }

  const pointIndexMap = buildPointIndexMap(snapshot);
  const grouped = new Map<string, SegmentEntry[]>();

  sources.forEach((source) => {
    const labelValue = source.label.labelValue as ChartValue | undefined;
    const columnName =
      typeof labelValue?.columnName === "string" && labelValue.columnName.length
        ? labelValue.columnName
        : null;
    if (!columnName) {
      return;
    }
    const elementId =
      typeof source.label.elementId === "string" &&
      source.label.elementId.length > 0
        ? source.label.elementId
        : null;
    if (!elementId) {
      return;
    }
    const index = pointIndexMap.get(`${elementId}::${columnName}`);
    if (typeof index !== "number") {
      return;
    }
    const classIndex =
      typeof labelValue?.classIndex === "number" ? labelValue.classIndex : null;
    const className =
      typeof labelValue?.className === "string" && labelValue.className.length
        ? labelValue.className
        : null;
    if (classIndex === null && !className) {
      return;
    }
    const classKey =
      classIndex !== null ? `idx-${classIndex}` : `name-${className}`;
    const policyKey = source.label.policyId ?? "no-policy";
    const resolvedColor =
      typeof labelValue?.color === "string" && labelValue.color.length > 0
        ? labelValue.color
        : source.color;
    const resolvedOpacity =
      typeof labelValue?.opacity === "number" &&
      Number.isFinite(labelValue.opacity)
        ? labelValue.opacity
        : undefined;
    const resolvedZIndex =
      typeof labelValue?.zindex === "number" &&
      Number.isFinite(labelValue.zindex)
        ? labelValue.zindex
        : undefined;
    const metaKey = [
      policyKey,
      classKey,
      columnName,
      resolvedColor ?? "no-color",
      resolvedOpacity ?? "no-opacity",
      resolvedZIndex ?? "no-zindex",
    ].join("::");
    const entries = grouped.get(metaKey) ?? [];
    entries.push({
      index,
      source,
      policyId: source.label.policyId ?? null,
      classIndex: classIndex ?? undefined,
      className: className ?? undefined,
      columnName,
      color: resolvedColor,
      opacity: resolvedOpacity,
      zindex: resolvedZIndex,
    });
    grouped.set(metaKey, entries);
  });

  const segments: NumberSegmentGroup[] = [];

  grouped.forEach((entries, metaKey) => {
    const ordered = [...entries].sort((a, b) => a.index - b.index);
    let current: {
      startIndex: number;
      endIndex: number;
      entries: SegmentEntry[];
    } | null = null;

    ordered.forEach((entry) => {
      if (!current) {
        current = {
          startIndex: entry.index,
          endIndex: entry.index,
          entries: [entry],
        };
        return;
      }
      if (entry.index <= current.endIndex) {
        current.entries.push(entry);
        return;
      }
      if (entry.index === current.endIndex + 1) {
        current.endIndex = entry.index;
        current.entries.push(entry);
        return;
      }
      segments.push({
        ...buildSegmentGroup(current, metaKey),
      });
      current = {
        startIndex: entry.index,
        endIndex: entry.index,
        entries: [entry],
      };
    });

    if (current) {
      segments.push({
        ...buildSegmentGroup(current, metaKey),
      });
    }
  });

  return segments;
};
