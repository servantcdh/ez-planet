import { useCallback, useEffect, useMemo } from "react";

import type { IconName } from "@/components/atoms/Icon";
import type { SearchOperatorValue } from "@/features/content-group/queries";
import type { DatasetContentVersion } from "@/features/dataset/queries";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";
import type { ToolbarItemType, ToolbarMeta } from "@/types/toolbar";

import { useLabelSearch } from "../../queries";
import { useImageTypeLabelingToolSelectionStore } from "../../store/imageTypeLabelingToolSelection.store";
import { useLabelBatchStore } from "../../store/labelBatch.store";
import { useLabelSelectionStore } from "../../store/labelSelection.store";
import { useLayerModeStore } from "../../store/layerMode.store";
import { useNumberLabelingToolSelectionStore } from "../../store/numberLabelingToolSelection.store";
import { useNumberSegmentSelectionStore } from "../../store/numberSegmentSelection.store";
import { useSelectedLabelObjectsStore } from "../../store/selectedLabelObjects.store";
import { useTextSegmentSelectionStore } from "../../store/textSegmentSelection.store";
import { useTextTypeLabelingToolSelectionStore } from "../../store/textTypeLabelingToolSelection.store";
import {
  type IssueDraftLabel,
  useWorkspaceIssuePanelStore,
} from "../../store/workspaceIssuePanel.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceValidationModeStore } from "../../store/workspaceValidationMode.store";
import type { WorkspaceViewMode } from "../../store/workspaceViewMode.store";
import type {
  LabelInsertData,
  ValidResultCreateRequest,
} from "../../types/domain";
import {
  formatShortcutTitle,
  getLabelingShortcutKey,
  LABELING_SHORTCUTS,
  shouldIgnoreLabelingShortcutEvent,
} from "../../utils/labelingShortcuts";
import {
  dragSegmentTool,
  selectionTool as numberSelectionTool,
} from "../../utils/numberLabelingTools";
import { selectionTool as textSelectionTool } from "../../utils/textLabelingTools";
import { selectionTool as imageSelectionTool } from "../../utils/tools";
import { resolveWorkspaceViewModeFromContentType } from "../../utils/workspaceViewMode";
import { useWorkspaceIssueLabelIds } from "../useWorkspaceIssueLabelIds";
import { useWorkspaceLabelSearchParams } from "../useWorkspaceLabelSearchParams";
import { baseBreadcrumbItems } from "./common";
import type { LabelingUIMetaContext } from "./types";

type DraftCandidate = {
  id: string;
  labels: IssueDraftLabel[];
};

export function useValidationLabelingUIMeta(
  mode: WorkspaceViewMode,
  { goToLabelingRoot, title }: LabelingUIMetaContext
): ToolbarMeta {
  const { filter } = useFilterBySearchParams();
  const datasetIdFilter = filter.datasetId as SearchOperatorValue<string>;
  const datasetVersionFilter =
    filter.datasetVersion as SearchOperatorValue<DatasetContentVersion>;
  const datasetIdValue = datasetIdFilter?.value?.trim() ?? "";
  const datasetVersionValue = datasetVersionFilter?.value ?? null;

  const labelContextId = useLabelBatchStore((state) => state.labelContextId);
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const contentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );

  const labelSearchParams = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(labelSearchParams.request);
  const labelSearchList = labelSearchQuery.data?.list ?? [];
  const labelById = useMemo(() => {
    const map = new Map<string, (typeof labelSearchList)[number]>();
    labelSearchList.forEach((label) => {
      map.set(label.id, label);
    });
    return map;
  }, [labelSearchList]);
  const { issueLabelIdSet } = useWorkspaceIssueLabelIds();

  const selectedLabelObjects = useSelectedLabelObjectsStore(
    (state) => state.objects
  );
  const selectedTextSegment = useTextSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const selectedNumberSegment = useNumberSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const selectedClassificationId = useLabelSelectionStore(
    (state) => state.selectedClassificationId
  );
  const selectedClassificationInfo = useLabelSelectionStore(
    (state) => state.selectedClassificationInfo
  );

  const imageTool = useImageTypeLabelingToolSelectionStore(
    (state) => state.tool
  );
  const setImageTool = useImageTypeLabelingToolSelectionStore(
    (state) => state.setTool
  );
  const textTool = useTextTypeLabelingToolSelectionStore((state) => state.tool);
  const setTextTool = useTextTypeLabelingToolSelectionStore(
    (state) => state.setTool
  );
  const numberTool = useNumberLabelingToolSelectionStore((state) => state.tool);
  const setNumberTool = useNumberLabelingToolSelectionStore(
    (state) => state.setTool
  );

  const cycleLayerMode = useLayerModeStore((state) => state.cycleMode);
  const layerMode = useLayerModeStore((state) => state.mode);
  const isValidationMode = useWorkspaceValidationModeStore(
    (state) => state.isValidationMode
  );
  const layerModeIconType = useMemo<IconName>(() => {
    if (layerMode.length === 2) {
      return "icon-all-layer";
    }
    return `icon-${layerMode[0] ? "bottom" : "top"}-layer` as IconName;
  }, [layerMode]);

  const resolvedViewMode = useMemo<WorkspaceViewMode>(() => {
    if (mode !== "Record") {
      return mode;
    }
    return resolveWorkspaceViewModeFromContentType(contentType) ?? mode;
  }, [contentType, mode]);

  const selectionToolItem = useMemo<ToolbarItemType>(() => {
    if (resolvedViewMode === "Image") {
      return {
        variant: "radio",
        iconType: "icon-selection",
        id: "selection",
        name: "tool",
        title: formatShortcutTitle(
          "Selection",
          LABELING_SHORTCUTS.common.selection
        ),
        disabled: false,
        checked: imageTool?.id === "selection",
        onClick: () => setImageTool(imageSelectionTool()),
      };
    }
    if (resolvedViewMode === "Text") {
      return {
        variant: "radio",
        iconType: "icon-selection",
        id: "selection",
        name: "tool",
        title: formatShortcutTitle(
          "Selection",
          LABELING_SHORTCUTS.common.selection
        ),
        disabled: false,
        checked: textTool?.id === "selection",
        onClick: () => setTextTool(textSelectionTool()),
      };
    }
    if (resolvedViewMode === "Number") {
      return {
        variant: "radio",
        iconType: "icon-selection",
        id: "selection",
        name: "tool",
        title: formatShortcutTitle(
          "Selection",
          LABELING_SHORTCUTS.common.selection
        ),
        disabled: false,
        checked: numberTool?.id === "selection",
        onClick: () => setNumberTool(numberSelectionTool()),
      };
    }
    return {
      variant: "radio",
      iconType: "icon-selection",
      id: "selection",
      name: "tool",
      title: formatShortcutTitle(
        "Selection",
        LABELING_SHORTCUTS.common.selection
      ),
      disabled: false,
      defaultChecked: true,
    };
  }, [
    imageTool?.id,
    numberTool?.id,
    resolvedViewMode,
    setImageTool,
    setNumberTool,
    setTextTool,
    textTool?.id,
  ]);

  const rangeSelectionToolItem = useMemo<ToolbarItemType | null>(() => {
    if (resolvedViewMode !== "Number") {
      return null;
    }
    return {
      variant: "radio",
      iconType: "icon-cursor-number",
      id: "drag-segment",
      name: "tool",
      title: formatShortcutTitle(
        "Range selection",
        LABELING_SHORTCUTS.validation.rangeSelection
      ),
      disabled: false,
      checked: numberTool?.id === "drag-segment",
      onClick: () => setNumberTool(dragSegmentTool()),
    };
  }, [numberTool?.id, resolvedViewMode, setNumberTool]);

  const buildLabelFromSearch = useCallback(
    (labelId: string, fallback?: Partial<IssueDraftLabel>): IssueDraftLabel => {
      const label = labelById.get(labelId);
      return {
        labelId,
        contentSetId: label?.contentSetId ?? fallback?.contentSetId ?? null,
        elementId: label?.elementId ?? fallback?.elementId ?? null,
        policyId: label?.policyId ?? fallback?.policyId ?? null,
      };
    },
    [labelById]
  );

  const dedupeLabels = useCallback((labels: IssueDraftLabel[]) => {
    const map = new Map<string, IssueDraftLabel>();
    labels.forEach((label) => {
      if (!label.labelId) {
        return;
      }
      if (!map.has(label.labelId)) {
        map.set(label.labelId, label);
      }
    });
    return Array.from(map.values());
  }, []);

  const selectedDraftCandidate = useMemo<DraftCandidate | null>(() => {
    if (selectedLabelObjects.length === 1) {
      const object = selectedLabelObjects[0];
      const insertData = object.labelInsertData as
        | (LabelInsertData & { id?: string })
        | undefined;
      if (insertData?.id) {
        return {
          id: insertData.id,
          labels: [
            buildLabelFromSearch(insertData.id, {
              policyId: insertData.policyId ?? null,
              contentSetId: insertData.contentSetId ?? null,
              elementId: insertData.elementId ?? null,
            }),
          ],
        };
      }
      return null;
    }

    if (selectedTextSegment?.labelId) {
      return {
        id: selectedTextSegment.labelId,
        labels: [buildLabelFromSearch(selectedTextSegment.labelId)],
      };
    }

    const numberLabelIds = selectedNumberSegment?.labelIds ?? [];
    if (numberLabelIds.length > 0) {
      const labels = dedupeLabels(
        numberLabelIds.map((labelId) =>
          buildLabelFromSearch(labelId, { contentSetId: contentSetId ?? null })
        )
      );
      if (!labels.length) {
        return null;
      }
      return {
        id: selectedNumberSegment?.key ?? labels[0].labelId,
        labels,
      };
    }

    if (selectedClassificationInfo?.labelId) {
      return {
        id: selectedClassificationInfo.labelId,
        labels: [
          buildLabelFromSearch(selectedClassificationInfo.labelId, {
            policyId: selectedClassificationInfo.policyId ?? null,
            contentSetId: contentSetId ?? null,
            elementId: elementId ?? null,
          }),
        ],
      };
    }

    if (selectedClassificationId) {
      const match = labelById.get(selectedClassificationId);
      if (!match) {
        return null;
      }
      return {
        id: selectedClassificationId,
        labels: [buildLabelFromSearch(selectedClassificationId)],
      };
    }

    return null;
  }, [
    buildLabelFromSearch,
    contentSetId,
    dedupeLabels,
    elementId,
    labelById,
    selectedClassificationId,
    selectedClassificationInfo?.labelId,
    selectedClassificationInfo?.policyId,
    selectedLabelObjects,
    selectedNumberSegment?.labelIds,
    selectedNumberSegment?.key,
    selectedTextSegment?.labelId,
  ]);

  const selectedDraftLabelIds = useMemo(
    () =>
      selectedDraftCandidate?.labels
        .map((label) => label.labelId)
        .filter((labelId): labelId is string => Boolean(labelId)) ?? [],
    [selectedDraftCandidate]
  );
  const hasExistingIssue = useMemo(
    () => selectedDraftLabelIds.some((labelId) => issueLabelIdSet.has(labelId)),
    [issueLabelIdSet, selectedDraftLabelIds]
  );

  const baseIssueRequest = useMemo<ValidResultCreateRequest | null>(() => {
    if (!labelContextId) {
      return null;
    }
    if (!datasetIdValue || datasetVersionValue == null) {
      return null;
    }
    if (!contentSetId) {
      return null;
    }
    return {
      labelContextId,
      datasetId: datasetIdValue,
      datasetVersion: String(datasetVersionValue),
      contentSetId,
      result: false,
      validType: "LABEL",
    };
  }, [datasetIdValue, datasetVersionValue, labelContextId, contentSetId]);

  const openIssuePanel = useWorkspaceIssuePanelStore((state) => state.open);
  const setIssueDrafts = useWorkspaceIssuePanelStore(
    (state) => state.setDrafts
  );

  const handleIssueClick = useCallback(() => {
    if (!baseIssueRequest) {
      return;
    }
    if (!selectedDraftCandidate || !selectedDraftCandidate.labels.length) {
      return;
    }
    if (hasExistingIssue) {
      openIssuePanel();
      return;
    }
    setIssueDrafts([
      {
        id: selectedDraftCandidate.id,
        labels: selectedDraftCandidate.labels,
        body: {
          ...baseIssueRequest,
          reason: "",
        },
      },
    ]);
    openIssuePanel();
  }, [
    baseIssueRequest,
    hasExistingIssue,
    openIssuePanel,
    selectedDraftCandidate,
    setIssueDrafts,
  ]);

  const canOpenIssueTool = Boolean(
    baseIssueRequest && selectedDraftCandidate?.labels.length
  );

  useEffect(() => {
    if (!isValidationMode) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreLabelingShortcutEvent(event.target)) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const key = getLabelingShortcutKey(event);
      if (key !== LABELING_SHORTCUTS.validation.issue.key) {
        return;
      }
      if (!canOpenIssueTool) {
        return;
      }
      event.preventDefault();
      handleIssueClick();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canOpenIssueTool, handleIssueClick, isValidationMode]);

  const toolbarItems: ToolbarItemType[] = [selectionToolItem];
  if (rangeSelectionToolItem) {
    toolbarItems.push({ variant: "toolbarDivider" }, rangeSelectionToolItem);
  }
  if (rangeSelectionToolItem) {
    toolbarItems.push({ variant: "toolbarDivider" });
  }
  toolbarItems.push(
    {
      variant: "button",
      iconType: "icon-issue",
      tooltip: formatShortcutTitle(
        "Issue",
        LABELING_SHORTCUTS.validation.issue
      ),
      onClick: handleIssueClick,
      disabled: !canOpenIssueTool,
    },
    { variant: "toolbarDivider" },
    {
      variant: "button",
      iconType: layerModeIconType,
      tooltip: formatShortcutTitle(
        "Toggle layer mode",
        LABELING_SHORTCUTS.common.layerToggle
      ),
      onClick: cycleLayerMode,
      disabled: false,
    }
  );

  return {
    toolbar: toolbarItems,
    breadcrumbItems: [
      ...baseBreadcrumbItems({ goToLabelingRoot }),
      { label: title ?? "Validation" },
    ],
  };
}
