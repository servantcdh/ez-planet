import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ReactECharts from "echarts-for-react";
import { v4 as uuidv4 } from "uuid";

import Tip from "@/components/molecules/Tip";

import { useWorkspaceLabelSearchParams } from "../hooks/useWorkspaceLabelSearchParams";
import { useLabelSearch } from "../queries";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useLabelInsertPayloadStore } from "../store/labelInsertPayload.store";
import { useLabelSelectionStore } from "../store/labelSelection.store";
import {
  OVERLAY_LAYER_INDEX,
  useLayerModeStore,
} from "../store/layerMode.store";
import { useNumberLabelingToolSelectionStore } from "../store/numberLabelingToolSelection.store";
import {
  NUMBER_CHART_TYPES,
  useNumberLabelUiStore,
} from "../store/numberLabelUi.store";
import { useNumberSegmentSelectionStore } from "../store/numberSegmentSelection.store";
import { useNumberValidationRangeSelectionStore } from "../store/numberValidationRangeSelection.store";
import {
  useWorkspaceNavigationDetailSelectionStore,
  type WorkspaceNavigationChartAxisSnapshot,
} from "../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceValidationModeStore } from "../store/workspaceValidationMode.store";
import type { ChartValue, LabelInsertData } from "../types/domain";
import {
  buildNumberSegmentGroups,
  type NumberSegmentGroup,
  type NumberSegmentSource,
} from "../utils/numberSegmentRange";
import {
  buildTickIndexLookup,
  resolveTickIndexFromRawValue,
} from "../utils/numberTickIndex";

interface WorkspaceNumberChartProps {
  snapshot: WorkspaceNavigationChartAxisSnapshot;
  zoomLevel?: number;
}

type SegmentRange = NumberSegmentGroup;

type MarkAreaPoint = {
  xAxis: number;
  yAxis: number | "min" | "max";
  itemStyle?: {
    color: string;
    opacity?: number;
    borderColor?: string;
    borderWidth?: number;
  };
  label?: {
    show: boolean;
  };
  name?: string;
  rangeKey?: string;
};

type MarkAreaData = [MarkAreaPoint, MarkAreaPoint];

interface NumberChartSeries {
  name: string;
  type: "line" | "bar";
  data: (number | null)[];
  connectNulls?: boolean;
  smooth?: boolean;
  showSymbol?: boolean;
  symbolSize?: number;
  emphasis: {
    focus: "series";
  };
  barMaxWidth?: number;
  markArea?: {
    silent: boolean;
    data: MarkAreaData[];
  };
}

const DEFAULT_RANGE_COLOR = "rgba(250, 204, 21, 0.35)";
const SERIES_COLORS = [
  "#2AA3FF",
  "#FF8A65",
  "#64B5F6",
  "#9575CD",
  "#4DB6AC",
  "#FFB74D",
  "#BA68C8",
];
const SEGMENT_DEFAULT_OPACITY = 0.28; // 정책 클래스가 정의한 opacity를 밀어내고 이 기본값을 항상 적용하도록 수정합니다.
const CHART_GRID = {
  top: 32,
  left: 48,
  right: 16,
  bottom: 112,
};
const SLIDER_HEIGHT = 64;
const SLIDER_BOTTOM = 8;

interface SliderSegment {
  key: string;
  startPercent: number;
  widthPercent: number;
  color: string;
  isSelected: boolean;
}

type DragSelection = {
  startIndex: number;
  endIndex: number;
  left: number;
  width: number;
  color: string;
};

function formatValueLabel(value: unknown): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString() : "-";
  }
  if (value == null) {
    return "-";
  }
  return String(value);
}

function resolveRangeKey(params: {
  componentType?: string;
  name?: string;
  data?: unknown;
}): string | null {
  if (params.componentType !== "markArea") {
    return null;
  }
  if (typeof params.name === "string" && params.name.length > 0) {
    return params.name;
  }
  const data = params.data;
  if (Array.isArray(data)) {
    const first = data[0] as { rangeKey?: unknown; name?: unknown } | undefined;
    const second = data[1] as
      | { rangeKey?: unknown; name?: unknown }
      | undefined;
    const rangeKey =
      first?.rangeKey ??
      first?.name ??
      second?.rangeKey ??
      second?.name ??
      null;
    return typeof rangeKey === "string" ? rangeKey : null;
  }
  if (data && typeof data === "object") {
    const rangeKey =
      (data as { rangeKey?: unknown; name?: unknown }).rangeKey ??
      (data as { rangeKey?: unknown; name?: unknown }).name;
    return typeof rangeKey === "string" ? rangeKey : null;
  }
  return null;
}

function WorkspaceNumberChart({
  snapshot,
  zoomLevel = 1,
}: WorkspaceNumberChartProps) {
  const zoomScale = Number.isFinite(zoomLevel) && zoomLevel > 0 ? zoomLevel : 1;
  const chartRef = useRef<ReactECharts | null>(null);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStartIndexRef = useRef<number | null>(null);
  const dragCurrentIndexRef = useRef<number | null>(null);
  const dragColorRef = useRef<string>(DEFAULT_RANGE_COLOR);
  const isDraggingRef = useRef(false);
  const dragPayloadRef = useRef<{
    payload: LabelInsertData | null;
    classMeta: { color?: string; opacity?: number } | null;
  } | null>(null);
  const prevZoomScaleRef = useRef(zoomScale);
  const [yAxisExtent, setYAxisExtent] = useState<[number, number] | null>(null);
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(
    null
  );
  const [zoomWindow, setZoomWindow] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const tool = useNumberLabelingToolSelectionStore((state) => state.tool);
  const layerMode = useLayerModeStore((state) => state.mode);
  const shouldShowRanges = layerMode.includes(OVERLAY_LAYER_INDEX);
  const isValidationMode = useWorkspaceValidationModeStore(
    (state) => state.isValidationMode
  );
  const validationRangeSelection = useNumberValidationRangeSelectionStore(
    (state) => state.selection
  );
  const setValidationRangeSelection = useNumberValidationRangeSelectionStore(
    (state) => state.setSelection
  );
  const clearValidationRangeSelection = useNumberValidationRangeSelectionStore(
    (state) => state.clearSelection
  );
  const setSelectionSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.setSelectionSnapshot
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const addClassificationLabel = useLabelBatchStore(
    (state) => state.addClassificationLabel
  );
  const classificationLabels = useLabelBatchStore(
    (state) => state.classificationLabels
  );
  const setSelectedClassificationId = useLabelSelectionStore(
    (state) => state.setSelectedClassificationId
  );
  const selectedClassificationInfo = useLabelSelectionStore(
    (state) => state.selectedClassificationInfo
  );
  const hiddenSegmentIds = useNumberLabelUiStore(
    (state) => state.hiddenSegmentIds
  );
  const lockedLabelIds = useNumberLabelUiStore((state) => state.lockedLabelIds);
  const chartType = useNumberLabelUiStore((state) => state.chartType);
  const selectedSegment = useNumberSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const setSelectedSegment = useNumberSegmentSelectionStore(
    (state) => state.setSelectedSegment
  );
  const classificationDeletedIds = useLabelBatchStore(
    (state) => state.classificationDeletedIds
  );
  const committedClassificationDeletedIds = useLabelBatchStore(
    (state) => state.committedClassificationDeletedIds
  );
  const labelInsertPayload = useLabelInsertPayloadStore(
    (state) => state.payload
  );
  const labelInsertClassMeta = useLabelInsertPayloadStore(
    (state) => state.classMeta
  );
  const { request } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(request);
  const tickIndexLookup = useMemo(
    () => buildTickIndexLookup(snapshot.xAxis.ticks),
    [snapshot.xAxis.ticks]
  );
  const resolveIndexFromRawValue = useCallback(
    (raw: unknown, rounding: "round" | "floor"): number | null => {
      return resolveTickIndexFromRawValue(
        raw,
        tickIndexLookup,
        snapshot.xAxis.ticks.length - 1,
        rounding
      );
    },
    [snapshot.xAxis.ticks.length, tickIndexLookup]
  );

  const updateYAxisExtent = useCallback(() => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) {
      return;
    }
    const echartsInstance = instance as unknown as {
      getModel?: () => {
        getComponent?: (
          componentType: string,
          index?: number
        ) => { axis?: { scale?: { getExtent?: () => [number, number] } } };
      };
    };
    const model =
      typeof echartsInstance.getModel === "function"
        ? echartsInstance.getModel()
        : null;
    if (!model || typeof model.getComponent !== "function") {
      return;
    }
    const axisModel = model.getComponent("yAxis", 0);
    const extent = axisModel?.axis?.scale?.getExtent?.();
    if (!extent || extent.length < 2) {
      return;
    }
    const next: [number, number] = [extent[0], extent[1]];
    setYAxisExtent((prev) => {
      if (!prev) {
        return next;
      }
      if (prev[0] === next[0] && prev[1] === next[1]) {
        return prev;
      }
      return next;
    });
  }, []);

  const deletedClassificationSet = useMemo(
    () =>
      new Set(
        [
          ...classificationDeletedIds,
          ...committedClassificationDeletedIds,
        ].filter((id): id is string => typeof id === "string" && id.length > 0)
      ),
    [classificationDeletedIds, committedClassificationDeletedIds]
  );

  const serverLabels = useMemo(() => {
    const list = labelSearchQuery.data?.list ?? [];
    if (!elementId) {
      return list;
    }
    return list.filter((label) => label.elementId === elementId);
  }, [elementId, labelSearchQuery.data?.list]);

  const segmentSources = useMemo<NumberSegmentSource[]>(() => {
    const sources: NumberSegmentSource[] = [];
    serverLabels.forEach((label) => {
      if (label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if ((label.labelType ?? "").toUpperCase() !== "TABLE") {
        return;
      }
      if (label.id && deletedClassificationSet.has(label.id)) {
        return;
      }
      if (contentSetId && label.contentSetId !== contentSetId) {
        return;
      }
      sources.push({ label });
    });
    classificationLabels.forEach((entry) => {
      if (entry.label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if ((entry.label.labelType ?? "").toUpperCase() !== "TABLE") {
        return;
      }
      if (entry.label.id && deletedClassificationSet.has(entry.label.id)) {
        return;
      }
      if (elementId && entry.label.elementId !== elementId) {
        return;
      }
      if (contentSetId && entry.label.contentSetId !== contentSetId) {
        return;
      }
      sources.push({
        label: entry.label,
        tempId: entry.tempId,
        color: entry.color,
      });
    });
    return sources;
  }, [
    classificationLabels,
    contentSetId,
    deletedClassificationSet,
    elementId,
    serverLabels,
  ]);

  const segmentRanges = useMemo<SegmentRange[]>(() => {
    const ranges = buildNumberSegmentGroups(segmentSources, snapshot);
    return ranges
      .filter((range) => !hiddenSegmentIds[range.key])
      .sort((a, b) => {
        const zA =
          typeof a.zindex === "number" && Number.isFinite(a.zindex)
            ? a.zindex
            : 0;
        const zB =
          typeof b.zindex === "number" && Number.isFinite(b.zindex)
            ? b.zindex
            : 0;
        if (zA !== zB) {
          return zA - zB;
        }
        if (a.start !== b.start) {
          return a.start - b.start;
        }
        if (a.end !== b.end) {
          return a.end - b.end;
        }
        return a.key.localeCompare(b.key);
      });
  }, [hiddenSegmentIds, segmentSources, snapshot]);
  const segmentRangeByKey = useMemo(() => {
    const map = new Map<string, SegmentRange>();
    segmentRanges.forEach((range) => {
      map.set(range.key, range);
    });
    return map;
  }, [segmentRanges]);

  const sliderSegments = useMemo(() => {
    if (!shouldShowRanges) {
      return [];
    }
    const tickCount = snapshot.xAxis.ticks.length;
    if (tickCount <= 0) {
      return [];
    }
    const maxIndex = Math.max(tickCount - 1, 0);
    const segments: SliderSegment[] = [];
    segmentRanges.forEach((range) => {
      const startIndex = Math.max(0, Math.min(Math.floor(range.start), maxIndex));
      const endIndexInclusive = Math.max(
        startIndex,
        Math.min(Math.floor(range.end), maxIndex)
      );
      if (maxIndex === 0) {
        segments.push({
          key: range.key,
          startPercent: 0,
          widthPercent: 100,
          color: range.color ?? DEFAULT_RANGE_COLOR,
          isSelected: selectedSegment?.key === range.key,
        });
        return;
      }
      if (endIndexInclusive <= startIndex) {
        return;
      }
      const startPercent = (startIndex / maxIndex) * 100;
      const endPercent = (endIndexInclusive / maxIndex) * 100;
      const widthPercent = Math.max(0, endPercent - startPercent);
      if (widthPercent <= 0) {
        return;
      }
      segments.push({
        key: range.key,
        startPercent,
        widthPercent,
        color: range.color ?? DEFAULT_RANGE_COLOR,
        isSelected: selectedSegment?.key === range.key,
      });
    });
    return segments;
  }, [segmentRanges, selectedSegment?.key, snapshot.xAxis.ticks.length, shouldShowRanges]);

  const applySelectedRange = useCallback(
    (range: SegmentRange) => {
      setSelectedClassificationId(null);
      setSelectedSegment({
        key: range.key,
        labelIds: range.labelIds,
        tempIds: range.tempIds,
        start: range.start,
        end: range.end,
        color: range.color,
        opacity: range.opacity,
        zindex: range.zindex,
        policyId: range.policyId ?? null,
        classIndex: range.classIndex,
        className: range.className,
        columnName: range.columnName,
      });
    },
    [setSelectedClassificationId, setSelectedSegment]
  );

  useEffect(() => {
    if (!selectedSegment) {
      return;
    }
    const next = segmentRangeByKey.get(selectedSegment.key) ?? null;
    if (!next) {
      const fallback = segmentRanges.find((range) => {
        if (range.start !== selectedSegment.start) {
          return false;
        }
        if (range.end !== selectedSegment.end) {
          return false;
        }
        if (
          selectedSegment.policyId !== undefined &&
          (selectedSegment.policyId ?? null) !== (range.policyId ?? null)
        ) {
          return false;
        }
        if (
          selectedSegment.classIndex !== undefined &&
          selectedSegment.classIndex !== range.classIndex
        ) {
          return false;
        }
        if (
          selectedSegment.className &&
          selectedSegment.className !== range.className
        ) {
          return false;
        }
        if (
          selectedSegment.columnName &&
          selectedSegment.columnName !== range.columnName
        ) {
          return false;
        }
        if (
          selectedSegment.color &&
          selectedSegment.color !== range.color
        ) {
          return false;
        }
        if (
          typeof selectedSegment.opacity === "number" &&
          selectedSegment.opacity !== range.opacity
        ) {
          return false;
        }
        if (
          typeof selectedSegment.zindex === "number" &&
          selectedSegment.zindex !== range.zindex
        ) {
          return false;
        }
        return true;
      });
      if (fallback) {
        applySelectedRange(fallback);
        return;
      }
      if (!labelSearchQuery.isFetching) {
        setSelectedSegment(null);
      }
      return;
    }
    if (
      next.start !== selectedSegment.start ||
      next.end !== selectedSegment.end ||
      next.color !== selectedSegment.color ||
      next.opacity !== selectedSegment.opacity ||
      next.zindex !== selectedSegment.zindex ||
      (selectedSegment.policyId ?? null) !== (next.policyId ?? null) ||
      selectedSegment.classIndex !== next.classIndex ||
      selectedSegment.className !== next.className ||
      selectedSegment.columnName !== next.columnName
    ) {
      applySelectedRange(next);
    }
  }, [
    applySelectedRange,
    labelSearchQuery.isFetching,
    segmentRangeByKey,
    segmentRanges,
    selectedSegment,
    setSelectedSegment,
  ]);

  const maxSegmentZIndex = useMemo(() => {
    let maxValue = 0;
    const targetContentSetId =
      labelInsertPayload?.contentSetId ?? contentSetId ?? null;
    const labels = serverLabels;
    const localLabels = classificationLabels.map((entry) => entry.label);
    [...labels, ...localLabels].forEach((label) => {
      if (label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if ((label.labelType ?? "").toUpperCase() !== "TABLE") {
        return;
      }
      if (label.id && deletedClassificationSet.has(label.id)) {
        return;
      }
      if (elementId && label.elementId !== elementId) {
        return;
      }
      if (targetContentSetId && label.contentSetId !== targetContentSetId) {
        return;
      }
      const value = label.labelValue as ChartValue | undefined;
      if (!value?.columnName) {
        return;
      }
      if (typeof value?.zindex !== "number") {
        return;
      }
      if (!Number.isFinite(value.zindex)) {
        return;
      }
      maxValue = Math.max(maxValue, value.zindex);
    });
    return maxValue;
  }, [
    classificationLabels,
    contentSetId,
    deletedClassificationSet,
    elementId,
    labelInsertPayload?.contentSetId,
    serverLabels,
  ]);

  const baseZoomWindow = useMemo(() => {
    const effectiveZoomScale = Math.max(1, zoomScale);
    const zoomWindow = Math.min(100, 100 / effectiveZoomScale);
    const zoomSpan = Math.max(1, zoomWindow);
    const start = Number(((100 - zoomSpan) / 2).toFixed(2));
    const end = Number((start + zoomSpan).toFixed(2));
    return { start, end };
  }, [zoomScale]);
  const activeZoomWindow = useMemo(
    () => zoomWindow ?? baseZoomWindow,
    [baseZoomWindow, zoomWindow]
  );

  const option = useMemo(() => {
    const xLabels = snapshot.xAxis.ticks.map((tick) => tick.label);
    const isBarChart = chartType === NUMBER_CHART_TYPES.BAR;
    const showSymbol =
      !isBarChart && (tool?.id === "selection" || tool?.id === "drag-segment");
    const selectedKey = selectedSegment?.key ?? null;
    const maxTickIndex = snapshot.xAxis.ticks.length - 1;
    const yAxisMin =
      yAxisExtent && Number.isFinite(yAxisExtent[0])
        ? yAxisExtent[0]
        : undefined;
    const yAxisMax =
      yAxisExtent && Number.isFinite(yAxisExtent[1])
        ? yAxisExtent[1]
        : undefined;
    const markAreaData: MarkAreaData[] = shouldShowRanges
      ? segmentRanges
          .map<MarkAreaData | null>((range) => {
            if (maxTickIndex < 0) {
              return null;
            }
            const startIndex = Math.max(
              0,
              Math.min(Math.floor(range.start), maxTickIndex)
            );
            const endIndexInclusive = Math.max(
              startIndex,
              Math.min(Math.floor(range.end), maxTickIndex)
            );
            if (endIndexInclusive < startIndex) {
              return null;
            }
            const isSelected = selectedKey === range.key;
            const itemStyle: NonNullable<MarkAreaPoint["itemStyle"]> = {
              color: range.color ?? "rgba(250, 204, 21, 0.35)",
              opacity: SEGMENT_DEFAULT_OPACITY,
            };
            if (isSelected) {
              itemStyle.opacity = Math.min(1, SEGMENT_DEFAULT_OPACITY + 0.25);
              itemStyle.borderColor = "#0F172A";
              itemStyle.borderWidth = 1;
            }
            const startPoint: MarkAreaPoint = {
              xAxis: startIndex,
              yAxis: typeof yAxisMin === "number" ? yAxisMin : "min",
              itemStyle,
              label: { show: false },
              name: range.key,
              rangeKey: range.key,
            };
            const endPoint: MarkAreaPoint = {
              xAxis: endIndexInclusive,
              yAxis: typeof yAxisMax === "number" ? yAxisMax : "max",
              rangeKey: range.key,
            };
            return [startPoint, endPoint];
          })
          .filter((item): item is MarkAreaData => item !== null)
      : [];
    const zoomStart = activeZoomWindow.start;
    const zoomEnd = activeZoomWindow.end;
    const series: NumberChartSeries[] = snapshot.yAxis.series.map((serie) => {
      const baseSeries: Pick<
        NumberChartSeries,
        "name" | "data" | "emphasis"
      > = {
        name: serie.label,
        data: serie.points.map((point) => point.value),
        emphasis: { focus: "series" },
      };
      if (isBarChart) {
        return {
          ...baseSeries,
          type: "bar",
          barMaxWidth: 24,
        };
      }
      return {
        ...baseSeries,
        type: "line",
        connectNulls: false,
        smooth: true,
        showSymbol,
        symbolSize: showSymbol ? 8 : 0,
      };
    });
    if (markAreaData.length > 0 && series.length > 0) {
      series[0] = {
        ...series[0],
        markArea: {
          silent: tool?.id !== "selection",
          data: markAreaData,
        },
      };
    }
    return {
      color: SERIES_COLORS,
      tooltip: {
        trigger: "axis",
        valueFormatter: (value: unknown) => formatValueLabel(value),
      },
      toolbox: {
        show: false,
      },
      legend: {
        data: series.map((serie) => serie.name),
      },
      grid: {
        top: CHART_GRID.top,
        left: CHART_GRID.left,
        right: CHART_GRID.right,
        bottom: CHART_GRID.bottom,
      },
      xAxis: {
        type: "category",
        name: snapshot.xAxis.label,
        boundaryGap: isBarChart,
        data: xLabels,
      },
      yAxis: {
        type: "value",
        name: snapshot.yAxis.label,
        scale: true,
      },
      dataZoom: [
        {
          type: "slider",
          show: true,
          xAxisIndex: 0,
          start: zoomStart,
          end: zoomEnd,
          height: SLIDER_HEIGHT,
          bottom: SLIDER_BOTTOM,
          left: CHART_GRID.left,
          right: CHART_GRID.right,
          showDetail: false,
          showDataShadow: false,
          backgroundColor: "rgba(0, 0, 0, 0)",
          borderColor: "rgba(0, 0, 0, 0)",
          fillerColor: "rgba(15, 23, 42, 0.08)",
          brushSelect: false,
          zoomLock: true,
        },
        {
          type: "inside",
          xAxisIndex: 0,
          start: zoomStart,
          end: zoomEnd,
          zoomOnMouseWheel: false,
          moveOnMouseMove: false,
          moveOnMouseWheel: false,
        },
      ],
      series,
    };
  }, [
    segmentRanges,
    selectedSegment?.key,
    snapshot,
    tool?.id,
    baseZoomWindow,
    activeZoomWindow,
    zoomWindow,
    zoomScale,
    shouldShowRanges,
    yAxisExtent,
    chartType,
  ]);

  const miniOption = useMemo(() => {
    const xLabels = snapshot.xAxis.ticks.map((tick) => tick.label);
    const isBarChart = chartType === NUMBER_CHART_TYPES.BAR;
    const miniSeries = snapshot.yAxis.series.map((serie) => {
      const baseSeries = {
        name: serie.label,
        type: isBarChart ? "bar" : "line",
        data: serie.points.map((point) => point.value),
        emphasis: {
          disabled: true,
        },
        silent: true,
      };
      if (isBarChart) {
        return {
          ...baseSeries,
          barMaxWidth: 12,
        };
      }
      return {
        ...baseSeries,
        connectNulls: false,
        smooth: true,
        showSymbol: false,
        symbolSize: 0,
        lineStyle: {
          width: 1,
          opacity: 0.6,
        },
      };
    });
    return {
      animation: false,
      color: SERIES_COLORS,
      grid: {
        top: 4,
        left: 0,
        right: 0,
        bottom: 4,
      },
      xAxis: {
        type: "category",
        boundaryGap: isBarChart,
        data: xLabels,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      tooltip: { show: false },
      legend: { show: false },
      series: miniSeries,
    };
  }, [chartType, snapshot.xAxis.ticks, snapshot.yAxis.series]);

  const pointsByIndex = useMemo(() => {
    const map = new Map<
      number,
      WorkspaceNavigationChartAxisSnapshot["yAxis"]["series"][number]["points"][number][]
    >();
    snapshot.yAxis.series.forEach((serie) => {
      serie.points.forEach((point, index) => {
        const existing = map.get(index);
        if (existing) {
          existing.push(point);
        } else {
          map.set(index, [point]);
        }
      });
    });
    return map;
  }, [snapshot.yAxis.series]);

  const resolveElementIdsInRange = useCallback(
    (range: { start: number; end: number }) => {
      const ids = new Set<string>();
      for (let index = range.start; index < range.end; index += 1) {
        const points = pointsByIndex.get(index);
        if (!points) {
          continue;
        }
        points.forEach((point) => {
          const elementId =
            typeof point.elementId === "string" && point.elementId.length > 0
              ? point.elementId
              : null;
          if (elementId) {
            ids.add(elementId);
          }
        });
      }
      return Array.from(ids);
    },
    [pointsByIndex]
  );

  const resolveIndexRange = useCallback(
    (startIndex: number, endIndex: number) => {
      const maxTickIndex = snapshot.xAxis.ticks.length - 1;
      if (maxTickIndex < 0) {
        return null;
      }
      const minIndex = Math.min(startIndex, endIndex);
      const maxIndex = Math.max(startIndex, endIndex);
      const clampedStart = Math.max(0, Math.min(minIndex, maxTickIndex));
      const clampedEnd = Math.max(
        clampedStart,
        Math.min(maxIndex, maxTickIndex)
      );
      const endExclusive = Math.min(
        snapshot.xAxis.ticks.length,
        clampedEnd + 1
      );
      if (endExclusive <= clampedStart) {
        return null;
      }
      return { start: clampedStart, end: endExclusive };
    },
    [snapshot.xAxis.ticks.length]
  );

  const resolveGridRect = useCallback(() => {
    const instance = chartRef.current?.getEchartsInstance();
    const width =
      typeof instance?.getWidth === "function"
        ? instance.getWidth()
        : chartContainerRef.current?.clientWidth ?? 0;
    const height =
      typeof instance?.getHeight === "function"
        ? instance.getHeight()
        : chartContainerRef.current?.clientHeight ?? 0;
    const gridWidth = width - CHART_GRID.left - CHART_GRID.right;
    const gridHeight = height - CHART_GRID.top - CHART_GRID.bottom;
    if (!Number.isFinite(gridWidth) || !Number.isFinite(gridHeight)) {
      return null;
    }
    if (gridWidth <= 0 || gridHeight <= 0) {
      return null;
    }
    return {
      left: CHART_GRID.left,
      top: CHART_GRID.top,
      width: gridWidth,
      height: gridHeight,
    };
  }, []);

  const resolveVisibleIndexRange = useCallback(() => {
    const tickCount = snapshot.xAxis.ticks.length;
    if (tickCount <= 0) {
      return null;
    }
    const startRatio = Math.max(
      0,
      Math.min(100, activeZoomWindow.start)
    );
    const endRatio = Math.max(0, Math.min(100, activeZoomWindow.end));
    const minRatio = Math.min(startRatio, endRatio) / 100;
    const maxRatio = Math.max(startRatio, endRatio) / 100;
    const maxIndex = tickCount - 1;
    const startIndex = Math.max(0, Math.min(maxIndex, Math.floor(minRatio * maxIndex)));
    const endIndex = Math.max(startIndex, Math.min(maxIndex, Math.ceil(maxRatio * maxIndex)));
    return { startIndex, endIndex, count: endIndex - startIndex + 1 };
  }, [activeZoomWindow.end, activeZoomWindow.start, snapshot.xAxis.ticks.length]);

  const resolveAxisPixel = useCallback(
    (index: number) => {
      const instance = chartRef.current?.getEchartsInstance();
      const tick = snapshot.xAxis.ticks[index];
      if (!instance || !tick) {
        return null;
      }
      const pixel = instance.convertToPixel({ xAxisIndex: 0 }, tick.label);
      if (Array.isArray(pixel)) {
        return typeof pixel[0] === "number" ? pixel[0] : null;
      }
      return typeof pixel === "number" ? pixel : null;
    },
    [snapshot.xAxis.ticks]
  );

  const resolveAxisStep = useCallback(() => {
    if (snapshot.xAxis.ticks.length < 2) {
      return null;
    }
    const first = resolveAxisPixel(0);
    const second = resolveAxisPixel(1);
    if (typeof first !== "number" || typeof second !== "number") {
      return null;
    }
    return Math.abs(second - first);
  }, [resolveAxisPixel, snapshot.xAxis.ticks.length]);

  const resolveSegmentLayout = useCallback(
    (startIndex: number, endIndex: number) => {
      const tickCount = snapshot.xAxis.ticks.length;
      const gridRect = resolveGridRect();
      if (!gridRect || tickCount <= 0) {
        return null;
      }
      if (tickCount === 1) {
        return { left: 0, width: gridRect.width };
      }
      const startPixel = resolveAxisPixel(startIndex);
      let endPixel: number | null = null;
      if (typeof startPixel === "number") {
        if (endIndex < tickCount) {
          endPixel = resolveAxisPixel(endIndex);
        } else {
          const lastPixel = resolveAxisPixel(tickCount - 1);
          const step = resolveAxisStep();
          if (typeof lastPixel === "number" && typeof step === "number") {
            endPixel = lastPixel + step;
          }
        }
      }
      if (typeof startPixel === "number" && typeof endPixel === "number") {
        const left = Math.max(gridRect.left, Math.min(startPixel, endPixel));
        const right = Math.min(
          gridRect.left + gridRect.width,
          Math.max(startPixel, endPixel)
        );
        const width = Math.max(0, right - left);
        if (width <= 0) {
          return null;
        }
        return { left: left - gridRect.left, width };
      }

      const visibleRange = resolveVisibleIndexRange();
      if (!visibleRange) {
        return null;
      }
      const visibleStart = visibleRange.startIndex;
      const visibleEndExclusive = visibleRange.endIndex + 1;
      const clampedStart = Math.max(visibleStart, Math.min(startIndex, visibleEndExclusive));
      const clampedEnd = Math.max(clampedStart, Math.min(endIndex, visibleEndExclusive));
      if (clampedEnd <= clampedStart) {
        return null;
      }
      const step =
        visibleRange.count > 1
          ? gridRect.width / (visibleRange.count - 1)
          : gridRect.width;
      const startOffset = (clampedStart - visibleStart) * step;
      const endOffset = (clampedEnd - visibleStart) * step;
      const left = Math.max(0, Math.min(startOffset, endOffset));
      const right = Math.min(gridRect.width, Math.max(startOffset, endOffset));
      const width = Math.max(0, right - left);
      if (width <= 0) {
        return null;
      }
      return { left, width };
    },
    [
      resolveAxisPixel,
      resolveAxisStep,
      resolveGridRect,
      resolveVisibleIndexRange,
      snapshot.xAxis.ticks.length,
    ]
  );

  const buildDragSelection = useCallback(
    (startIndex: number, endIndex: number) => {
      const range = resolveIndexRange(startIndex, endIndex);
      if (!range) {
        return null;
      }
      const layout = resolveSegmentLayout(range.start, range.end);
      if (!layout) {
        return null;
      }
      return {
        startIndex: range.start,
        endIndex: range.end,
        left: layout.left,
        width: layout.width,
        color: dragColorRef.current,
      };
    },
    [resolveIndexRange, resolveSegmentLayout]
  );

  const validationSelectionLayout = useMemo(() => {
    if (!isValidationMode || !validationRangeSelection) {
      return null;
    }
    const layout = resolveSegmentLayout(
      validationRangeSelection.start,
      validationRangeSelection.end
    );
    if (!layout) {
      return null;
    }
    return { left: layout.left, width: layout.width };
  }, [isValidationMode, resolveSegmentLayout, validationRangeSelection]);

  const pickSegmentRange = useCallback(
    (index: number) => {
      let best: SegmentRange | null = null;
      segmentRanges.forEach((range) => {
        if (
          range.start > index ||
          index >= range.end ||
          lockedLabelIds[range.key]
        ) {
          return;
        }
        if (!best) {
          best = range;
          return;
        }
        const zCandidate =
          typeof range.zindex === "number" && Number.isFinite(range.zindex)
            ? range.zindex
            : 0;
        const zBest =
          typeof best.zindex === "number" && Number.isFinite(best.zindex)
            ? best.zindex
            : 0;
        if (zCandidate !== zBest) {
          if (zCandidate > zBest) {
            best = range;
          }
          return;
        }
        if (range.start !== best.start) {
          if (range.start < best.start) {
            best = range;
          }
          return;
        }
        if (range.end !== best.end) {
          if (range.end < best.end) {
            best = range;
          }
          return;
        }
        if (range.key.localeCompare(best.key) < 0) {
          best = range;
        }
      });
      return best;
    },
    [lockedLabelIds, segmentRanges]
  );

  const resolveIndexFromEvent = useCallback(
    (event?: { offsetX?: number; offsetY?: number }) => {
      const instance = chartRef.current?.getEchartsInstance();
      if (!instance) {
        return null;
      }
      const offsetX = event?.offsetX;
      const offsetY = event?.offsetY;
      if (typeof offsetX !== "number" || typeof offsetY !== "number") {
        return null;
      }
      const value = instance.convertFromPixel({ xAxisIndex: 0 }, [
        offsetX,
        offsetY,
      ]);
      const raw = Array.isArray(value) ? value[0] : value;
      return resolveIndexFromRawValue(raw, "round");
    },
    [resolveIndexFromRawValue]
  );

  const resolveIndexFromGrid = useCallback(
    (offsetX: number, offsetY: number) => {
      const gridRect = resolveGridRect();
      if (!gridRect) {
        return null;
      }
      if (
        offsetX < gridRect.left ||
        offsetX > gridRect.left + gridRect.width ||
        offsetY < gridRect.top ||
        offsetY > gridRect.top + gridRect.height
      ) {
        return null;
      }
      const visibleRange = resolveVisibleIndexRange();
      if (!visibleRange) {
        return null;
      }
      if (visibleRange.count <= 1) {
        return visibleRange.startIndex;
      }
      const ratio = (offsetX - gridRect.left) / gridRect.width;
      const clamped = Math.max(0, Math.min(1, ratio));
      const index =
        visibleRange.startIndex +
        Math.floor(clamped * (visibleRange.count - 1));
      const maxIndex = snapshot.xAxis.ticks.length - 1;
      return Math.max(0, Math.min(index, maxIndex));
    },
    [resolveGridRect, resolveVisibleIndexRange, snapshot.xAxis.ticks.length]
  );

  const resolveIndexFromOffset = useCallback(
    (offsetX: number, offsetY: number) => {
      const instance = chartRef.current?.getEchartsInstance();
      if (!instance) {
        return resolveIndexFromGrid(offsetX, offsetY);
      }
      const value = instance.convertFromPixel({ xAxisIndex: 0 }, [
        offsetX,
        offsetY,
      ]);
      const raw = Array.isArray(value) ? value[0] : value;
      return (
        resolveIndexFromRawValue(raw, "floor") ??
        resolveIndexFromGrid(offsetX, offsetY)
      );
    },
    [resolveIndexFromGrid, resolveIndexFromRawValue]
  );

  const resolveIndexFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const container = chartContainerRef.current;
      if (!container) {
        return null;
      }
      const rect = container.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const offsetY = clientY - rect.top;
      return resolveIndexFromOffset(offsetX, offsetY);
    },
    [resolveIndexFromOffset]
  );

  const handleChartClick = useCallback(
    (params: {
      componentType?: string;
      seriesIndex?: number;
      dataIndex?: number;
      name?: string;
      data?: unknown;
      event?: { offsetX?: number; offsetY?: number };
    }) => {
      if (tool?.id !== "selection") {
        return;
      }
      const suppressWorkspaceFocus = () => {
        const rawEvent = params.event as
          | (Event & { stopPropagation?: () => void; preventDefault?: () => void })
          | { event?: Event }
          | undefined;
        const nativeEvent =
          (rawEvent as { event?: Event } | undefined)?.event ?? rawEvent;
        if (nativeEvent && "stopPropagation" in nativeEvent) {
          (nativeEvent as Event).stopPropagation();
        }
        if (nativeEvent && "preventDefault" in nativeEvent) {
          (nativeEvent as Event).preventDefault();
        }
      };
      const rangeKey = resolveRangeKey(params);
      if (rangeKey) {
        suppressWorkspaceFocus();
        const range = segmentRangeByKey.get(rangeKey) ?? null;
        if (range && !lockedLabelIds[range.key]) {
          applySelectedRange(range);
          return;
        }
        const index = resolveIndexFromEvent(params.event);
        if (typeof index === "number") {
          const picked = pickSegmentRange(index);
          if (picked) {
            suppressWorkspaceFocus();
            applySelectedRange(picked);
          }
        }
        return;
      }
      if (params?.componentType === "markArea") {
        suppressWorkspaceFocus();
        const index = resolveIndexFromEvent(params.event);
        if (typeof index === "number") {
          const range = pickSegmentRange(index);
          if (range) {
            applySelectedRange(range);
          }
        }
        return;
      }
      if (params?.componentType !== "series") {
        return;
      }
      const seriesIndex = params.seriesIndex;
      const dataIndex = params.dataIndex;
      if (typeof seriesIndex !== "number" || typeof dataIndex !== "number") {
        return;
      }
      const series = snapshot.yAxis.series[seriesIndex];
      const point = series?.points[dataIndex];
      if (!point) {
        return;
      }
      setSelectionSnapshot({
        selectedRows: [],
        selectedColumns: [],
        selectedCells: [
          {
            rowIndex: point.rowIndex,
            columnId: point.columnId,
          },
        ],
      });
    },
    [
      applySelectedRange,
      lockedLabelIds,
      pickSegmentRange,
      segmentRangeByKey,
      resolveIndexFromEvent,
      setSelectionSnapshot,
      snapshot.yAxis.series,
      tool?.id,
    ]
  );

  const handleSegmentRange = useCallback(
    (
      range: { start: number; end: number },
      payloadOverride?: LabelInsertData | null,
      classMetaOverride?: { color?: string; opacity?: number } | null
    ) => {
      const payload = payloadOverride ?? labelInsertPayload;
      const fallbackInfo = selectedClassificationInfo;
      const policyId =
        payload?.policyId && payload.policyId.length > 0
          ? payload.policyId
          : fallbackInfo?.policyId && fallbackInfo.policyId.length > 0
            ? fallbackInfo.policyId
            : null;
      if (!policyId) {
        // eslint-disable-next-line no-console -- chart labeling precondition
        console.warn("Select a policy/class before chart labeling.");
        return;
      }
      const payloadClassValue = payload?.labelValue as
        | { classIndex?: number; className?: string }
        | undefined;
      const resolvedClassIndex =
        typeof payloadClassValue?.classIndex === "number"
          ? payloadClassValue.classIndex
          : typeof fallbackInfo?.classIndex === "number"
            ? fallbackInfo.classIndex
            : undefined;
      const resolvedClassName =
        payloadClassValue?.className ??
        (fallbackInfo?.className ? fallbackInfo.className : undefined);
      const hasClass =
        typeof resolvedClassIndex === "number" || Boolean(resolvedClassName);
      if (!hasClass) {
        return;
      }
      const baseContentSetId =
        typeof payload?.contentSetId === "string" &&
        payload.contentSetId.length > 0
          ? payload.contentSetId
          : contentSetId ?? undefined;
      if (!baseContentSetId) {
        return;
      }
      const seedPayload: LabelInsertData = payload
        ? { ...payload, policyId }
        : {
            policyId,
            contentSetId: baseContentSetId,
            labelValue: {
              ...(typeof resolvedClassIndex === "number"
                ? { classIndex: resolvedClassIndex }
                : {}),
              ...(resolvedClassName ? { className: resolvedClassName } : {}),
            },
            attributeValues: [],
          };
      const {
        labelType: _omitLabelType,
        elementId: _omitElementId,
        unitType: _omitUnitType,
        ...basePayload
      } = seedPayload;
      void _omitLabelType;
      void _omitElementId;
      void _omitUnitType;

      const classMeta = classMetaOverride ?? labelInsertClassMeta;
      const segmentValueBase: ChartValue = {
        ...(typeof resolvedClassIndex === "number"
          ? { classIndex: resolvedClassIndex }
          : {}),
        ...(resolvedClassName ? { className: resolvedClassName } : {}),
        ...(classMeta?.color ? { color: classMeta.color } : {}),
        ...(typeof classMeta?.opacity === "number"
          ? { opacity: classMeta.opacity }
          : {}),
        zindex: maxSegmentZIndex + 1,
      };
      const seen = new Set<string>();
      for (let index = range.start; index < range.end; index += 1) {
        const points = pointsByIndex.get(index);
        if (!points) {
          continue;
        }
        points.forEach((point) => {
          const elementId =
            typeof point.elementId === "string" && point.elementId.length > 0
              ? point.elementId
              : `row-${point.rowIndex}`;
          const columnName =
            typeof point.columnId === "string" && point.columnId.length > 0
              ? point.columnId
              : null;
          if (!columnName) {
            return;
          }
          const dedupeKey = `${elementId}::${columnName}`;
          if (seen.has(dedupeKey)) {
            return;
          }
          seen.add(dedupeKey);
          const nextLabel: LabelInsertData = {
            ...basePayload,
            contentSetId: baseContentSetId,
            elementId,
            inferenceType: "CLASSIFICATION",
            unitType: "ELEMENT",
            labelType: "TABLE",
            labelValue: {
              ...segmentValueBase,
              columnName,
            },
            attributeValues: [],
          };
          addClassificationLabel(nextLabel, {
            tempId: uuidv4(),
            color: classMeta?.color,
          });
        });
      }
    },
    [
      addClassificationLabel,
      contentSetId,
      labelInsertClassMeta,
      labelInsertPayload,
      maxSegmentZIndex,
      pointsByIndex,
      selectedClassificationInfo,
    ]
  );

  const beginDrag = useCallback(
    (clientX: number, clientY: number, button: number): boolean => {
      if (tool?.id !== "drag-segment") {
        return false;
      }
      if (button !== 0) {
        return false;
      }
      if (isDraggingRef.current) {
        return false;
      }
      if (isValidationMode) {
        clearValidationRangeSelection();
      }
      dragPayloadRef.current = {
        payload: labelInsertPayload,
        classMeta: labelInsertClassMeta,
      };
      dragStartIndexRef.current = null;
      dragCurrentIndexRef.current = null;
      isDraggingRef.current = false;
      const container = chartContainerRef.current;
      if (!container) {
        return false;
      }
      const rect = container.getBoundingClientRect();
      const offsetX = clientX - rect.left;
      const offsetY = clientY - rect.top;
      const index = resolveIndexFromOffset(offsetX, offsetY);
      if (typeof index !== "number") {
        return false;
      }
      isDraggingRef.current = true;
      dragStartIndexRef.current = index;
      dragCurrentIndexRef.current = index;
      dragColorRef.current = labelInsertClassMeta?.color ?? DEFAULT_RANGE_COLOR;
      const nextSelection = buildDragSelection(index, index);
      setDragSelection(nextSelection);
      return true;
    },
    [
      buildDragSelection,
      clearValidationRangeSelection,
      isValidationMode,
      labelInsertClassMeta,
      labelInsertPayload,
      resolveIndexFromOffset,
      tool?.id,
    ]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const started = beginDrag(event.clientX, event.clientY, event.button);
      if (started) {
        event.preventDefault();
      }
    },
    [beginDrag]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDraggingRef.current) {
        return;
      }
      const index = resolveIndexFromClient(event.clientX, event.clientY);
      if (typeof index !== "number") {
        return;
      }
      dragCurrentIndexRef.current = index;
      const startIndex = dragStartIndexRef.current;
      if (typeof startIndex !== "number") {
        return;
      }
      const nextSelection = buildDragSelection(startIndex, index);
      if (!nextSelection) {
        return;
      }
      setDragSelection((prev) => {
        if (
          prev &&
          prev.startIndex === nextSelection.startIndex &&
          prev.endIndex === nextSelection.endIndex &&
          prev.left === nextSelection.left &&
          prev.width === nextSelection.width &&
          prev.color === nextSelection.color
        ) {
          return prev;
        }
        return nextSelection;
      });
    },
    [buildDragSelection, resolveIndexFromClient]
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!isDraggingRef.current) {
        return;
      }
      isDraggingRef.current = false;
      const startIndex = dragStartIndexRef.current;
      const lastIndex = dragCurrentIndexRef.current;
      dragStartIndexRef.current = null;
      dragCurrentIndexRef.current = null;
      setDragSelection(null);
      const endIndex =
        typeof lastIndex === "number"
          ? lastIndex
          : resolveIndexFromClient(event.clientX, event.clientY);
      if (typeof startIndex !== "number" || typeof endIndex !== "number") {
        dragPayloadRef.current = null;
        return;
      }
      const range = resolveIndexRange(startIndex, endIndex);
      if (!range) {
        dragPayloadRef.current = null;
        return;
      }
      if (isValidationMode) {
        const elementIds = resolveElementIdsInRange(range);
        dragPayloadRef.current = null;
        if (!elementIds.length) {
          setValidationRangeSelection(null);
          return;
        }
        setValidationRangeSelection({
          start: range.start,
          end: range.end,
          elementIds,
        });
        return;
      }
      const payloadSnapshot = dragPayloadRef.current;
      dragPayloadRef.current = null;
      handleSegmentRange(
        range,
        payloadSnapshot?.payload,
        payloadSnapshot?.classMeta
      );
    },
    [
      handleSegmentRange,
      isValidationMode,
      resolveElementIdsInRange,
      resolveIndexFromClient,
      resolveIndexRange,
      setValidationRangeSelection,
    ]
  );

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) {
      return;
    }
    const handleNativeMouseDown = (event: MouseEvent) => {
      const started = beginDrag(event.clientX, event.clientY, event.button);
      if (started) {
        event.preventDefault();
      }
    };
    container.addEventListener("mousedown", handleNativeMouseDown, true);
    return () => {
      container.removeEventListener("mousedown", handleNativeMouseDown, true);
    };
  }, [beginDrag]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (tool?.id === "drag-segment") {
      return;
    }
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      dragStartIndexRef.current = null;
      dragCurrentIndexRef.current = null;
      dragPayloadRef.current = null;
    }
    setDragSelection((prev) => (prev ? null : prev));
  }, [tool?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        dragStartIndexRef.current = null;
        dragCurrentIndexRef.current = null;
        dragPayloadRef.current = null;
        setDragSelection(null);
      }
      clearValidationRangeSelection();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clearValidationRangeSelection]);

  useEffect(() => {
    if (!isValidationMode || tool?.id !== "drag-segment") {
      clearValidationRangeSelection();
    }
  }, [clearValidationRangeSelection, isValidationMode, tool?.id]);

  const handleDataZoom = useCallback(
    (event: {
      start?: number;
      end?: number;
      batch?: Array<{ start?: number; end?: number }>;
    }) => {
      const payload = event?.batch?.[0] ?? event;
      const nextStart = payload?.start;
      const nextEnd = payload?.end;
      if (typeof nextStart !== "number" || typeof nextEnd !== "number") {
        return;
      }
      const clampedStart = Math.max(0, Math.min(100, nextStart));
      const clampedEnd = Math.max(0, Math.min(100, nextEnd));
      if (clampedEnd <= clampedStart) {
        return;
      }
      setZoomWindow({ start: clampedStart, end: clampedEnd });
    },
    []
  );

  useEffect(() => {
    if (prevZoomScaleRef.current !== zoomScale) {
      setZoomWindow(baseZoomWindow);
      const instance = chartRef.current?.getEchartsInstance();
      if (instance) {
        instance.dispatchAction({
          type: "dataZoom",
          start: baseZoomWindow.start,
          end: baseZoomWindow.end,
        });
      }
      prevZoomScaleRef.current = zoomScale;
    }
  }, [baseZoomWindow, zoomScale]);

  useEffect(() => {
    const instance = chartRef.current?.getEchartsInstance();
    if (!instance) {
      return;
    }
    instance.resize();
    updateYAxisExtent();
  }, [snapshot, updateYAxisExtent, zoomScale]);

  if (!snapshot.canRender || snapshot.yAxis.series.length === 0) {
    return (
      <Tip
        title="No chart data to display"
        content="Please select numeric data in rows and columns to display a chart."
        isClosable={false}
      />
    );
  }

  return (
    <div
      className="workspace-number-chart"
      ref={chartContainerRef}
      onMouseDownCapture={handleMouseDown}
    >
      <div
        className="workspace-number-chart__mini"
        style={{
          left: CHART_GRID.left,
          right: CHART_GRID.right,
          bottom: SLIDER_BOTTOM,
          height: SLIDER_HEIGHT,
        }}
      >
        <ReactECharts
          option={miniOption}
          notMerge
          lazyUpdate
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <div className="workspace-number-chart__canvas">
        <ReactECharts
          ref={chartRef}
          option={option}
          notMerge
          lazyUpdate
          style={{ width: "100%", height: "100%" }}
          onEvents={{
            click: handleChartClick,
            dataZoom: handleDataZoom,
            datazoom: handleDataZoom,
            finished: () => {
              updateYAxisExtent();
            },
          }}
        />
      </div>
      <div
        className={`workspace-number-chart__segment-overlay${
          tool?.id === "drag-segment"
            ? " workspace-number-chart__segment-overlay--interactive"
            : ""
        }`}
        style={{
          top: CHART_GRID.top,
          left: CHART_GRID.left,
          right: CHART_GRID.right,
          bottom: CHART_GRID.bottom,
        }}
      >
        {validationSelectionLayout ? (
          <div
            className="workspace-number-chart__segment-preview"
            style={{
              left: validationSelectionLayout.left,
              width: validationSelectionLayout.width,
              backgroundColor: DEFAULT_RANGE_COLOR,
              opacity: SEGMENT_DEFAULT_OPACITY,
            }}
          />
        ) : null}
        {dragSelection ? (
          <div
            className="workspace-number-chart__segment-preview"
            style={{
              left: dragSelection.left,
              width: dragSelection.width,
              backgroundColor: dragSelection.color,
              opacity: SEGMENT_DEFAULT_OPACITY,
            }}
          />
        ) : null}
      </div>
      <div className="workspace-number-chart__slider-overlay">
        {sliderSegments.map((segment) => {
          const segmentOpacity = segment.isSelected
            ? 0.6
            : SEGMENT_DEFAULT_OPACITY;
          return (
            <div
              key={`slider-segment-${segment.key}`}
              className="workspace-number-chart__slider-overlay-segment"
              style={{
                left: `${segment.startPercent}%`,
                width: `${segment.widthPercent}%`,
                backgroundColor: segment.color,
                opacity: segmentOpacity,
                boxShadow: segment.isSelected
                  ? "inset 0 0 0 1px #0F172A"
                  : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default WorkspaceNumberChart;
