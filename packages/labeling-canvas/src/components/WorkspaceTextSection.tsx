import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { v4 as uuidv4 } from "uuid";

import { Icon } from "@/components";
import Tip from "@/components/molecules/Tip";
import type { SearchOperatorValue } from "@/features/content-group/queries";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";

import { useViewLabelHistory } from "../hooks/useViewLabelHistory";
import { useWorkspaceIssueLabelIds } from "../hooks/useWorkspaceIssueLabelIds";
import { useWorkspaceLabelSearchParams } from "../hooks/useWorkspaceLabelSearchParams";
import { useLabelingPoliciesBatch, useLabelSearch } from "../queries";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useLabelInsertPayloadStore } from "../store/labelInsertPayload.store";
import { useLabelSelectionStore } from "../store/labelSelection.store";
import { useLabelVisibilityStore } from "../store/labelVisibility.store";
import {
  OVERLAY_LAYER_INDEX,
  useLayerModeStore,
} from "../store/layerMode.store";
import { useTextAutoHighlightStore } from "../store/textAutoHighlight.store";
import {
  applyTextLabelHistorySnapshot,
  areTextLabelHistorySnapshotsEqual,
  getTextLabelHistorySnapshot,
  useTextLabelHistoryStore,
} from "../store/textLabelHistory.store";
import { useTextLabelUiStore } from "../store/textLabelUi.store";
import { useTextSegmentSelectionStore } from "../store/textSegmentSelection.store";
import { useTextTypeLabelingToolSelectionStore } from "../store/textTypeLabelingToolSelection.store";
import { useWorkspaceIssuePanelStore } from "../store/workspaceIssuePanel.store";
import { useWorkspaceNavigationActiveStore } from "../store/workspaceLayout.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceValidationModeStore } from "../store/workspaceValidationMode.store";
import { useWorkspaceZoomStore } from "../store/workspaceZoom.store";
import type { ClassificationValue, LabelInsertData } from "../types/domain";
import {
  getLabelingShortcutKey,
  LABELING_SHORTCUTS,
  shouldIgnoreLabelingShortcutEvent,
} from "../utils/labelingShortcuts";
import { dragSegmentTool, selectionTool } from "../utils/textLabelingTools";
import { resolveWorkspaceBorderStyle } from "../utils/workspaceFocusBorder";

const NO_ELEMENT_KEY = "__no_element__";

const normalizeElementKey = (value?: string | null): string =>
  typeof value === "string" && value.length > 0 ? value : NO_ELEMENT_KEY;

type AutoHighlightKind = "english" | "number" | "special";

type AutoHighlightSegment = {
  start: number;
  end: number;
  kind: AutoHighlightKind;
};

const collectAutoHighlightSegments = (
  text: string,
  pattern: RegExp,
  kind: AutoHighlightKind,
  segments: AutoHighlightSegment[]
) => {
  pattern.lastIndex = 0;
  let match = pattern.exec(text);
  while (match) {
    const value = match[0];
    if (!value) {
      break;
    }
    const start = match.index ?? -1;
    if (start >= 0) {
      segments.push({ start, end: start + value.length, kind });
    }
    match = pattern.exec(text);
  }
};

const buildAutoHighlightSegments = (
  text: string,
  options: { english: boolean; number: boolean; special: boolean }
): AutoHighlightSegment[] => {
  if (!text) {
    return [];
  }
  if (!options.english && !options.number && !options.special) {
    return [];
  }
  const segments: AutoHighlightSegment[] = [];
  if (options.english) {
    collectAutoHighlightSegments(text, /[A-Za-z]+/g, "english", segments);
  }
  if (options.number) {
    collectAutoHighlightSegments(text, /[0-9]+/g, "number", segments);
  }
  if (options.special) {
    collectAutoHighlightSegments(
      text,
      /[^\p{L}\p{N}\s]+/gu,
      "special",
      segments
    );
  }
  return segments.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    return a.end - b.end;
  });
};

type ClassificationBadgeEntry = {
  tempId: string;
  label: LabelInsertData & { id?: string };
  color?: string;
};

const getTextColorForBackground = (color?: string): string => {
  if (!color) {
    return "#fff";
  }

  // Handle RGB/RGBA
  if (color.startsWith("rgb")) {
    const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      const r = parseInt(match[1], 10);
      const g = parseInt(match[2], 10);
      const b = parseInt(match[3], 10);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128 ? "#000" : "#fff";
    }
  }

  // Handle Hex
  let hex = color.replace("#", "");
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#fff";

  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "#000" : "#fff";
};

interface WorkspaceTextSectionProps {
  active: boolean;
  content: string;
}

function WorkspaceTextSection({ active, content }: WorkspaceTextSectionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const classOverlayRef = useRef<HTMLDivElement | null>(null);
  const skipPanelClickRef = useRef(false);
  const tool = useTextTypeLabelingToolSelectionStore((state) => state.tool);
  const setTool = useTextTypeLabelingToolSelectionStore(
    (state) => state.setTool
  );
  const zoomLevel = useWorkspaceZoomStore((state) => state.level);
  const selectedSegment = useTextSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const setSelectedSegment = useTextSegmentSelectionStore(
    (state) => state.setSelectedSegment
  );
  const { request } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(request);
  const layerMode = useLayerModeStore((state) => state.mode);
  const cycleLayerMode = useLayerModeStore((state) => state.cycleMode);
  const navigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.active
  );
  const setNavigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.setActive
  );
  const isValidationMode = useWorkspaceValidationModeStore(
    (state) => state.isValidationMode
  );
  const isEnglishHighlightActive = useTextAutoHighlightStore(
    (state) => state.english
  );
  const isNumberHighlightActive = useTextAutoHighlightStore(
    (state) => state.number
  );
  const isSpecialHighlightActive = useTextAutoHighlightStore(
    (state) => state.special
  );
  const setEnglishHighlightActive = useTextAutoHighlightStore(
    (state) => state.setEnglish
  );
  const setNumberHighlightActive = useTextAutoHighlightStore(
    (state) => state.setNumber
  );
  const setSpecialHighlightActive = useTextAutoHighlightStore(
    (state) => state.setSpecial
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const hiddenClassificationIds = useLabelVisibilityStore(
    (state) => state.hiddenClassificationIds
  );
  const classificationLabels = useLabelBatchStore(
    (state) => state.classificationLabels
  );
  const selectedClassificationId = useLabelSelectionStore(
    (state) => state.selectedClassificationId
  );
  const selectedClassificationInfo = useLabelSelectionStore(
    (state) => state.selectedClassificationInfo
  );
  const setSelectedClassificationId = useLabelSelectionStore(
    (state) => state.setSelectedClassificationId
  );
  const { issueLabelIdSet } = useWorkspaceIssueLabelIds();
  const openIssuePanel = useWorkspaceIssuePanelStore((state) => state.open);
  const hiddenRecognitionIds = useTextLabelUiStore(
    (state) => state.hiddenRecognitionIds
  );
  const lockedTextLabelIds = useTextLabelUiStore(
    (state) => state.lockedLabelIds
  );
  const { filter } = useFilterBySearchParams();
  const policyIdsFilter = filter.policyIds as SearchOperatorValue<string[]>;
  const policyIds = policyIdsFilter?.value ?? [];
  const { data: policies = [] } = useLabelingPoliciesBatch(policyIds);
  const hasDisplayContent = content.trim().length > 0;
  const historyContextKey = elementId ?? contentSetId ?? null;
  const { undo, redo } = useViewLabelHistory({
    active,
    contextKey: historyContextKey,
    historyStore: useTextLabelHistoryStore,
    getSnapshot: getTextLabelHistorySnapshot,
    applySnapshot: applyTextLabelHistorySnapshot,
    areSnapshotsEqual: areTextLabelHistorySnapshotsEqual,
  });
  const resolveClassificationMeta = useCallback(
    (
      policyId: string | null | undefined,
      value: ClassificationValue | undefined
    ) => {
      if (!policyId || !value) {
        return null;
      }
      const policy = policies.find((policyItem) => policyItem.id === policyId);
      if (!policy) {
        return null;
      }
      const classes = policy.classes ?? [];
      const byIndex =
        typeof value.classIndex === "number"
          ? classes.find((item) => item.index === value.classIndex)
          : undefined;
      if (byIndex) {
        return byIndex;
      }
      if (value.className) {
        return classes.find((item) => item.name === value.className) ?? null;
      }
      return null;
    },
    [policies]
  );
  const serverLabels = useMemo(() => {
    const list = labelSearchQuery.data?.list ?? [];
    if (!elementId) {
      return list;
    }
    return list.filter((label) => label.elementId === elementId);
  }, [elementId, labelSearchQuery.data?.list]);
  const serverClassificationEntries = useMemo<
    ClassificationBadgeEntry[]
  >(() => {
    return serverLabels
      .filter((label) => label.inferenceType === "CLASSIFICATION")
      .map((label) => {
        const classificationValue =
          (label.labelValue as ClassificationValue | undefined) ?? undefined;
        const classMeta = resolveClassificationMeta(
          label.policyId ?? undefined,
          classificationValue
        );
        return {
          tempId: label.id,
          label: {
            id: label.id,
            contentSetId: label.contentSetId ?? undefined,
            elementId: label.elementId ?? undefined,
            policyId: label.policyId ?? "",
            inferenceType: "CLASSIFICATION",
            unitType: label.unitType ?? "ELEMENT",
            labelType: label.labelType ?? undefined,
            labelValue: label.labelValue ?? undefined,
            attributeValues: label.attributeValues ?? [],
          },
          color: classMeta?.color,
        };
      });
  }, [resolveClassificationMeta, serverLabels]);
  const visibleClassificationLabels = useMemo<
    ClassificationBadgeEntry[]
  >(() => {
    const getClassificationKey = (entry: ClassificationBadgeEntry) => {
      const policyKey = entry.label.policyId ?? "";
      const value = entry.label.labelValue as ClassificationValue | undefined;
      const classIndex =
        typeof value?.classIndex === "number"
          ? `idx-${value.classIndex}`
          : null;
      const className = value?.className ? `name-${value.className}` : null;
      const keyPart = classIndex ?? className;
      if (!keyPart) {
        return entry.label.id ?? entry.tempId ?? null;
      }
      return `${policyKey}::${keyPart}`;
    };

    const currentKey = normalizeElementKey(elementId);
    const serverEntries = serverClassificationEntries.filter((entry) => {
      const entryKey = normalizeElementKey(entry.label.elementId ?? null);
      return entryKey === currentKey;
    });
    const merged = new Map<string, ClassificationBadgeEntry>();
    serverEntries.forEach((entry) => {
      const key = getClassificationKey(entry);
      merged.set(key, entry);
    });
    classificationLabels.forEach((entry) => {
      const entryKey = normalizeElementKey(entry.label.elementId ?? null);
      if (entryKey !== currentKey) {
        return;
      }
      const key = getClassificationKey(entry);
      merged.set(key, entry);
    });
    return Array.from(merged.values()).filter((entry) => {
      const key = entry.label.id ?? entry.tempId;
      if (!key) {
        return true;
      }
      return !hiddenClassificationIds[key];
    });
  }, [
    classificationLabels,
    elementId,
    hiddenClassificationIds,
    serverClassificationEntries,
  ]);
  const shouldShowClassificationFocus =
    tool?.id === "selection" &&
    Boolean(
      selectedClassificationId || selectedClassificationInfo?.isCanvasFocused
    );
  const classificationBorderColor = useMemo(() => {
    if (!shouldShowClassificationFocus) {
      return null;
    }
    const matchedClassification = selectedClassificationId
      ? visibleClassificationLabels.find(
          (entry) =>
            (entry.label.id ?? entry.tempId) === selectedClassificationId
        )
      : undefined;
    return matchedClassification?.color ?? null;
  }, [
    selectedClassificationId,
    shouldShowClassificationFocus,
    visibleClassificationLabels,
  ]);
  const panelBorderStyle = useMemo(
    () =>
      resolveWorkspaceBorderStyle({
        isFocused: shouldShowClassificationFocus,
        color: classificationBorderColor,
      }),
    [classificationBorderColor, shouldShowClassificationFocus]
  );

  const recognitionLabels = useLabelBatchStore(
    (state) => state.recognitionLabels
  );
  const recognitionDeletedIds = useLabelBatchStore(
    (state) => state.recognitionDeletedIds
  );
  const committedRecognitionDeletedIds = useLabelBatchStore(
    (state) => state.committedRecognitionDeletedIds
  );
  const addRecognitionLabel = useLabelBatchStore(
    (state) => state.addRecognitionLabel
  );
  const removeRecognitionLabel = useLabelBatchStore(
    (state) => state.removeRecognitionLabel
  );
  const removeRecognitionLabelById = useLabelBatchStore(
    (state) => state.removeRecognitionLabelById
  );
  const trimRecognitionDeletes = useLabelBatchStore(
    (state) => state.trimRecognitionDeletes
  );
  const trimCommittedRecognitionDeletes = useLabelBatchStore(
    (state) => state.trimCommittedRecognitionDeletes
  );

  const labelInsertPayload = useLabelInsertPayloadStore(
    (state) => state.payload
  );
  const labelInsertClassMeta = useLabelInsertPayloadStore(
    (state) => state.classMeta
  );

  const focusClassification = useCallback(() => {
    if (!active) {
      return;
    }
    if (tool?.id !== "selection") {
      return;
    }
    if (!hasDisplayContent) {
      return;
    }
    const selection =
      typeof window !== "undefined" ? window.getSelection?.() : null;
    if (selection && selection.toString().length > 0) {
      return;
    }
    const classificationValue =
      (labelInsertPayload?.labelValue as ClassificationValue | undefined) ??
      undefined;
    const nextTempId =
      selectedClassificationInfo?.tempId &&
      selectedClassificationInfo.isCanvasFocused
        ? selectedClassificationInfo.tempId
        : uuidv4();
    setSelectedClassificationId(null, {
      policyId: labelInsertPayload?.policyId ?? null,
      classIndex: classificationValue?.classIndex ?? null,
      className: classificationValue?.className ?? null,
      labelId: null,
      tempId: nextTempId,
      isCanvasFocused: true,
    });
  }, [
    active,
    labelInsertPayload?.labelValue,
    labelInsertPayload?.policyId,
    hasDisplayContent,
    selectedClassificationInfo?.isCanvasFocused,
    selectedClassificationInfo?.tempId,
    setSelectedClassificationId,
    tool?.id,
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }
    if (tool) {
      return;
    }
    setTool(selectionTool());
  }, [active, setTool, tool]);

  useEffect(() => {
    if (!labelSearchQuery.data?.list) {
      return;
    }
    const serverIds = new Set(
      labelSearchQuery.data.list
        .map((label) => label.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    );
    trimRecognitionDeletes(serverIds);
    trimCommittedRecognitionDeletes(serverIds);
  }, [
    labelSearchQuery.data?.list,
    trimCommittedRecognitionDeletes,
    trimRecognitionDeletes,
  ]);

  useEffect(() => {
    if (!active) {
      setSelectedSegment(null);
    }
  }, [active, setSelectedSegment]);

  useEffect(() => {
    setSelectedSegment(null);
  }, [content, setSelectedSegment]);

  const deletedRecognitionSet = useMemo(
    () =>
      new Set(
        [...recognitionDeletedIds, ...committedRecognitionDeletedIds].filter(
          (id): id is string => typeof id === "string" && id.length > 0
        )
      ),
    [committedRecognitionDeletedIds, recognitionDeletedIds]
  );

  type RecognitionSegment = {
    key: string;
    source: "server" | "local";
    tempId: string;
    labelId: string | null;
    start: number;
    end: number;
    text: string;
    color?: string;
    opacity?: number;
    zindex?: number;
  };

  const recognitionSegments = useMemo<RecognitionSegment[]>(() => {
    const segmentMap = new Map<string, RecognitionSegment>();

    serverLabels.forEach((label) => {
      if (label.inferenceType !== "RECOGNITION") {
        return;
      }
      if (label.id && deletedRecognitionSet.has(label.id)) {
        return;
      }
      const value = label.labelValue as
        | {
            start?: number;
            end?: number;
            text?: string;
            color?: string;
            opacity?: number;
            zindex?: number;
          }
        | undefined;
      const start =
        typeof value?.start === "number" && Number.isFinite(value.start)
          ? Math.max(0, Math.floor(value.start))
          : null;
      const end =
        typeof value?.end === "number" && Number.isFinite(value.end)
          ? Math.max(0, Math.floor(value.end))
          : null;
      if (start === null || end === null) {
        return;
      }
      const boundedStart = Math.min(start, content.length);
      const boundedEnd = Math.min(end, content.length);
      if (boundedEnd <= boundedStart) {
        return;
      }
      const key = label.id ?? `${boundedStart}-${boundedEnd}`;
      if (hiddenRecognitionIds[key]) {
        return;
      }
      segmentMap.set(key, {
        key,
        source: "server",
        tempId: label.id ?? key,
        labelId: label.id ?? null,
        start: boundedStart,
        end: boundedEnd,
        text: value?.text ?? content.slice(boundedStart, boundedEnd),
        color: value?.color,
        opacity:
          typeof value?.opacity === "number" && Number.isFinite(value.opacity)
            ? value.opacity
            : undefined,
        zindex:
          typeof value?.zindex === "number" && Number.isFinite(value.zindex)
            ? value.zindex
            : undefined,
      });
    });

    recognitionLabels.forEach((entry) => {
      if (entry.label.inferenceType !== "RECOGNITION") {
        return;
      }
      if (elementId && entry.label.elementId !== elementId) {
        return;
      }
      const value = entry.label.labelValue as
        | {
            start?: number;
            end?: number;
            text?: string;
            color?: string;
            opacity?: number;
            zindex?: number;
          }
        | undefined;
      const start =
        typeof value?.start === "number" && Number.isFinite(value.start)
          ? Math.max(0, Math.floor(value.start))
          : null;
      const end =
        typeof value?.end === "number" && Number.isFinite(value.end)
          ? Math.max(0, Math.floor(value.end))
          : null;
      if (start === null || end === null) {
        return;
      }
      const boundedStart = Math.min(start, content.length);
      const boundedEnd = Math.min(end, content.length);
      if (boundedEnd <= boundedStart) {
        return;
      }
      const key = entry.label.id ?? entry.tempId;
      if (hiddenRecognitionIds[key]) {
        return;
      }
      segmentMap.set(key, {
        key,
        source: "local",
        tempId: entry.tempId,
        labelId: entry.label.id ?? null,
        start: boundedStart,
        end: boundedEnd,
        text: value?.text ?? content.slice(boundedStart, boundedEnd),
        color:
          entry.color ??
          (typeof value?.color === "string" && value.color.length > 0
            ? value.color
            : undefined),
        opacity:
          typeof value?.opacity === "number" && Number.isFinite(value.opacity)
            ? value.opacity
            : undefined,
        zindex:
          typeof value?.zindex === "number" && Number.isFinite(value.zindex)
            ? value.zindex
            : undefined,
      });
    });

    return Array.from(segmentMap.values()).sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return a.end - b.end;
    });
  }, [
    content,
    deletedRecognitionSet,
    elementId,
    hiddenRecognitionIds,
    recognitionLabels,
    serverLabels,
  ]);

  const maxRecognitionZIndex = useMemo(() => {
    return recognitionSegments.reduce((maxValue, segment) => {
      if (
        typeof segment.zindex === "number" &&
        Number.isFinite(segment.zindex)
      ) {
        return Math.max(maxValue, segment.zindex);
      }
      return maxValue;
    }, 0);
  }, [recognitionSegments]);

  const autoHighlightSegments = useMemo(() => {
    return buildAutoHighlightSegments(content, {
      english: isEnglishHighlightActive,
      number: isNumberHighlightActive,
      special: isSpecialHighlightActive,
    });
  }, [
    content,
    isEnglishHighlightActive,
    isNumberHighlightActive,
    isSpecialHighlightActive,
  ]);

  const recognitionSegmentByKey = useMemo(() => {
    const map = new Map<string, RecognitionSegment>();
    recognitionSegments.forEach((segment) => {
      map.set(segment.key, segment);
    });
    return map;
  }, [recognitionSegments]);

  useEffect(() => {
    if (!selectedSegment) {
      return;
    }
    const next = recognitionSegmentByKey.get(selectedSegment.key) ?? null;
    if (!next) {
      setSelectedSegment(null);
      return;
    }
    if (
      next.start !== selectedSegment.start ||
      next.end !== selectedSegment.end ||
      next.text !== selectedSegment.text ||
      next.color !== selectedSegment.color ||
      next.opacity !== selectedSegment.opacity ||
      next.labelId !== selectedSegment.labelId ||
      next.tempId !== selectedSegment.tempId
    ) {
      setSelectedSegment({
        key: next.key,
        labelId: next.labelId,
        tempId: next.tempId,
        start: next.start,
        end: next.end,
        text: next.text,
        color: next.color,
        opacity: next.opacity,
      });
    }
  }, [recognitionSegmentByKey, selectedSegment, setSelectedSegment]);

  const renderNodes = useMemo(() => {
    if (!layerMode.includes(OVERLAY_LAYER_INDEX)) {
      return [<span key="text-0">{content}</span>];
    }
    const hasAutoHighlight = autoHighlightSegments.length > 0;
    const hasRecognition = recognitionSegments.length > 0;
    if (!hasAutoHighlight && !hasRecognition) {
      return [<span key="text-0">{content}</span>];
    }
    const segments = recognitionSegments;

    const defaultHighlightColor = "rgba(250, 204, 21, 0.45)";
    const boundaries = new Set<number>([0, content.length]);
    segments.forEach((segment) => {
      boundaries.add(segment.start);
      boundaries.add(segment.end);
    });
    autoHighlightSegments.forEach((segment) => {
      boundaries.add(segment.start);
      boundaries.add(segment.end);
    });
    const points = Array.from(boundaries).sort((a, b) => a - b);
    if (points.length < 2) {
      return [<span key="text-0">{content}</span>];
    }

    const nodes: ReactNode[] = [];
    let nodeIndex = 0;

    const recognitionStarts = segments;
    const recognitionEnds = [...segments].sort((a, b) => {
      if (a.end !== b.end) {
        return a.end - b.end;
      }
      if (a.start !== b.start) {
        return a.start - b.start;
      }
      return a.key.localeCompare(b.key);
    });
    const autoStarts = autoHighlightSegments;
    const autoEnds = [...autoHighlightSegments].sort((a, b) => {
      if (a.end !== b.end) {
        return a.end - b.end;
      }
      if (a.start !== b.start) {
        return a.start - b.start;
      }
      return a.kind.localeCompare(b.kind);
    });

    let recognitionStartIndex = 0;
    let recognitionEndIndex = 0;
    let autoStartIndex = 0;
    let autoEndIndex = 0;

    const activeRecognitionSegments = new Map<string, RecognitionSegment>();
    const activeAutoSegments = new Set<AutoHighlightSegment>();

    const buildHighlightStyle = (
      activeSegments: RecognitionSegment[]
    ): CSSProperties | undefined => {
      const colors = activeSegments.map(
        (segment) => segment.color ?? defaultHighlightColor
      );
      const uniqueColors = Array.from(
        new Set(
          colors.filter(
            (color): color is string =>
              typeof color === "string" && color.length > 0
          )
        )
      );
      if (!uniqueColors.length) {
        return undefined;
      }
      if (uniqueColors.length === 1) {
        return {
          ["--highlight-color" as string]: uniqueColors[0],
        };
      }
      const step = 100 / uniqueColors.length;
      const stops = uniqueColors
        .map((color, idx) => {
          const start = (idx * step).toFixed(2);
          const end = ((idx + 1) * step).toFixed(2);
          return `${color} ${start}% ${end}%`;
        })
        .join(", ");
      return {
        backgroundImage: `linear-gradient(180deg, ${stops})`,
      };
    };

    const pickSegment = (
      activeSegments: RecognitionSegment[]
    ): RecognitionSegment | null => {
      let best: RecognitionSegment | null = null;
      for (const segment of activeSegments) {
        if (lockedTextLabelIds[segment.key]) {
          continue;
        }
        if (!best) {
          best = segment;
          continue;
        }
        const zIndexCandidate =
          typeof segment.zindex === "number" && Number.isFinite(segment.zindex)
            ? segment.zindex
            : 0;
        const zIndexBest =
          typeof best.zindex === "number" && Number.isFinite(best.zindex)
            ? best.zindex
            : 0;
        if (zIndexCandidate !== zIndexBest) {
          if (zIndexCandidate > zIndexBest) {
            best = segment;
          }
          continue;
        }
        if (segment.start !== best.start) {
          if (segment.start < best.start) {
            best = segment;
          }
          continue;
        }
        if (segment.end !== best.end) {
          if (segment.end < best.end) {
            best = segment;
          }
          continue;
        }
        if (segment.key.localeCompare(best.key) < 0) {
          best = segment;
        }
      }
      return best;
    };

    const pickAutoHighlightKind = (
      activeSegments: ReadonlySet<AutoHighlightSegment>,
      start: number,
      end: number
    ): AutoHighlightKind | null => {
      let bestSegment: AutoHighlightSegment | null = null;
      for (const segment of activeSegments) {
        if (segment.start > start || segment.end < end) {
          continue;
        }
        if (!bestSegment) {
          bestSegment = segment;
          continue;
        }
        if (segment.start !== bestSegment.start) {
          if (segment.start < bestSegment.start) {
            bestSegment = segment;
          }
          continue;
        }
        if (segment.end !== bestSegment.end) {
          if (segment.end < bestSegment.end) {
            bestSegment = segment;
          }
          continue;
        }
        if (segment.kind.localeCompare(bestSegment.kind) < 0) {
          bestSegment = segment;
        }
      }
      if (!bestSegment) {
        return null;
      }
      return bestSegment.kind;
    };

    for (let idx = 0; idx < points.length - 1; idx += 1) {
      const start = points[idx];
      const end = points[idx + 1];

      while (
        recognitionEndIndex < recognitionEnds.length &&
        recognitionEnds[recognitionEndIndex].end <= start
      ) {
        activeRecognitionSegments.delete(recognitionEnds[recognitionEndIndex].key);
        recognitionEndIndex += 1;
      }
      while (
        recognitionStartIndex < recognitionStarts.length &&
        recognitionStarts[recognitionStartIndex].start <= start
      ) {
        const segment = recognitionStarts[recognitionStartIndex];
        activeRecognitionSegments.set(segment.key, segment);
        recognitionStartIndex += 1;
      }

      while (autoEndIndex < autoEnds.length && autoEnds[autoEndIndex].end <= start) {
        activeAutoSegments.delete(autoEnds[autoEndIndex]);
        autoEndIndex += 1;
      }
      while (
        autoStartIndex < autoStarts.length &&
        autoStarts[autoStartIndex].start <= start
      ) {
        activeAutoSegments.add(autoStarts[autoStartIndex]);
        autoStartIndex += 1;
      }

      if (start >= end) {
        continue;
      }
      const slice = content.slice(start, end);
      if (!slice) {
        continue;
      }

      const autoKind = pickAutoHighlightKind(activeAutoSegments, start, end);
      const sliceNode: ReactNode = autoKind ? (
        <span
          key={`auto-${start}-${end}-${nodeIndex}`}
          className={`workspace-text__auto-highlight workspace-text__auto-highlight--${autoKind}`}
        >
          {slice}
        </span>
      ) : (
        slice
      );

      const activeSegments = Array.from(activeRecognitionSegments.values());
      if (!activeSegments.length) {
        nodes.push(sliceNode);
        nodeIndex += 1;
        continue;
      }
      const targetSegment = pickSegment(activeSegments);
      const isSelected = Boolean(
        selectedSegment?.key && activeRecognitionSegments.has(selectedSegment.key)
      );
      nodes.push(
        <mark
          key={`seg-${start}-${end}-${nodeIndex++}`}
          className={`workspace-text__highlight${isSelected ? " is-selected" : ""}`}
          style={buildHighlightStyle(activeSegments)}
          onMouseDown={(event) => {
            if (tool?.id !== "selection") {
              return;
            }
            if (!targetSegment) {
              return;
            }
            event.preventDefault();
            setSelectedSegment({
              key: targetSegment.key,
              labelId: targetSegment.labelId,
              tempId: targetSegment.tempId,
              start: targetSegment.start,
              end: targetSegment.end,
              text: targetSegment.text,
              color: targetSegment.color,
              opacity: targetSegment.opacity,
            });
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (!targetSegment) {
              return;
            }
            setSelectedSegment({
              key: targetSegment.key,
              labelId: targetSegment.labelId,
              tempId: targetSegment.tempId,
              start: targetSegment.start,
              end: targetSegment.end,
              text: targetSegment.text,
              color: targetSegment.color,
              opacity: targetSegment.opacity,
            });
          }}
        >
          {sliceNode}
        </mark>
      );
    }

    if (!nodes.length) {
      return [<span key="text-0">{content}</span>];
    }
    return nodes;
  }, [
    content,
    autoHighlightSegments,
    layerMode,
    recognitionSegments,
    selectedSegment?.key,
    setSelectedSegment,
    tool?.id,
    lockedTextLabelIds,
  ]);

  const clearDomSelection = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const selection = window.getSelection?.();
    if (!selection) {
      return;
    }
    selection.removeAllRanges();
  }, []);

  const getOffsetFromSelection = useCallback((node: Node, offset: number) => {
    const container = containerRef.current;
    if (!container) {
      return 0;
    }
    const range = document.createRange();
    range.selectNodeContents(container);
    range.setEnd(node, offset);
    return range.toString().length;
  }, []);

  const handleCreateSegmentFromSelection = useCallback(() => {
    if (!active) {
      return;
    }
    if (tool?.id !== "drag-segment") {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0) {
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      return;
    }
    if (range.collapsed) {
      return;
    }

    const startOffset = getOffsetFromSelection(
      range.startContainer,
      range.startOffset
    );
    const endOffset = getOffsetFromSelection(
      range.endContainer,
      range.endOffset
    );
    const start = Math.max(0, Math.min(startOffset, endOffset));
    const end = Math.min(content.length, Math.max(startOffset, endOffset));
    if (end <= start) {
      return;
    }

    if (!labelInsertPayload?.policyId) {
      // eslint-disable-next-line no-console -- 텍스트 라벨링 조건 안내용
      console.warn("정책/클래스를 선택한 뒤 텍스트 하이라이팅을 진행해주세요.");
      clearDomSelection();
      return;
    }

    const classValue = labelInsertPayload.labelValue as
      | { classIndex?: number; className?: string }
      | undefined;

    const nextLabel: LabelInsertData = {
      ...labelInsertPayload,
      inferenceType: "RECOGNITION",
      labelValue: {
        ...(typeof classValue === "object" && classValue
          ? {
              classIndex: classValue.classIndex,
              className: classValue.className,
            }
          : {}),
        start,
        end,
        text: content.slice(start, end),
        zindex: maxRecognitionZIndex + 1,
        ...(labelInsertClassMeta?.color
          ? { color: labelInsertClassMeta.color }
          : {}),
        ...(typeof labelInsertClassMeta?.opacity === "number"
          ? { opacity: labelInsertClassMeta.opacity }
          : {}),
      },
      attributeValues: [],
    };

    const tempId = uuidv4();
    addRecognitionLabel(nextLabel, {
      tempId,
      color: labelInsertClassMeta?.color,
    });
    setSelectedSegment({
      key: tempId,
      labelId: null,
      tempId,
      start,
      end,
      text: content.slice(start, end),
      color: labelInsertClassMeta?.color,
      opacity:
        typeof labelInsertClassMeta?.opacity === "number"
          ? labelInsertClassMeta.opacity
          : undefined,
    });
    skipPanelClickRef.current = true;
    clearDomSelection();
  }, [
    active,
    addRecognitionLabel,
    clearDomSelection,
    content,
    getOffsetFromSelection,
    labelInsertClassMeta?.color,
    labelInsertClassMeta?.opacity,
    labelInsertPayload,
    maxRecognitionZIndex,
    setSelectedSegment,
    tool?.id,
  ]);

  const handleRemoveSelectedSegment = useCallback(() => {
    if (!selectedSegment) {
      return;
    }
    if (lockedTextLabelIds[selectedSegment.key]) {
      return;
    }
    if (selectedSegment.tempId && !selectedSegment.labelId) {
      removeRecognitionLabel(selectedSegment.tempId);
      setSelectedSegment(null);
      return;
    }
    if (selectedSegment.labelId) {
      removeRecognitionLabelById(selectedSegment.labelId);
      setSelectedSegment(null);
    }
  }, [
    lockedTextLabelIds,
    removeRecognitionLabel,
    removeRecognitionLabelById,
    selectedSegment,
    setSelectedSegment,
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreLabelingShortcutEvent(event.target)) {
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.code === "KeyZ"
      ) {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const key = getLabelingShortcutKey(event);
      if (key === "escape") {
        setSelectedSegment(null);
        setSelectedClassificationId(null);
        return;
      }
      if (key === LABELING_SHORTCUTS.common.layerToggle.key) {
        cycleLayerMode();
        event.preventDefault();
        return;
      }
      if (key === LABELING_SHORTCUTS.common.navigationToggle.key) {
        setNavigationActive(!navigationActive);
        event.preventDefault();
        return;
      }
      if (key === LABELING_SHORTCUTS.common.selection.key) {
        setTool(selectionTool());
        event.preventDefault();
        return;
      }
      if (
        !isValidationMode &&
        key === LABELING_SHORTCUTS.text.highlighting.key
      ) {
        setTool(dragSegmentTool());
        event.preventDefault();
        return;
      }
      if (
        !isValidationMode &&
        key === LABELING_SHORTCUTS.text.autoHighlight.key
      ) {
        const hasAutoHighlight =
          isEnglishHighlightActive ||
          isNumberHighlightActive ||
          isSpecialHighlightActive;
        if (hasAutoHighlight) {
          setEnglishHighlightActive(false);
          setNumberHighlightActive(false);
          setSpecialHighlightActive(false);
        } else {
          setEnglishHighlightActive(true);
          setNumberHighlightActive(false);
          setSpecialHighlightActive(false);
        }
        event.preventDefault();
        return;
      }
      if (key !== "backspace" && key !== "delete") {
        return;
      }
      if (!selectedSegment) {
        return;
      }
      event.preventDefault();
      handleRemoveSelectedSegment();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    active,
    cycleLayerMode,
    handleRemoveSelectedSegment,
    isEnglishHighlightActive,
    isNumberHighlightActive,
    isSpecialHighlightActive,
    isValidationMode,
    navigationActive,
    redo,
    selectedSegment,
    setSelectedClassificationId,
    setSelectedSegment,
    setEnglishHighlightActive,
    setNumberHighlightActive,
    setNavigationActive,
    setSpecialHighlightActive,
    setTool,
    undo,
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const panelElement = containerRef.current;
    if (!panelElement) {
      return;
    }
    const contentWrapper = panelElement.closest(".content-wrapper");
    if (!(contentWrapper instanceof HTMLElement)) {
      return;
    }

    const handleContainerMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (
        target instanceof Element &&
        target.closest(".floating-toolbar-wrapper")
      ) {
        return;
      }
      if (panelElement.contains(target)) {
        return;
      }
      const overlayElement = classOverlayRef.current;
      if (overlayElement && overlayElement.contains(target)) {
        return;
      }
      setSelectedSegment(null);
      setSelectedClassificationId(null);
      clearDomSelection();
    };

    contentWrapper.addEventListener("mousedown", handleContainerMouseDown);
    return () => {
      contentWrapper.removeEventListener("mousedown", handleContainerMouseDown);
    };
  }, [
    active,
    clearDomSelection,
    setSelectedClassificationId,
    setSelectedSegment,
  ]);

  const handlePanelClick = () => {
    if (skipPanelClickRef.current) {
      skipPanelClickRef.current = false;
      return;
    }
    setSelectedSegment(null);
    focusClassification();
  };

  return (
    <div
      style={active ? undefined : { display: "none" }}
      className="workspace-section workspace-section--text"
    >
      <div className="workspace-section__text-wrapper">
        {visibleClassificationLabels.length > 0 && (
          <div
            ref={classOverlayRef}
            className="workspace-class-overlay"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: "translateY(-23px)",
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 4,
              alignItems: "center",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            {layerMode.includes(OVERLAY_LAYER_INDEX) &&
              visibleClassificationLabels.map((item) => {
                const className =
                  item.label.labelValue &&
                  typeof item.label.labelValue === "object" &&
                  "className" in item.label.labelValue
                    ? ((item.label.labelValue as { className?: string })
                        .className ?? "no class")
                    : "no class";
                const issueLabelId = item.label.id ?? item.tempId ?? null;
                const hasIssue =
                  issueLabelId ? issueLabelIdSet.has(issueLabelId) : false;
                const selectClassification = () => {
                  const classificationValue =
                    (item.label.labelValue as ClassificationValue | undefined) ??
                    undefined;
                  setSelectedClassificationId(item.label.id ?? item.tempId, {
                    policyId: item.label.policyId,
                    classIndex: classificationValue?.classIndex ?? null,
                    className: classificationValue?.className ?? null,
                    labelId: item.label.id ?? null,
                    tempId: item.tempId,
                    isCanvasFocused: false,
                  });
                };
                return (
                  <div
                    key={item.tempId}
                    className="workspace-class-badge-group"
                  >
                    <button
                      type="button"
                      className="workspace-class-name"
                      style={{
                        position: "relative",
                        backgroundColor: item.color ?? "rgba(0,0,0,0.75)",
                        color: getTextColorForBackground(
                          item.color ?? "rgba(0,0,0,0.75)"
                        ),
                        pointerEvents: "auto",
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        selectClassification();
                      }}
                    >
                      {className}
                    </button>
                    {hasIssue && (
                      <button
                        type="button"
                        className="workspace-issue-badge"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectClassification();
                          openIssuePanel();
                        }}
                      >
                        <Icon iconType="icon-issue" size="xs" />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>
        )}
        <div
          ref={containerRef}
          className="workspace-section__text-panel"
          style={{
            ...panelBorderStyle,
            fontSize: `${Math.max(0.1, zoomLevel)}rem`,
            ...(hasDisplayContent
              ? {}
              : { paddingInline: "inherit", paddingBlock: "inherit" }),
          }}
          onMouseUp={handleCreateSegmentFromSelection}
          onClick={handlePanelClick}
          role="textbox"
          aria-label="Text labeling panel"
          tabIndex={0}
        >
          {hasDisplayContent ? (
            renderNodes
          ) : (
            <Tip
              title="No text data to display"
              content="This cell does not contain any text data."
              isClosable={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default WorkspaceTextSection;
