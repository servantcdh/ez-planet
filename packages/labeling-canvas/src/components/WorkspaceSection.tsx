import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Icon } from "@/components";
import WorkspaceFloatingToolbar from "@/components/molecules/WorkspaceFloatingToolbar";
import { useExtensionsBySlot } from "@/providers/ExtensionProvider";
import type { SearchOperatorValue } from "@/features/content-group/queries";
import { useLabelingUIMeta } from "@/hooks/useLabelingUIMeta";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";

import { useLabelWorkspaceDirty } from "../hooks/useLabelWorkspaceDirty";
import { useWorkspaceIssueLabelIds } from "../hooks/useWorkspaceIssueLabelIds";
import { useWorkspaceLabelSearchParams } from "../hooks/useWorkspaceLabelSearchParams";
import { useLabelingPoliciesBatch, useLabelSearch } from "../queries";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useLabelSelectionStore } from "../store/labelSelection.store";
import { useLabelVisibilityStore } from "../store/labelVisibility.store";
import {
  OVERLAY_LAYER_INDEX,
  useLayerModeStore,
} from "../store/layerMode.store";
import { useWorkspaceFileLabelStore } from "../store/workspaceFileLabel.store";
import { useWorkspaceIssuePanelStore } from "../store/workspaceIssuePanel.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import {
  useWorkspaceViewModeStore,
  type WorkspaceViewMode,
} from "../store/workspaceViewMode.store";
import type { ClassificationValue } from "../types/domain";
import { resolveWorkspaceViewModeFromContentType } from "../utils/workspaceViewMode";
import LabelingErrorBoundary from "./LabelingErrorBoundary";
import WorkspaceFileSection from "./WorkspaceFileSection";
import WorkspaceImageSection from "./WorkspaceImageSection";
import WorkspaceIssuePanel from "./WorkspaceIssuePanel";
import WorkspaceNumberSection from "./WorkspaceNumberSection";
import WorkspaceTextSection from "./WorkspaceTextSection";

function WorkspaceSection() {
  const { selectedRows, rows, contentType, contentSetId } =
    useWorkspaceNavigationDetailSelectionStore();
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const chartAxisSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.chartAxisSnapshot
  );
  const { filter } = useFilterBySearchParams();
  const policyIds = filter.policyIds as SearchOperatorValue<string[]>;
  const { data: policies = [] } = useLabelingPoliciesBatch(policyIds?.value);
  const { request } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(request);
  const classificationLabels = useLabelBatchStore(
    (state) => state.classificationLabels
  );
  const classificationDeletedIds = useLabelBatchStore(
    (state) => state.classificationDeletedIds
  );
  const committedClassificationDeletedIds = useLabelBatchStore(
    (state) => state.committedClassificationDeletedIds
  );
  const resetWorkspaceChanges = useLabelBatchStore(
    (state) => state.resetWorkspaceChanges
  );
  const clearFileDrafts = useWorkspaceFileLabelStore(
    (state) => state.clearDrafts
  );
  const hiddenClassificationIds = useLabelVisibilityStore(
    (state) => state.hiddenClassificationIds
  );
  const selectedClassificationId = useLabelSelectionStore(
    (state) => state.selectedClassificationId
  );
  const setSelectedClassificationId = useLabelSelectionStore(
    (state) => state.setSelectedClassificationId
  );
  const { issueLabelIdSet } = useWorkspaceIssueLabelIds();
  const openIssuePanel = useWorkspaceIssuePanelStore((state) => state.open);
  const layerMode = useLayerModeStore((state) => state.mode);
  const workspaceViewMode = useWorkspaceViewModeStore((state) => state.mode);
  const isRecordViewMode = workspaceViewMode === "Record";
  const resolvedViewModeFromContentType = useMemo(
    () => resolveWorkspaceViewModeFromContentType(contentType),
    [contentType]
  );
  const resolvedWorkspaceViewMode = useMemo<WorkspaceViewMode>(() => {
    if (resolvedViewModeFromContentType === "File") {
      return "File";
    }
    if (workspaceViewMode !== "Record") {
      return workspaceViewMode;
    }
    return resolvedViewModeFromContentType ?? workspaceViewMode;
  }, [resolvedViewModeFromContentType, workspaceViewMode]);

  const { dirty } = useLabelWorkspaceDirty();
  const uiMeta = useLabelingUIMeta(workspaceViewMode, { dirtyGuard: dirty });
  const { extensions: toolbarExtensions, renderContext: extRenderCtx } = useExtensionsBySlot("renderToolbarAction");
  const contextKeyRef = useRef<string | null>(null);

  const selectedRow = useMemo(() => {
    return rows[selectedRows[0]] ?? null;
  }, [selectedRows, rows]);

  const endpointUrl =
    typeof selectedRow?.endpointUrl === "string" ? selectedRow.endpointUrl : "";

  const textContent =
    typeof selectedRow?.value === "string" ? selectedRow.value : "";

  useEffect(() => {
    const contextKey = elementId ?? contentSetId ?? null;
    if (
      contextKeyRef.current !== null &&
      contextKey &&
      contextKeyRef.current !== contextKey
    ) {
      resetWorkspaceChanges();
      clearFileDrafts();
    }
    contextKeyRef.current = contextKey ?? null;
  }, [clearFileDrafts, contentSetId, elementId, resetWorkspaceChanges]);

  const deletedClassificationSet = useMemo(
    () =>
      new Set(
        [
          ...classificationDeletedIds,
          ...committedClassificationDeletedIds,
        ].filter((id): id is string => Boolean(id))
      ),
    [classificationDeletedIds, committedClassificationDeletedIds]
  );

  const resolveClassMeta = useCallback(
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

  const getClassificationKey = useCallback(
    (
      policyId: string | null | undefined,
      value: ClassificationValue | undefined
    ) => {
      const policyKey = policyId ?? "";
      const classIndex =
        typeof value?.classIndex === "number"
          ? `idx-${value.classIndex}`
          : null;
      const className = value?.className ? `name-${value.className}` : null;
      const keyPart = classIndex ?? className;
      if (!keyPart) {
        return null;
      }
      return `${policyKey}::${keyPart}`;
    },
    []
  );

  const getTextColorForBackground = useCallback((color?: string): string => {
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
        .map((c) => c + c)
        .join("");
    }
    if (hex.length !== 6) {
      return "#fff";
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return "#fff";

    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#000" : "#fff";
  }, []);

  const recordClassificationBadges = useMemo(() => {
    if (!contentSetId || !isRecordViewMode) {
      return [];
    }
    const badgeMap = new Map<
      string,
      {
        id: string;
        title: string;
        color?: string;
        policyId?: string | null;
        classificationValue?: ClassificationValue | null;
        labelId?: string | null;
        tempId?: string | null;
      }
    >();

    const pushBadge = (params: {
      id?: string | null;
      tempId?: string | null;
      policyId?: string | null;
      value?: ClassificationValue | null;
      color?: string;
      unitType?: string | null;
      elementId?: string | null;
      contentSetId?: string | null;
    }) => {
      const {
        id,
        tempId,
        policyId,
        value,
        color,
        unitType,
        elementId,
        contentSetId: labelContentSetId,
      } = params;
      const normalizedUnitType = (unitType ?? "").toUpperCase();
      const isRecordLabel =
        normalizedUnitType === "CONTENTSET" ||
        (!normalizedUnitType && !elementId);
      if (!isRecordLabel) {
        return;
      }
      if (!labelContentSetId || labelContentSetId !== contentSetId) {
        return;
      }
      const isHidden =
        (id && hiddenClassificationIds[id]) ||
        (tempId && hiddenClassificationIds[tempId]);
      if ((id && deletedClassificationSet.has(id)) || isHidden) {
        return;
      }
      const meta = resolveClassMeta(policyId ?? null, value ?? undefined);
      const key =
        getClassificationKey(policyId ?? null, value ?? undefined) ??
        id ??
        tempId ??
        null;
      if (!key) {
        return;
      }
      const title =
        meta?.name ??
        value?.className ??
        (typeof value?.classIndex === "number"
          ? `Class ${value.classIndex}`
          : "Classification");
      badgeMap.set(key, {
        id: id ?? tempId ?? key,
        title,
        color: meta?.color ?? color,
        policyId: policyId ?? null,
        classificationValue: value ?? null,
        labelId: id ?? null,
        tempId: tempId ?? null,
      });
    };

    (labelSearchQuery.data?.list ?? []).forEach((label) => {
      if (label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      pushBadge({
        id: label.id,
        policyId: label.policyId ?? null,
        value:
          (label.labelValue as ClassificationValue | undefined) ?? undefined,
        unitType: label.unitType ?? null,
        elementId: label.elementId ?? null,
        contentSetId: label.contentSetId ?? null,
      });
    });

    classificationLabels.forEach((entry) => {
      if (entry.label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      pushBadge({
        id: entry.label.id,
        tempId: entry.tempId,
        policyId: entry.label.policyId ?? null,
        value:
          (entry.label.labelValue as ClassificationValue | undefined) ?? null,
        color: entry.color,
        unitType: entry.label.unitType ?? null,
        elementId: entry.label.elementId ?? null,
        contentSetId: entry.label.contentSetId ?? null,
      });
    });

    return Array.from(badgeMap.values());
  }, [
    classificationLabels,
    contentSetId,
    deletedClassificationSet,
    getClassificationKey,
    hiddenClassificationIds,
    isRecordViewMode,
    labelSearchQuery.data?.list,
    resolveClassMeta,
  ]);

  const recordClassificationStyle = useMemo<CSSProperties | undefined>(() => {
    if (!recordClassificationBadges.length) {
      return undefined;
    }
    const selectedBadge = recordClassificationBadges.find(
      (badge) => badge.id === selectedClassificationId
    );
    const color =
      selectedBadge?.color ??
      recordClassificationBadges[0]?.color ??
      "var(--color-primary)";
    return {
      ["--record-classification-color" as string]: color,
    };
  }, [recordClassificationBadges, selectedClassificationId]);

  const [imageSectionKey, setImageSectionKey] = useState(0);

  const shouldShowRecordClassification =
    isRecordViewMode &&
    recordClassificationBadges.length > 0 &&
    layerMode.includes(OVERLAY_LAYER_INDEX);
  return (
    <div
      className={`content-wrapper${shouldShowRecordClassification ? " content-wrapper--record-classified" : ""}`}
      style={recordClassificationStyle}
    >
      {shouldShowRecordClassification && (
        <div className="record-classification-badges">
          {recordClassificationBadges.map((badge) => {
            const issueLabelId = badge.labelId ?? badge.id ?? null;
            const hasIssue = issueLabelId
              ? issueLabelIdSet.has(issueLabelId)
              : false;
            const selectClassification = () => {
              setSelectedClassificationId(badge.id, {
                policyId: badge.policyId ?? null,
                classIndex: badge.classificationValue?.classIndex ?? null,
                className: badge.classificationValue?.className ?? null,
                labelId: badge.labelId ?? null,
                tempId: badge.tempId ?? null,
                isCanvasFocused: false,
              });
            };
            return (
              <div key={badge.id} className="workspace-class-badge-group">
                <button
                  className="record-classification-badge"
                  style={{
                    backgroundColor:
                      badge.color ?? "var(--record-classification-color)",
                    color: getTextColorForBackground(
                      badge.color ?? "var(--record-classification-color)"
                    ),
                    cursor: "pointer",
                  }}
                  onClick={selectClassification}
                >
                  {badge.title}
                </button>
                {hasIssue && (
                  <button
                    type="button"
                    className="workspace-issue-badge"
                    onClick={() => {
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
      <LabelingErrorBoundary onReset={() => setImageSectionKey((k) => k + 1)}>
        <WorkspaceImageSection
          key={imageSectionKey}
          active={resolvedWorkspaceViewMode === "Image"}
          endpointUrl={endpointUrl}
          readOnly={isRecordViewMode}
        />
      </LabelingErrorBoundary>
      <WorkspaceTextSection
        active={resolvedWorkspaceViewMode === "Text"}
        content={textContent}
      />
      <WorkspaceNumberSection
        active={resolvedWorkspaceViewMode === "Number"}
        snapshot={chartAxisSnapshot}
      />
      <WorkspaceFileSection
        active={resolvedWorkspaceViewMode === "File"}
        hideUpload={isRecordViewMode}
      />
      <WorkspaceIssuePanel />
      <WorkspaceFloatingToolbar toolbarContents={uiMeta.toolbar}>
        {toolbarExtensions.length > 0 && (
          <>
            <div className="toolbar-divider" />
            {toolbarExtensions.map((ext) => (
              <div key={ext.id}>{ext.renderToolbarAction!(extRenderCtx)}</div>
            ))}
          </>
        )}
      </WorkspaceFloatingToolbar>
    </div>
  );
}

export default WorkspaceSection;
