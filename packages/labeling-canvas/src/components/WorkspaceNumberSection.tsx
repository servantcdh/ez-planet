import { useCallback, useEffect, useMemo, useRef } from "react";

import { v4 as uuidv4 } from "uuid";

import { Icon } from "@/components";
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
import {
  applyNumberLabelHistorySnapshot,
  areNumberLabelHistorySnapshotsEqual,
  getNumberLabelHistorySnapshot,
  useNumberLabelHistoryStore,
} from "../store/numberLabelHistory.store";
import { useNumberLabelingToolSelectionStore } from "../store/numberLabelingToolSelection.store";
import { useNumberLabelUiStore } from "../store/numberLabelUi.store";
import { useNumberSegmentSelectionStore } from "../store/numberSegmentSelection.store";
import { useWorkspaceIssuePanelStore } from "../store/workspaceIssuePanel.store";
import {
  useWorkspaceLayoutStore,
  useWorkspaceNavigationActiveStore,
} from "../store/workspaceLayout.store";
import {
  useWorkspaceNavigationDetailSelectionStore,
  type WorkspaceNavigationChartAxisSnapshot,
} from "../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceZoomStore } from "../store/workspaceZoom.store";
import type {
  ChartValue,
  ClassificationValue,
  LabelInsertData,
} from "../types/domain";
import {
  getLabelingShortcutKey,
  LABELING_SHORTCUTS,
  shouldIgnoreLabelingShortcutEvent,
} from "../utils/labelingShortcuts";
import { dragSegmentTool, selectionTool } from "../utils/numberLabelingTools";
import { resolveWorkspaceBorderStyle } from "../utils/workspaceFocusBorder";
import WorkspaceNumberChart from "./WorkspaceNumberChart";

type ClassificationBadgeEntry = {
  tempId: string;
  label: LabelInsertData & { id?: string };
  color?: string;
};

const getTextColorForBackground = (color?: string): string => {
  if (!color) {
    return "#fff";
  }

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

const isSegmentClassification = (label: {
  inferenceType?: string;
  labelType?: string | null;
  labelValue?: ChartValue | unknown;
  elementId?: string | null;
}): boolean => {
  if (label.inferenceType !== "CLASSIFICATION") {
    return false;
  }
  if ((label.labelType ?? "").toUpperCase() !== "TABLE") {
    return false;
  }
  const value = label.labelValue as ChartValue | undefined;
  return Boolean(
    value?.columnName &&
      typeof label.elementId === "string" &&
      label.elementId.length > 0
  );
};

interface WorkspaceNumberSectionProps {
  active: boolean;
  snapshot: WorkspaceNavigationChartAxisSnapshot;
}

function WorkspaceNumberSection({
  active,
  snapshot,
}: WorkspaceNumberSectionProps) {
  const direction = useWorkspaceLayoutStore((state) => state.direction);
  const zoomLevel = useWorkspaceZoomStore((state) => state.level);
  const layerMode = useLayerModeStore((state) => state.mode);
  const cycleLayerMode = useLayerModeStore((state) => state.cycleMode);
  const tool = useNumberLabelingToolSelectionStore((state) => state.tool);
  const setTool = useNumberLabelingToolSelectionStore((state) => state.setTool);
  const navigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.active
  );
  const setNavigationActive = useWorkspaceNavigationActiveStore(
    (state) => state.setActive
  );
  const labelInsertPayload = useLabelInsertPayloadStore(
    (state) => state.payload
  );
  const { filter } = useFilterBySearchParams();
  const policyIdsFilter = filter.policyIds as SearchOperatorValue<string[]>;
  const policyIds = policyIdsFilter?.value ?? [];
  const { data: policies = [] } = useLabelingPoliciesBatch(policyIds);
  const { request } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(request);
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const hasDisplayContent =
    snapshot.canRender && snapshot.yAxis.series.length > 0;
  const hiddenClassificationIds = useLabelVisibilityStore(
    (state) => state.hiddenClassificationIds
  );
  const lockedLabelIds = useNumberLabelUiStore((state) => state.lockedLabelIds);
  const classificationLabels = useLabelBatchStore(
    (state) => state.classificationLabels
  );
  const serverLabels = useMemo(() => {
    const list = labelSearchQuery.data?.list ?? [];
    if (!elementId) {
      return list;
    }
    return list.filter((label) => label.elementId === elementId);
  }, [elementId, labelSearchQuery.data?.list]);
  const tableLabelIdSet = useMemo(() => {
    const ids = new Set<string>();
    serverLabels.forEach((label) => {
      if ((label.labelType ?? "").toUpperCase() !== "TABLE") {
        return;
      }
      if (label.id) {
        ids.add(label.id);
      }
    });
    classificationLabels.forEach((entry) => {
      if ((entry.label.labelType ?? "").toUpperCase() !== "TABLE") {
        return;
      }
      if (elementId && entry.label.elementId !== elementId) {
        return;
      }
      if (entry.label.id) {
        ids.add(entry.label.id);
      }
    });
    return ids;
  }, [classificationLabels, elementId, serverLabels]);
  const tableLabelIdSetRef = useRef(tableLabelIdSet);
  const removeClassificationLabel = useLabelBatchStore(
    (state) => state.removeClassificationLabel
  );
  const removeClassificationLabelById = useLabelBatchStore(
    (state) => state.removeClassificationLabelById
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
  const selectedSegment = useNumberSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const setSelectedSegment = useNumberSegmentSelectionStore(
    (state) => state.setSelectedSegment
  );
  const panelRef = useRef<HTMLDivElement | null>(null);
  const classOverlayRef = useRef<HTMLDivElement | null>(null);
  const historyContextKey = contentSetId ?? null;
  useEffect(() => {
    tableLabelIdSetRef.current = tableLabelIdSet;
  }, [tableLabelIdSet]);
  const getHistorySnapshot = useCallback(
    (state: ReturnType<typeof useLabelBatchStore.getState>) =>
      getNumberLabelHistorySnapshot(state, tableLabelIdSetRef.current),
    [getNumberLabelHistorySnapshot]
  );
  const applyHistorySnapshot = useCallback(
    (snapshot: ReturnType<typeof getNumberLabelHistorySnapshot> | null) => {
      applyNumberLabelHistorySnapshot(snapshot, tableLabelIdSetRef.current);
    },
    [applyNumberLabelHistorySnapshot]
  );
  const { undo, redo } = useViewLabelHistory({
    active,
    contextKey: historyContextKey,
    historyStore: useNumberLabelHistoryStore,
    getSnapshot: getHistorySnapshot,
    applySnapshot: applyHistorySnapshot,
    areSnapshotsEqual: areNumberLabelHistorySnapshotsEqual,
  });

  const resolveClassificationMeta = useCallback(
    (
      policyId: string | null | undefined,
      value: ClassificationValue | ChartValue | undefined
    ) => {
      if (!policyId || !value) {
        return null;
      }
      const policy = policies.find((item) => item.id === policyId);
      if (!policy) {
        return null;
      }
      const byIndex =
        typeof value.classIndex === "number"
          ? policy.classes.find((item) => item.index === value.classIndex)
          : undefined;
      if (byIndex) {
        return byIndex;
      }
      if (value.className) {
        return (
          policy.classes.find((item) => item.name === value.className) ?? null
        );
      }
      return null;
    },
    [policies]
  );

  const serverClassificationEntries = useMemo<
    ClassificationBadgeEntry[]
  >(() => {
    return serverLabels
      .filter(
        (label) =>
          label.inferenceType === "CLASSIFICATION" &&
          (label.labelType ?? "").toUpperCase() === "TABLE" &&
          !isSegmentClassification(label)
      )
      .map((label) => {
        const chartValue = label.labelValue as ChartValue | undefined;
        const classMeta = resolveClassificationMeta(
          label.policyId ?? undefined,
          chartValue
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
          color: chartValue?.color ?? classMeta?.color,
        };
      });
  }, [resolveClassificationMeta, serverLabels]);

  const visibleClassificationLabels = useMemo<
    ClassificationBadgeEntry[]
  >(() => {
    const getClassificationKey = (entry: ClassificationBadgeEntry) => {
      const policyKey = entry.label.policyId ?? "";
      const value = entry.label.labelValue as
        | { classIndex?: number; className?: string }
        | undefined;
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

    const merged = new Map<string | null, ClassificationBadgeEntry>();
    serverClassificationEntries.forEach((entry) => {
      if (contentSetId && entry.label.contentSetId !== contentSetId) {
        return;
      }
      if (elementId && entry.label.elementId !== elementId) {
        return;
      }
      const key = getClassificationKey(entry);
      merged.set(key, entry);
    });
    classificationLabels.forEach((entry) => {
      if (entry.label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if ((entry.label.labelType ?? "").toUpperCase() !== "TABLE") {
        return;
      }
      if (isSegmentClassification(entry.label)) {
        return;
      }
      if (contentSetId && entry.label.contentSetId !== contentSetId) {
        return;
      }
      if (elementId && entry.label.elementId !== elementId) {
        return;
      }
      const value = entry.label.labelValue as ChartValue | undefined;
      const classMeta = resolveClassificationMeta(
        entry.label.policyId ?? undefined,
        value
      );
      const key = getClassificationKey(entry);
      merged.set(key, {
        ...entry,
        color: value?.color ?? entry.color ?? classMeta?.color,
      });
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
    contentSetId,
    elementId,
    hiddenClassificationIds,
    resolveClassificationMeta,
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

  const handleRemoveSelectedSegment = useCallback(() => {
    if (!selectedSegment) {
      return;
    }
    if (lockedLabelIds[selectedSegment.key]) {
      return;
    }
    const tempIds = selectedSegment.tempIds ?? [];
    const labelIds = selectedSegment.labelIds ?? [];
    const uniqueTempIds = Array.from(new Set(tempIds));
    const uniqueLabelIds = Array.from(new Set(labelIds));
    uniqueTempIds.forEach((tempId) => {
      removeClassificationLabel(tempId);
    });
    uniqueLabelIds.forEach((labelId) => {
      removeClassificationLabelById(labelId);
    });
    setSelectedSegment(null);
  }, [
    lockedLabelIds,
    removeClassificationLabel,
    removeClassificationLabelById,
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
        if (selectedSegment) {
          setSelectedSegment(null);
        }
        setSelectedClassificationId(null);
        event.preventDefault();
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
      if (key === LABELING_SHORTCUTS.number.highlighting.key) {
        setTool(dragSegmentTool());
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
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    active,
    cycleLayerMode,
    handleRemoveSelectedSegment,
    navigationActive,
    redo,
    selectedSegment,
    setSelectedClassificationId,
    setSelectedSegment,
    setNavigationActive,
    setTool,
    undo,
  ]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const panelElement = panelRef.current;
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
      setSelectedClassificationId(null);
    };
    contentWrapper.addEventListener("mousedown", handleContainerMouseDown);
    return () => {
      contentWrapper.removeEventListener("mousedown", handleContainerMouseDown);
    };
  }, [active, setSelectedClassificationId]);

  return (
    <div
      style={active ? undefined : { display: "none" }}
      className="workspace-section workspace-section--number"
    >
      <div className="workspace-section__number-wrapper">
        {visibleClassificationLabels.length > 0 && (
          <div
            ref={classOverlayRef}
            className="workspace-class-overlay"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform:
                direction === "vertical"
                  ? "translateY(15px)"
                  : "translateY(25px)",
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
                const chartValue =
                  (item.label.labelValue as
                    | ChartValue
                    | ClassificationValue
                    | undefined) ?? undefined;
                const classMeta = resolveClassificationMeta(
                  item.label.policyId ?? undefined,
                  chartValue
                );
                const className =
                  classMeta?.name ??
                  chartValue?.className ??
                  (typeof chartValue?.classIndex === "number"
                    ? `Class ${chartValue.classIndex}`
                    : "Classification");
                const issueLabelId = item.label.id ?? item.tempId ?? null;
                const hasIssue =
                  issueLabelId ? issueLabelIdSet.has(issueLabelId) : false;
                const selectClassification = () => {
                  setSelectedClassificationId(item.label.id ?? item.tempId, {
                    policyId: item.label.policyId,
                    classIndex: chartValue?.classIndex ?? null,
                    className: chartValue?.className ?? null,
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
          className="workspace-section__number-panel"
          ref={panelRef}
          style={{
            ...panelBorderStyle,
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "100%",
            height: "87.2%",
            transform: "translate(-50%, -50%)",
            transformOrigin: "center",
          }}
          onClick={focusClassification}
          role="presentation"
        >
          <WorkspaceNumberChart snapshot={snapshot} zoomLevel={zoomLevel} />
        </div>
      </div>
    </div>
  );
}

export default WorkspaceNumberSection;
