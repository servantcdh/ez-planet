import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button, Icon, Input, Tabs, Wrapper } from "@/components";
import type { SearchOperatorValue } from "@/features/content-group/queries";
import type { DatasetContentVersion } from "@/features/dataset/queries";
import { useWorkspaceIssuePanelStore } from "@/store/workspaceIssuePanel.store";
import {
  isWorkspaceViewMode,
  useWorkspaceViewModeStore,
  WORKSPACE_VIEW_MODES,
  type WorkspaceViewMode,
} from "@/store/workspaceViewMode.store";
import { useWorkspaceZoomStore } from "@/store/workspaceZoom.store";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";

import {
  useLabelWorkspaceDirty,
  WORKSPACE_DIRTY_CONFIRM_MESSAGE,
} from "../hooks/useLabelWorkspaceDirty";
import { useWorkspaceIssueLabelIds } from "../hooks/useWorkspaceIssueLabelIds";
import { useWorkspaceLabelSearchParams } from "../hooks/useWorkspaceLabelSearchParams";
import {
  useBatchUpdateLabelsMutation,
  useBulkCreateLabels,
  useCreateValidResult,
  useLabelContext,
  useLabelSearch,
  useUpdateLabelContext,
  useUpdateValidResult,
  useUploadFileLabelMutation,
  useValidResultSearch,
} from "../queries";
import { useLabelingMutations } from "../providers/LabelingMutationProvider";
import { useImageTypeLabelingToolSelectionStore } from "../store/imageTypeLabelingToolSelection.store";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useLabelInsertPayloadStore } from "../store/labelInsertPayload.store";
import { useNumberLabelingToolSelectionStore } from "../store/numberLabelingToolSelection.store";
import {
  NUMBER_CHART_TYPES,
  type NumberChartType,
  useNumberLabelUiStore,
} from "../store/numberLabelUi.store";
import { useNumberSegmentSelectionStore } from "../store/numberSegmentSelection.store";
import { useNumberValidationRangeSelectionStore } from "../store/numberValidationRangeSelection.store";
import { useSelectedLabelObjectsStore } from "../store/selectedLabelObjects.store";
import { useTextSegmentSelectionStore } from "../store/textSegmentSelection.store";
import { useTextTypeLabelingToolSelectionStore } from "../store/textTypeLabelingToolSelection.store";
import { useWorkspaceFileLabelStore } from "../store/workspaceFileLabel.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceValidationModeStore } from "../store/workspaceValidationMode.store";
import type {
  LabelInsertData,
  ValidResultCreateRequest,
  ValidResultSearchRequest,
} from "../types/domain";
import { toHex } from "../utils/imageLabelingColors";
import { emitLabelEvent } from "../utils/imageLabelingTools";
import type { ZoomPayload } from "../utils/imageLabelingTypes";
import { resolveApiErrorMessage } from "../utils/resolveApiErrorMessage";
import { resolveWorkspaceViewModeFromContentType } from "../utils/workspaceViewMode";

const DEFAULT_NUMBER_SEGMENT_COLOR = "rgba(250, 204, 21, 0.35)";
const DEFAULT_NUMBER_SEGMENT_OPACITY = 0.28;
const MSG_SAVE_LABELS_FAILED = "Failed to save labels.";
const MSG_SAVE_RECORD_LABELS_FAILED = "Failed to save record labels.";
const MSG_SAVE_VALIDATION_RESULT_FAILED = "Failed to save validation result.";
const MSG_SAVE_FILE_LABEL_FAILED = "Failed to upload file label.";

const isNumberChartType = (
  value: string | undefined
): value is NumberChartType =>
  value === NUMBER_CHART_TYPES.LINE || value === NUMBER_CHART_TYPES.BAR;

function WorkspaceControl() {
  const [isSaveOptionOpen, setIsSaveOptionOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1 === 100%
  const [zoomInput, setZoomInput] = useState("100");
  const [isSavingValidationBatch, setIsSavingValidationBatch] = useState(false);
  const setZoomStoreLevel = useWorkspaceZoomStore((state) => state.setLevel);
  const zoomStoreLevel = useWorkspaceZoomStore((state) => state.level);
  const { onMutationSuccess } = useLabelingMutations();
  const { filter } = useFilterBySearchParams();
  const datasetIdFilter = filter.datasetId as SearchOperatorValue<string>;
  const datasetVersionFilter =
    filter.datasetVersion as SearchOperatorValue<DatasetContentVersion>;
  const policyIdsFilter = filter.policyIds as SearchOperatorValue<string[]>;
  const { request: labelSearchRequest } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(labelSearchRequest);
  const updateLabelContext = useUpdateLabelContext();
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const contentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );
  const chartAxisSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.chartAxisSnapshot
  );
  const schemaName = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.schemaName
  );
  const toggleChartPivotMode = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.toggleChartPivotMode
  );
  const workspaceViewMode = useWorkspaceViewModeStore((state) => state.mode);
  const setWorkspaceViewMode = useWorkspaceViewModeStore(
    (state) => state.setMode
  );
  const isFileViewMode = workspaceViewMode === "File";
  const numberChartType = useNumberLabelUiStore((state) => state.chartType);
  const setNumberChartType = useNumberLabelUiStore(
    (state) => state.setChartType
  );
  const resetWorkspaceChanges = useLabelBatchStore(
    (state) => state.resetWorkspaceChanges
  );
  const { confirmIfDirty, dirty } = useLabelWorkspaceDirty();
  const isIssuePanelOpen = useWorkspaceIssuePanelStore((state) => state.isOpen);
  const toggleIssuePanel = useWorkspaceIssuePanelStore((state) => state.toggle);
  const { hasIssues } = useWorkspaceIssueLabelIds();
  const isIssueButtonDisabled = !hasIssues;
  const issueButtonStyle =
    isIssuePanelOpen && hasIssues ? "accent" : "accent-outline";

  const isRecordLabelingMode = (
    filter.tableSelectedItems as SearchOperatorValue<string[]>
  )?.value?.[0]?.includes("row");

  const datasetIdValue = datasetIdFilter?.value?.trim() ?? "";
  const datasetVersionValue = datasetVersionFilter?.value ?? null;
  const normalizedPolicyIds = useMemo(() => {
    const values = policyIdsFilter?.value ?? [];
    return Array.from(
      new Set(
        values
          .map((id) => (typeof id === "string" ? id.trim() : ""))
          .filter((id): id is string => id.length > 0)
      )
    );
  }, [policyIdsFilter?.value]);
  const shouldFetchLabelContext =
    datasetIdValue.length > 0 && datasetVersionValue !== null;
  const labelContextQuery = useLabelContext(
    shouldFetchLabelContext
      ? {
          datasetId: datasetIdValue,
          datasetVersion: datasetVersionValue as DatasetContentVersion,
        }
      : undefined
  );
  const fetchedLabelContextId = labelContextQuery.data?.id ?? null;
  const refetchLabelContext = labelContextQuery.refetch;
  const labelContextId = useLabelBatchStore((state) => state.labelContextId);
  const setLabelContextId = useLabelBatchStore(
    (state) => state.setLabelContextId
  );
  const bumpLabelDataRevision = useLabelBatchStore(
    (state) => state.bumpLabelDataRevision
  );
  const inserts = useLabelBatchStore((state) => state.inserts);
  const updates = useLabelBatchStore((state) => state.updates);
  const deletes = useLabelBatchStore((state) => state.deletes);
  const { mutate: runBatchUpdate, isPending: isBatchUpdating } =
    useBatchUpdateLabelsMutation();
  const { mutate: runBulkCreateLabels, isPending: isBulkCreating } =
    useBulkCreateLabels();
  const { mutateAsync: uploadFileLabel, isPending: isUploadingFileLabel } =
    useUploadFileLabelMutation();
  const clearTemporaryClassificationLabels = useLabelBatchStore(
    (state) => state.clearTemporaryClassificationLabels
  );
  const clearTemporaryRecognitionLabels = useLabelBatchStore(
    (state) => state.clearTemporaryRecognitionLabels
  );
  const commitPendingClassificationDeletes = useLabelBatchStore(
    (state) => state.commitPendingClassificationDeletes
  );
  const commitPendingRecognitionDeletes = useLabelBatchStore(
    (state) => state.commitPendingRecognitionDeletes
  );
  const clearPendingChanges = useLabelBatchStore(
    (state) => state.clearPendingChanges
  );
  const labelInsertPayload = useLabelInsertPayloadStore(
    (state) => state.payload
  );
  const fileDrafts = useWorkspaceFileLabelStore((state) => state.drafts);
  const clearFileDrafts = useWorkspaceFileLabelStore(
    (state) => state.clearDrafts
  );
  const setFileUploading = useWorkspaceFileLabelStore(
    (state) => state.setUploading
  );
  const isFileUploading = useWorkspaceFileLabelStore(
    (state) => state.isUploading
  );
  const contentSetLabelSearchRequest = useMemo(
    () =>
      workspaceViewMode !== "Record" &&
      labelContextId &&
      contentSetId &&
      contentSetId.length > 0
        ? {
            labelContextId: { operator: "EQ", value: labelContextId },
            contentSetId: { operator: "EQ", value: contentSetId },
          }
        : undefined,
    [contentSetId, labelContextId, workspaceViewMode]
  );
  const batchPayload = useMemo(
    () => ({
      inserts,
      updates,
      deletes,
    }),
    [inserts, updates, deletes]
  );
  const hasPendingChanges =
    batchPayload.inserts.length > 0 ||
    batchPayload.updates.length > 0 ||
    batchPayload.deletes.length > 0;
  const activeFileDraft = fileDrafts[0] ?? null;
  const canSaveFileDraft = Boolean(
    isFileViewMode &&
      activeFileDraft &&
      activeFileDraft.label?.policyId &&
      (activeFileDraft.label.contentSetId ?? contentSetId)
  );

  const resolvedViewModeFromContentType = useMemo<WorkspaceViewMode | null>(
    () => resolveWorkspaceViewModeFromContentType(contentType),
    [contentType]
  );
  const shouldUseFileMode = useMemo(
    () =>
      resolvedViewModeFromContentType !== null &&
      resolvedViewModeFromContentType !== "Image" &&
      resolvedViewModeFromContentType !== "Text" &&
      resolvedViewModeFromContentType !== "Number",
    [resolvedViewModeFromContentType]
  );

  useEffect(() => {
    if (isRecordLabelingMode) {
      if (workspaceViewMode !== "Record") {
        setWorkspaceViewMode("Record");
      }
      return;
    }
    if (shouldUseFileMode) {
      if (workspaceViewMode !== "File") {
        setWorkspaceViewMode("File");
      }
      return;
    }

    if (workspaceViewMode === "Record") {
      setWorkspaceViewMode(resolvedViewModeFromContentType ?? "Image");
      return;
    }

    if (
      workspaceViewMode === "File" &&
      resolvedViewModeFromContentType &&
      resolvedViewModeFromContentType !== workspaceViewMode
    ) {
      setWorkspaceViewMode(resolvedViewModeFromContentType);
    }
  }, [
    isRecordLabelingMode,
    resolvedViewModeFromContentType,
    shouldUseFileMode,
    setWorkspaceViewMode,
    workspaceViewMode,
  ]);
  useEffect(() => {
    if (!shouldFetchLabelContext) {
      setLabelContextId(null);
      return;
    }
    if (fetchedLabelContextId) {
      setLabelContextId(fetchedLabelContextId);
    }
  }, [fetchedLabelContextId, setLabelContextId, shouldFetchLabelContext]);

  const toggleSaveDropdown = () => {
    setIsSaveOptionOpen((prev) => !prev);
  };

  const updateZoomState = useCallback(
    (nextLevel: number) => {
      const safeLevel = Number.isFinite(nextLevel) ? nextLevel : 1;
      const clampedLevel = Math.max(0.1, Number(safeLevel.toFixed(2)));
      setZoomLevel(clampedLevel);
      setZoomInput(`${Math.round(clampedLevel * 100)}`);
      setZoomStoreLevel(clampedLevel);
    },
    [setZoomLevel, setZoomInput, setZoomStoreLevel]
  );

  const applyZoom = useCallback(
    (direction: ZoomPayload["direction"], level?: number) => {
      const current = Number.isFinite(zoomStoreLevel) ? zoomStoreLevel : 1;
      const roundToTenth = (value: number) => Math.round(value * 10) / 10;
      const floorToTenth = (value: number) =>
        Math.floor(value * 10 + 1e-6) / 10;
      const rawNext = (() => {
        if (direction === 0 && typeof level === "number") {
          return level;
        }
        if (direction === 1) {
          return roundToTenth(current + 0.1);
        }
        if (direction === -1) {
          const mv = current * 10;
          const aligned = Math.abs(mv - Math.round(mv)) < 1e-6;
          return aligned ? roundToTenth(current - 0.1) : floorToTenth(current);
        }
        return current;
      })();
      const next = Math.max(
        0.1,
        Number((Number.isFinite(rawNext) ? rawNext : current).toFixed(2))
      );

      updateZoomState(next);
      emitLabelEvent("zoom", {
        direction: 0,
        level: next,
        onChange: ({ level: nextLevel }) => updateZoomState(nextLevel),
      } satisfies ZoomPayload);
    },
    [updateZoomState, zoomStoreLevel]
  );

  const [navAvailability, setNavAvailability] = useState<{
    canLeft: boolean;
    canRight: boolean;
  }>({ canLeft: false, canRight: false });

  const triggerArrowNavigation = useCallback(
    (key: "ArrowLeft" | "ArrowRight") => {
      window.dispatchEvent(
        new CustomEvent("workspace-nav-arrow", {
          detail: { direction: key === "ArrowRight" ? "right" : "left" },
        })
      );
    },
    []
  );

  useEffect(() => {
    const handleAvailability = (
      event: CustomEvent<{ canLeft: boolean; canRight: boolean }>
    ) => {
      const { canLeft, canRight } = event.detail ?? {};
      setNavAvailability({
        canLeft: Boolean(canLeft),
        canRight: Boolean(canRight),
      });
    };
    window.addEventListener(
      "workspace-nav-availability",
      handleAvailability as EventListener
    );
    return () => {
      window.removeEventListener(
        "workspace-nav-availability",
        handleAvailability as EventListener
      );
    };
  }, []);

  const handleZoomInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const sanitized = event.target.value.replace(/%/g, "");
    setZoomInput(sanitized);
  };

  const commitZoomInput = () => {
    const numeric = parseFloat(zoomInput);
    if (!Number.isFinite(numeric)) {
      setZoomInput(`${Math.round(zoomLevel * 100)}`);
      return;
    }
    applyZoom(0, numeric / 100);
  };

  const workspaceTabs = useMemo(
    () =>
      WORKSPACE_VIEW_MODES.filter((mode) => mode !== "File").map((mode) => ({
        name: mode,
      })),
    []
  );

  useEffect(() => {
    setZoomLevel(zoomStoreLevel);
    setZoomInput(`${Math.round(zoomStoreLevel * 100)}`);
  }, [zoomStoreLevel]);

  useEffect(() => {
    const handleZoomShortcut = (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      const zoomKeys = new Set(["=", "+", "-", "_", "0"]);
      if (!isModifier || !zoomKeys.has(event.key)) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["input", "textarea", "select"].includes(
            target.tagName.toLowerCase()
          ))
      ) {
        return;
      }
      event.preventDefault();
      if (event.key === "-" || event.key === "_") {
        applyZoom(-1);
        return;
      }
      if (event.key === "=" || event.key === "+") {
        applyZoom(1);
        return;
      }
      if (event.key === "0") {
        applyZoom(0, 1);
      }
    };
    window.addEventListener("keydown", handleZoomShortcut);
    return () => {
      window.removeEventListener("keydown", handleZoomShortcut);
    };
  }, [applyZoom]);

  const activeTool = useImageTypeLabelingToolSelectionStore(
    (state) => state.tool
  );
  const selectedLabelObjects = useSelectedLabelObjectsStore(
    (state) => state.objects
  );
  const textTool = useTextTypeLabelingToolSelectionStore((state) => state.tool);
  const selectedTextSegment = useTextSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const numberTool = useNumberLabelingToolSelectionStore((state) => state.tool);
  const selectedNumberSegment = useNumberSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const validationRangeSelection = useNumberValidationRangeSelectionStore(
    (state) => state.selection
  );

  const toolDisplayName = useMemo(() => {
    if (!activeTool?.id) {
      return "-";
    }
    const TOOL_LABELS: Record<string, string> = {
      selection: "Selection",
      "bounded-box": "Bounding Box",
      "filled-box": "Filled Box",
      pen: "Pen",
      brush: "Brush",
      "magic-wand": "Magic Brush",
      superpixel: "Superpixel",
      eraser: "Eraser",
      "seg-anything": "Segment Anything",
    };
    return TOOL_LABELS[activeTool.id] ?? activeTool.id;
  }, [activeTool?.id]);

  const textToolDisplayName = useMemo(() => {
    if (!textTool?.id) {
      return "-";
    }
    const TOOL_LABELS: Record<string, string> = {
      selection: "Selection",
      "drag-segment": "Highlighting",
    };
    return TOOL_LABELS[textTool.id] ?? textTool.name ?? textTool.id;
  }, [textTool?.id, textTool?.name]);

  const numberToolDisplayName = useMemo(() => {
    if (!numberTool?.id) {
      return "-";
    }
    const TOOL_LABELS: Record<string, string> = {
      selection: "Selection",
      "drag-segment": "Highlighting",
    };
    return TOOL_LABELS[numberTool.id] ?? numberTool.name ?? numberTool.id;
  }, [numberTool?.id, numberTool?.name]);

  const selectedTextSegmentInfo = useMemo(() => {
    if (!selectedTextSegment) {
      return null;
    }
    const count = Math.max(
      0,
      selectedTextSegment.end - selectedTextSegment.start
    );
    const baseColor =
      typeof selectedTextSegment.color === "string" &&
      selectedTextSegment.color.length > 0
        ? selectedTextSegment.color
        : null;
    const hexDisplay = baseColor ? toHex(baseColor).hex.toUpperCase() : "-";
    const opacityValue =
      typeof selectedTextSegment.opacity === "number" &&
      Number.isFinite(selectedTextSegment.opacity)
        ? selectedTextSegment.opacity
        : null;
    const normalizedOpacity =
      opacityValue !== null
        ? opacityValue > 1
          ? opacityValue > 100
            ? 1
            : opacityValue / 100
          : opacityValue
        : null;
    const opacityDisplay =
      normalizedOpacity !== null
        ? `${Math.round(Math.max(0, Math.min(normalizedOpacity, 1)) * 100)}%`
        : baseColor
          ? toHex(baseColor).alpha
          : "-";
    return {
      count,
      colorPreview: baseColor ?? "transparent",
      hexDisplay,
      opacityDisplay,
      hasColor: Boolean(baseColor),
    };
  }, [selectedTextSegment]);

  const selectedNumberSegmentInfo = useMemo(() => {
    if (!selectedNumberSegment) {
      return null;
    }
    const count = Math.max(
      0,
      selectedNumberSegment.end - selectedNumberSegment.start
    );
    const rangeEnd = Math.max(
      selectedNumberSegment.start,
      selectedNumberSegment.end - 1
    );
    const baseColor =
      typeof selectedNumberSegment.color === "string" &&
      selectedNumberSegment.color.length > 0
        ? selectedNumberSegment.color
        : DEFAULT_NUMBER_SEGMENT_COLOR;
    const hexDisplay = baseColor ? toHex(baseColor).hex.toUpperCase() : "-";
    const opacityValue =
      typeof selectedNumberSegment.opacity === "number" &&
      Number.isFinite(selectedNumberSegment.opacity)
        ? selectedNumberSegment.opacity
        : DEFAULT_NUMBER_SEGMENT_OPACITY;
    const normalizedOpacity =
      opacityValue > 1
        ? opacityValue > 100
          ? 1
          : opacityValue / 100
        : opacityValue;
    const opacityDisplay = `${Math.round(
      Math.max(0, Math.min(normalizedOpacity, 1)) * 100
    )}%`;
    return {
      count,
      range: `${selectedNumberSegment.start + 1}-${rangeEnd + 2}`,
      colorPreview: baseColor ?? "transparent",
      hexDisplay,
      opacityDisplay,
      hasColor: Boolean(baseColor),
    };
  }, [selectedNumberSegment]);

  const focusedObjectInfo = useMemo(() => {
    if (activeTool?.id !== "selection") {
      return null;
    }
    const object = selectedLabelObjects[0];
    if (!object) {
      return null;
    }
    const x = Math.round(object.left ?? 0);
    const y = Math.round(object.top ?? 0);
    const width = Math.round((object.width ?? 0) * (object.scaleX ?? 1));
    const height = Math.round((object.height ?? 0) * (object.scaleY ?? 1));
    const baseColor =
      (typeof object.fill === "string" && object.fill) ||
      (typeof object.stroke === "string" && object.stroke) ||
      undefined;
    const { hex } = baseColor ? toHex(baseColor) : { hex: object.hex ?? "" };
    const hexDisplay = (object.hex ?? hex ?? "").toUpperCase();
    const opacityPercent = object.alpha
      ? object.alpha
      : `${Math.round((object.opacity ?? 1) * 100)}%`;
    return {
      x,
      y,
      width,
      height,
      colorPreview: baseColor ?? "transparent",
      hexDisplay: hexDisplay || "-",
      opacityDisplay: opacityPercent,
    };
  }, [activeTool?.id, selectedLabelObjects]);
  const buildRecordLabelKey = useCallback(
    (label: LabelInsertData & { id?: string }) => {
      const payload = {
        policyId: label.policyId ?? null,
        inferenceType: label.inferenceType ?? null,
        labelType: label.labelType ?? null,
        labelValue: label.labelValue ?? null,
        attributeValues: label.attributeValues ?? null,
        schemaName: label.schemaName ?? null,
        isLabeled: label.isLabeled ?? null,
      };
      try {
        return JSON.stringify(payload);
      } catch {
        return `${label.policyId ?? ""}::${label.inferenceType ?? ""}::${label.labelType ?? ""}`;
      }
    },
    []
  );

  const elementLabelCandidates = useMemo(() => {
    if (!elementId) {
      return [];
    }
    const serverLabels = labelSearchQuery.data?.list ?? [];
    const deleteIdSet = new Set(
      batchPayload.deletes.map((item) => item.id).filter(Boolean)
    );
    const updateMap = new Map(
      batchPayload.updates.map((item) => [item.id, item])
    );
    const merged: Array<LabelInsertData & { id?: string }> = [];
    serverLabels.forEach((label) => {
      if (!label.id || deleteIdSet.has(label.id)) {
        return;
      }
      const update = updateMap.get(label.id);
      if (update) {
        merged.push({
          ...label,
          ...update,
          id: label.id,
        });
        return;
      }
      merged.push(label);
    });
    batchPayload.inserts.forEach((insert) => {
      if (insert.elementId !== elementId) {
        return;
      }
      merged.push(insert);
    });
    return merged;
  }, [
    batchPayload.deletes,
    batchPayload.inserts,
    batchPayload.updates,
    elementId,
    labelSearchQuery.data?.list,
  ]);

  const pendingRecordLabels = useMemo<LabelInsertData[]>(() => {
    if (!contentSetId) {
      return [];
    }
    const seen = new Set<string>();
    const labels: LabelInsertData[] = [];

    elementLabelCandidates.forEach((label) => {
      const policyId = label.policyId?.trim();
      if (!policyId) {
        return;
      }
      const key = buildRecordLabelKey(label);
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      labels.push({
        contentSetId,
        policyId,
        inferenceType: label.inferenceType ?? undefined,
        unitType: "CONTENTSET",
        labelType: label.labelType ?? undefined,
        labelValue: label.labelValue ?? undefined,
        attributeValues: label.attributeValues ?? [],
        isLabeled: label.isLabeled ?? undefined,
      });
    });

    return labels;
  }, [buildRecordLabelKey, contentSetId, elementLabelCandidates]);
  const numberSelectionCount = useMemo(() => {
    if (workspaceViewMode !== "Number") {
      return 1;
    }
    const rows = chartAxisSnapshot.source.rows ?? [];
    const columns = chartAxisSnapshot.source.columns ?? [];
    if (!rows.length || !columns.length) {
      return 0;
    }
    return rows.length * columns.length;
  }, [
    chartAxisSnapshot.source.columns,
    chartAxisSnapshot.source.rows,
    workspaceViewMode,
  ]);
  const isSingleNumberSelection =
    workspaceViewMode !== "Number" || numberSelectionCount === 1;
  const canSaveToRecord =
    elementLabelCandidates.length > 0 && isSingleNumberSelection;
  const isSavingFileLabel =
    isFileViewMode && (isFileUploading || isUploadingFileLabel);
  const canSaveLabels = isFileViewMode
    ? canSaveFileDraft || hasPendingChanges
    : hasPendingChanges;
  const isSavingLabels = isFileViewMode
    ? isSavingFileLabel || isBatchUpdating
    : isBatchUpdating;
  const isWorkspaceLocked = isFileViewMode
    ? isSavingFileLabel || isBatchUpdating
    : isSavingFileLabel;

  const handleSaveLabels = useCallback(async () => {
    if (isFileViewMode) {
      if (!activeFileDraft && !hasPendingChanges) {
        // eslint-disable-next-line no-console -- 저장 조건 안내용 임시 로그
        console.warn("저장할 파일 라벨이 없습니다.");
        return;
      }

      const resolvedLabelContextId = labelContextId ?? fetchedLabelContextId;
      const labelContextRequest =
        resolvedLabelContextId ||
        !datasetIdValue ||
        datasetVersionValue === null
          ? undefined
          : {
              datasetId: datasetIdValue,
              datasetVersion: datasetVersionValue,
              policyIds: normalizedPolicyIds,
            };
      const labelContextUpdateRequest = resolvedLabelContextId
        ? { policyIds: normalizedPolicyIds }
        : undefined;

      if (!resolvedLabelContextId && !labelContextRequest) {
        // eslint-disable-next-line no-console -- 라벨 컨텍스트 진단용 임시 로그
        console.error("Label context 정보를 찾을 수 없습니다.");
        return;
      }

      let nextLabelContextId = resolvedLabelContextId ?? null;

      if (activeFileDraft) {
        const draftLabel = activeFileDraft.label;
        if (!draftLabel?.policyId) {
          // eslint-disable-next-line no-console -- 저장 조건 안내용 임시 로그
          console.warn("폴리시가 선택되지 않았습니다.");
          return;
        }
        if (!contentSetId) {
          // eslint-disable-next-line no-console -- 저장 조건 안내용 임시 로그
          console.warn("콘텐트셋 정보를 찾을 수 없습니다.");
          return;
        }

        setFileUploading(true);
        try {
          if (resolvedLabelContextId && labelContextUpdateRequest) {
            await updateLabelContext.mutateAsync({
              labelContextId: resolvedLabelContextId,
              body: labelContextUpdateRequest,
            });
          }
          const uploaded = await uploadFileLabel({
            labelContextId: resolvedLabelContextId,
            labelContextRequest,
            body: {
              file: activeFileDraft.file,
              contentSetId: draftLabel.contentSetId ?? contentSetId,
              elementId: draftLabel.elementId ?? elementId ?? undefined,
              policyId: draftLabel.policyId,
              schemaName: draftLabel.schemaName ?? schemaName ?? undefined,
            },
          });
          if (uploaded?.labelContextId) {
            nextLabelContextId = uploaded.labelContextId;
            setLabelContextId(uploaded.labelContextId);
          }
          if (!resolvedLabelContextId) {
            refetchLabelContext();
          }
          onMutationSuccess({ type: "file-uploaded", labelContextId: nextLabelContextId ?? resolvedLabelContextId ?? null });
          bumpLabelDataRevision();
          clearFileDrafts();
        } catch (error) {
          window.alert(resolveApiErrorMessage(error, MSG_SAVE_FILE_LABEL_FAILED));
          return;
        } finally {
          setFileUploading(false);
        }
      }

      if (!hasPendingChanges) {
        return;
      }

      runBatchUpdate(
        {
          labelContextId: nextLabelContextId ?? resolvedLabelContextId,
          labelContextRequest:
            nextLabelContextId || resolvedLabelContextId
              ? undefined
              : labelContextRequest,
          labelContextUpdateRequest,
          body: batchPayload,
        },
        {
          onSuccess: () => {
            if (!resolvedLabelContextId && !nextLabelContextId) {
              refetchLabelContext();
            }
            onMutationSuccess({ type: "labels-saved", labelContextId: nextLabelContextId ?? resolvedLabelContextId ?? null });
            bumpLabelDataRevision();
            clearPendingChanges();
            clearTemporaryClassificationLabels();
            clearTemporaryRecognitionLabels();
            commitPendingClassificationDeletes();
            commitPendingRecognitionDeletes();
          },
          onError: (error) => {
            window.alert(resolveApiErrorMessage(error, MSG_SAVE_LABELS_FAILED));
          },
        }
      );
      return;
    }

    if (!hasPendingChanges) {
      // eslint-disable-next-line no-console -- 저장 조건 안내용 임시 로그
      console.warn("저장할 변경사항이 없습니다.");
      return;
    }

    const resolvedLabelContextId = labelContextId ?? fetchedLabelContextId;
    const labelContextRequest =
      resolvedLabelContextId || !datasetIdValue || datasetVersionValue === null
        ? undefined
        : {
            datasetId: datasetIdValue,
            datasetVersion: datasetVersionValue,
            policyIds: normalizedPolicyIds,
          };
    const labelContextUpdateRequest = resolvedLabelContextId
      ? { policyIds: normalizedPolicyIds }
      : undefined;

    if (!resolvedLabelContextId && !labelContextRequest) {
      // eslint-disable-next-line no-console -- 라벨 컨텍스트 진단용 임시 로그
      console.error("Label context 정보를 찾을 수 없습니다.");
      return;
    }

    runBatchUpdate(
      {
        labelContextId: resolvedLabelContextId,
        labelContextRequest,
        labelContextUpdateRequest,
        body: batchPayload,
      },
      {
        onSuccess: () => {
          if (!resolvedLabelContextId) {
            refetchLabelContext();
          }
          onMutationSuccess({ type: "labels-saved", labelContextId: resolvedLabelContextId ?? null });
          bumpLabelDataRevision();
          clearPendingChanges();
          clearTemporaryClassificationLabels();
          clearTemporaryRecognitionLabels();
          commitPendingClassificationDeletes();
          commitPendingRecognitionDeletes();
        },
        onError: (error) => {
          window.alert(resolveApiErrorMessage(error, MSG_SAVE_LABELS_FAILED));
        },
      }
    );
  }, [
    activeFileDraft,
    batchPayload,
    bumpLabelDataRevision,
    clearFileDrafts,
    clearPendingChanges,
    clearTemporaryClassificationLabels,
    clearTemporaryRecognitionLabels,
    commitPendingClassificationDeletes,
    commitPendingRecognitionDeletes,
    contentSetId,
    datasetIdValue,
    datasetVersionValue,
    elementId,
    fetchedLabelContextId,
    hasPendingChanges,
    isFileViewMode,
    labelContextId,
    labelInsertPayload,
    labelSearchRequest,
    normalizedPolicyIds,
    onMutationSuccess,
    refetchLabelContext,
    runBatchUpdate,
    schemaName,
    setLabelContextId,
    setFileUploading,
    updateLabelContext,
    uploadFileLabel,
  ]);

  const handleSaveToRecord = useCallback(() => {
    const resolvedLabelContextId = labelContextId ?? fetchedLabelContextId;
    if (!resolvedLabelContextId) {
      // eslint-disable-next-line no-console -- 라벨 컨텍스트 진단용 임시 로그
      console.error("Label context 정보를 찾을 수 없습니다.");
      return;
    }
    if (!pendingRecordLabels.length) {
      // eslint-disable-next-line no-console -- 저장 조건 안내용 임시 로그
      console.warn("저장할 레코드 라벨이 없습니다.");
      return;
    }

    runBulkCreateLabels(
      {
        labelContextId: resolvedLabelContextId,
        body: {
          labels: pendingRecordLabels,
        },
      },
      {
        onSuccess: () => {
          onMutationSuccess({ type: "labels-bulk-created", labelContextId: resolvedLabelContextId });
          bumpLabelDataRevision();
          setIsSaveOptionOpen(false);
        },
        onError: (error) => {
          window.alert(
            resolveApiErrorMessage(error, MSG_SAVE_RECORD_LABELS_FAILED)
          );
        },
      }
    );
  }, [
    bumpLabelDataRevision,
    contentSetLabelSearchRequest,
    fetchedLabelContextId,
    labelContextId,
    pendingRecordLabels,
    onMutationSuccess,
    runBulkCreateLabels,
  ]);

  const handleViewModeChange = useCallback(
    (mode: WorkspaceViewMode) => {
      if (mode === workspaceViewMode) {
        return;
      }
      if (!confirmIfDirty(WORKSPACE_DIRTY_CONFIRM_MESSAGE)) {
        return;
      }
      if (dirty.isDirty) {
        resetWorkspaceChanges();
      }
      setWorkspaceViewMode(mode);
    },
    [
      confirmIfDirty,
      dirty.isDirty,
      resetWorkspaceChanges,
      setWorkspaceViewMode,
      workspaceViewMode,
    ]
  );

  const isValidationMode = useWorkspaceValidationModeStore(
    (state) => state.isValidationMode
  );
  const toggleValidationMode = useWorkspaceValidationModeStore(
    (state) => state.toggleValidationMode
  );
  const handleValidationToggle = useCallback(() => {
    if (!confirmIfDirty(WORKSPACE_DIRTY_CONFIRM_MESSAGE)) {
      return;
    }
    if (dirty.isDirty) {
      resetWorkspaceChanges();
    }
    toggleValidationMode();
  }, [
    confirmIfDirty,
    dirty.isDirty,
    resetWorkspaceChanges,
    toggleValidationMode,
  ]);

  const validationRangeElementIds = useMemo(
    () => validationRangeSelection?.elementIds ?? [],
    [validationRangeSelection]
  );
  const hasValidationRangeSelection = useMemo(
    () =>
      isValidationMode &&
      workspaceViewMode === "Number" &&
      validationRangeElementIds.length > 0,
    [isValidationMode, validationRangeElementIds.length, workspaceViewMode]
  );

  const validationTargetType = useMemo<"CONTENTSET" | "ELEMENT">(
    () => (workspaceViewMode === "Record" ? "CONTENTSET" : "ELEMENT"),
    [workspaceViewMode]
  );
  const validResultSearchRequest = useMemo<
    ValidResultSearchRequest | undefined
  >(() => {
    if (!isValidationMode) {
      return undefined;
    }
    if (!labelContextId || !contentSetId) {
      return undefined;
    }
    const request: ValidResultSearchRequest = {
      labelContextId: { operator: "EQ", value: labelContextId },
      contentSetId: { operator: "EQ", value: contentSetId },
      validType: { operator: "EQ", value: validationTargetType },
    };
    if (validationTargetType === "ELEMENT" && !hasValidationRangeSelection) {
      if (!elementId) {
        return undefined;
      }
      request.elementId = { operator: "EQ", value: elementId };
    }
    return request;
  }, [
    contentSetId,
    elementId,
    isValidationMode,
    labelContextId,
    hasValidationRangeSelection,
    validationTargetType,
  ]);
  const validResultQuery = useValidResultSearch(validResultSearchRequest);
  const validResults = validResultQuery.data?.list ?? [];
  const matchingValidationResults = useMemo(() => {
    if (!validResults.length || !contentSetId) {
      return [];
    }
    if (validationTargetType === "ELEMENT") {
      if (hasValidationRangeSelection) {
        const elementIdSet = new Set(validationRangeElementIds);
        return validResults.filter((result) => {
          if (result.validType !== "ELEMENT") {
            return false;
          }
          if (result.contentSetId !== contentSetId) {
            return false;
          }
          if (!result.elementId) {
            return false;
          }
          return elementIdSet.has(result.elementId);
        });
      }
      return validResults.filter((result) => {
        if (result.validType !== "ELEMENT") {
          return false;
        }
        if (result.contentSetId !== contentSetId) {
          return false;
        }
        return result.elementId === elementId;
      });
    }
    return validResults.filter((result) => {
      if (result.validType !== validationTargetType) {
        return false;
      }
      if (result.contentSetId !== contentSetId) {
        return false;
      }
      return true;
    });
  }, [
    contentSetId,
    elementId,
    hasValidationRangeSelection,
    validResults,
    validationRangeElementIds,
    validationTargetType,
  ]);
  const existingValidationResult = useMemo(() => {
    if (hasValidationRangeSelection) {
      return null;
    }
    return matchingValidationResults[0] ?? null;
  }, [hasValidationRangeSelection, matchingValidationResults]);
  const validationResultByElementId = useMemo(() => {
    if (!hasValidationRangeSelection) {
      return new Map<string, typeof validResults[number]>();
    }
    const map = new Map<string, typeof validResults[number]>();
    matchingValidationResults.forEach((result) => {
      if (result.elementId) {
        map.set(result.elementId, result);
      }
    });
    return map;
  }, [hasValidationRangeSelection, matchingValidationResults, validResults]);
  const isPassedActive = matchingValidationResults.some(
    (result) => result.result === true
  );
  const isFailedActive = matchingValidationResults.some(
    (result) => result.result === false
  );
  const { mutateAsync: createValidResult, isPending: isCreatingValidResult } =
    useCreateValidResult();
  const { mutateAsync: updateValidResult, isPending: isUpdatingValidResult } =
    useUpdateValidResult();
  const canSaveValidationResult = Boolean(
    labelContextId &&
      datasetIdValue.length > 0 &&
      datasetVersionValue != null &&
      contentSetId &&
      (validationTargetType === "CONTENTSET" ||
        elementId ||
        hasValidationRangeSelection)
  );
  const isSavingValidationResult =
    isCreatingValidResult || isUpdatingValidResult || isSavingValidationBatch;
  const handleSaveValidationResult = useCallback(
    async (nextResult: boolean) => {
      if (!canSaveValidationResult) {
        return;
      }
      if (!labelContextId || !contentSetId) {
        return;
      }
      if (!datasetIdValue || datasetVersionValue == null) {
        return;
      }
      const resolvedDatasetVersion =
        datasetVersionValue != null ? String(datasetVersionValue) : "";
      const validType = validationTargetType;
      if (validType === "ELEMENT" && hasValidationRangeSelection) {
        const elementIds = Array.from(new Set(validationRangeElementIds));
        if (!elementIds.length) {
          return;
        }
        setIsSavingValidationBatch(true);
        try {
          const requests: Array<Promise<unknown>> = [];
          elementIds.forEach((rangeElementId) => {
            const existingResult =
              validationResultByElementId.get(rangeElementId) ?? null;
            if (existingResult?.id) {
              requests.push(
                updateValidResult({
                  id: existingResult.id,
                  body: { result: nextResult, reason: "", validType },
                })
              );
              return;
            }
            const body: ValidResultCreateRequest = {
              labelContextId,
              datasetId: datasetIdValue,
              datasetVersion: resolvedDatasetVersion,
              contentSetId,
              result: nextResult,
              reason: "",
              validType,
              elementId: rangeElementId,
            };
            requests.push(createValidResult(body));
          });
          await Promise.all(requests);
          if (validResultSearchRequest) {
            void validResultQuery.refetch();
          }
        } catch (error) {
          window.alert(
            resolveApiErrorMessage(error, MSG_SAVE_VALIDATION_RESULT_FAILED)
          );
          return;
        } finally {
          setIsSavingValidationBatch(false);
        }
        return;
      }
      if (validationTargetType === "ELEMENT" && !elementId) {
        return;
      }
      const baseBody: ValidResultCreateRequest = {
        labelContextId,
        datasetId: datasetIdValue,
        datasetVersion: resolvedDatasetVersion,
        contentSetId,
        result: nextResult,
        reason: "",
        validType,
        ...(validType === "ELEMENT" && elementId ? { elementId } : {}),
      };
      try {
        if (existingValidationResult?.id) {
          await updateValidResult({
            id: existingValidationResult.id,
            body: { result: nextResult, reason: "", validType },
          });
        } else {
          await createValidResult(baseBody);
        }
        if (validResultSearchRequest) {
          void validResultQuery.refetch();
        }
      } catch (error) {
        window.alert(
          resolveApiErrorMessage(error, MSG_SAVE_VALIDATION_RESULT_FAILED)
        );
        return;
      }
    },
    [
      canSaveValidationResult,
      contentSetId,
      createValidResult,
      datasetIdValue,
      datasetVersionValue,
      elementId,
      existingValidationResult?.id,
      hasValidationRangeSelection,
      labelContextId,
      setIsSavingValidationBatch,
      updateValidResult,
      validationRangeElementIds,
      validationResultByElementId,
      validResultQuery,
      validResultSearchRequest,
      validationTargetType,
    ]
  );

  return (
    <>
      <Wrapper gapSize="0.5rem">
        {!isValidationMode && !isFileViewMode && (
          <>
            {isRecordLabelingMode ? (
              <Tabs
                titles={[{ name: "Record" }]}
                size="sm"
                isSwitch
                className="record"
              />
            ) : (
              <Tabs
                titles={workspaceTabs.filter((tab) => tab.name !== "Record")}
                size="sm"
                isSwitch
                selectedName={workspaceViewMode}
                onClick={(tab) => {
                  if (isWorkspaceViewMode(tab.name)) {
                    handleViewModeChange(tab.name);
                  }
                }}
              />
            )}
            {workspaceViewMode === "Number" && (
              <>
                <Tabs
                  titles={[
                    {
                      id: NUMBER_CHART_TYPES.LINE,
                      indicator: <Icon iconType="icon-chart-line" />,
                    },
                    {
                      id: NUMBER_CHART_TYPES.BAR,
                      indicator: <Icon iconType="icon-chart-bar" />,
                    },
                  ]}
                  size="sm"
                  isSwitch
                  selectedName={numberChartType}
                  onClick={(tab) => {
                    if (!isNumberChartType(tab.id)) {
                      return;
                    }
                    setNumberChartType(tab.id);
                  }}
                />
                <Button
                  style="gray-outline"
                  size="md"
                  onClick={() => {
                    toggleChartPivotMode();
                  }}
                >
                  <Icon iconType="icon-pivot" size="sm" />
                </Button>
              </>
            )}
          </>
        )}

        <Button
          title={isValidationMode ? "Labeling Mode" : "Validation Mode"}
          style="secondary-outline"
          onClick={handleValidationToggle}
          disabled={isWorkspaceLocked}
        >
          <Icon
            iconType={!isValidationMode ? "icon-test" : "icon-labeling"}
            size="sm"
          />
        </Button>
      </Wrapper>
      {!isValidationMode && (
        <>
          {!isRecordLabelingMode && workspaceViewMode === "Number" && (
            <div className="workspace__infomation">
              <div className="information information-tool">
                <p>{numberToolDisplayName}</p>
              </div>
              <div className="information information-content">
                {selectedNumberSegmentInfo ? (
                  <>
                    <p>
                      <em>Point Count</em>
                      {selectedNumberSegmentInfo.count}
                    </p>
                    <p>
                      <em>Index Range</em>
                      {selectedNumberSegmentInfo.range}
                    </p>
                  </>
                ) : (
                  <p>No Segment Selected</p>
                )}
              </div>
              <div className="information information-color">
                {selectedNumberSegmentInfo?.hasColor ? (
                  <>
                    <div
                      className="color-preview"
                      style={{
                        backgroundColor: selectedNumberSegmentInfo.colorPreview,
                      }}
                    ></div>
                    <p className="color-hex">
                      {selectedNumberSegmentInfo.hexDisplay}
                    </p>
                    <p className="color-opacity">
                      {selectedNumberSegmentInfo.opacityDisplay}
                    </p>
                  </>
                ) : (
                  <p>No Color Data Available</p>
                )}
              </div>
            </div>
          )}
          {!isRecordLabelingMode && workspaceViewMode === "Image" && (
            <div className="workspace__infomation">
              <div className="information information-tool">
                <p>{toolDisplayName}</p>
              </div>
              <div className="information information-content">
                {focusedObjectInfo ? (
                  <>
                    <p>
                      <em>X</em>
                      {focusedObjectInfo.x}
                    </p>
                    <p>
                      <em>Y</em>
                      {focusedObjectInfo.y}
                    </p>
                    <p>
                      <em>W</em>
                      {focusedObjectInfo.width}
                    </p>
                    <p>
                      <em>H</em>
                      {focusedObjectInfo.height}
                    </p>
                  </>
                ) : (
                  <p>No Spatial Data Available</p>
                )}
              </div>
              <div className="information information-color">
                {focusedObjectInfo ? (
                  <>
                    <div
                      className="color-preview"
                      style={{
                        backgroundColor: focusedObjectInfo.colorPreview,
                      }}
                    ></div>
                    <p className="color-hex">{focusedObjectInfo.hexDisplay}</p>
                    <p className="color-opacity">
                      {focusedObjectInfo.opacityDisplay}
                    </p>
                  </>
                ) : (
                  <p>No Color Data Available</p>
                )}
              </div>
            </div>
          )}
          {!isRecordLabelingMode && workspaceViewMode === "Text" && (
            <div className="workspace__infomation">
              <div className="information information-tool">
                <p>{textToolDisplayName}</p>
              </div>
              <div className="information information-content">
                {selectedTextSegmentInfo ? (
                  <p>
                    <em>Character Count</em>
                    {selectedTextSegmentInfo.count}
                  </p>
                ) : (
                  <p>No Segment Selected</p>
                )}
              </div>
              <div className="information information-color">
                {selectedTextSegmentInfo?.hasColor ? (
                  <>
                    <div
                      className="color-preview"
                      style={{
                        backgroundColor: selectedTextSegmentInfo.colorPreview,
                      }}
                    ></div>
                    <p className="color-hex">
                      {selectedTextSegmentInfo.hexDisplay}
                    </p>
                    <p className="color-opacity">
                      {selectedTextSegmentInfo.opacityDisplay}
                    </p>
                  </>
                ) : (
                  <p>No Color Data Available</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <div className="workspace__controls">
        <Button
          style="transparent"
          onClick={() => applyZoom(1)}
          disabled={isWorkspaceLocked}
        >
          <Icon iconType="icon-plus" size="sm" />
        </Button>
        <Input
          className="workspace__zoom-controller"
          border="underline"
          value={`${zoomInput}%`}
          onChange={handleZoomInputChange}
          onBlur={commitZoomInput}
          onPressReturn={(event) => {
            event.currentTarget.blur();
          }}
          disabled={isWorkspaceLocked}
        />
        <Button
          style="transparent"
          onClick={() => applyZoom(-1)}
          disabled={isWorkspaceLocked}
        >
          <Icon iconType="icon-minus" size="sm" />
        </Button>
        <Button
          title="Issue"
          style={issueButtonStyle}
          disabled={isIssueButtonDisabled || isWorkspaceLocked}
          onClick={() => {
            if (isIssueButtonDisabled || isWorkspaceLocked) {
              return;
            }
            toggleIssuePanel();
          }}
          aria-pressed={isIssuePanelOpen}
        >
          <Icon iconType="icon-issue" size="sm" />
        </Button>
        <Wrapper
          isRounded
          className={`button-option-wrapper ${isValidationMode ? "!border-(--color-primary)" : "!border-transparent"}`}
          isBordered
        >
          <Button
            onClick={() => triggerArrowNavigation("ArrowLeft")}
            disabled={!navAvailability.canLeft || isWorkspaceLocked}
            style={isValidationMode ? "primary-outline" : "primary"}
            className="!border-0"
          >
            <Icon iconType="icon-left" size="sm" />
          </Button>
          {!isValidationMode ? (
            <>
              <Button
                title="Save"
                onClick={handleSaveLabels}
                disabled={isSavingLabels || !canSaveLabels}
                aria-busy={isSavingLabels}
                className="!border-0"
              >
                <Icon iconType="icon-save" size="sm" />
              </Button>
              {!isRecordLabelingMode && !isFileViewMode && (
                <Button
                  isSlim
                  onClick={toggleSaveDropdown}
                  disabled={!canSaveToRecord || isBulkCreating}
                  className="!border-0"
                >
                  <Icon iconType="icon-down" size="xxs" />
                </Button>
              )}
              {isSaveOptionOpen && !isFileViewMode && (
                <Wrapper
                  className="button-option__dropdown top-9"
                  direction="vertical"
                  isRounded
                >
                  <Button
                    title="Save to Record"
                    style="primary"
                    disabled={!canSaveToRecord || isBulkCreating}
                    onClick={handleSaveToRecord}
                    aria-busy={isBulkCreating}
                    className="!border-0"
                  >
                    <Icon iconType="icon-save" size="sm" />
                  </Button>
                </Wrapper>
              )}
            </>
          ) : (
            <>
              <Button
                title="Passed"
                style={isPassedActive ? "primary" : "primary-outline"}
                className="!border-0"
                disabled={!canSaveValidationResult || isSavingValidationResult}
                aria-busy={isSavingValidationResult}
                aria-pressed={isPassedActive}
                onClick={() => {
                  void handleSaveValidationResult(true);
                }}
              >
                <Icon iconType="icon-validated" size="sm" />
              </Button>
              <Button
                title="Failed"
                style={isFailedActive ? "accent" : "accent-outline"}
                className="!border-0"
                disabled={!canSaveValidationResult || isSavingValidationResult}
                aria-busy={isSavingValidationResult}
                aria-pressed={isFailedActive}
                onClick={() => {
                  void handleSaveValidationResult(false);
                }}
              >
                <Icon iconType="icon-cancel" size="sm" />
              </Button>
            </>
          )}
          <Button
            onClick={() => triggerArrowNavigation("ArrowRight")}
            disabled={!navAvailability.canRight || isWorkspaceLocked}
            style={isValidationMode ? "primary-outline" : "primary"}
            className="!border-0"
          >
            <Icon iconType="icon-right" size="sm" />
          </Button>
        </Wrapper>
      </div>
    </>
  );
}

export default WorkspaceControl;
