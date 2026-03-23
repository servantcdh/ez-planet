import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, Icon, Input, Title, Wrapper } from "@/components";
import type { IconName } from "@/components/atoms/Icon";
import { useWorkspaceLabelSearchParams } from "@/hooks/useWorkspaceLabelSearchParams";
import {
  useBulkDeleteValidResults,
  useCreateValidResult,
  useLabelingPoliciesBatch,
  useLabelSearch,
  useUpdateValidResult,
  useValidResultSearch,
} from "@/queries";
import { useLabelingMutations } from "@/providers/LabelingMutationProvider";
import { useLabelSelectionStore } from "@/store/labelSelection.store";
import { useNumberSegmentSelectionStore } from "@/store/numberSegmentSelection.store";
import { useSelectedLabelObjectsStore } from "@/store/selectedLabelObjects.store";
import { useTextSegmentSelectionStore } from "@/store/textSegmentSelection.store";
import {
  type IssueDraft,
  useWorkspaceIssuePanelStore,
} from "@/store/workspaceIssuePanel.store";
import { useWorkspaceNavigationDetailSelectionStore } from "@/store/workspaceNavigationDetailSelection.store";
import { useWorkspaceValidationModeStore } from "@/store/workspaceValidationMode.store";
import { useWorkspaceViewModeStore } from "@/store/workspaceViewMode.store";
import type {
  BoxValue,
  ChartValue,
  ClassificationValue,
  LabelDetailResponse,
  LabelInsertData,
  RecognitionValue,
  SegmentationResponseValue,
  ValidResultCreateRequest,
  ValidResultResponse,
  ValidResultSearchRequest,
} from "@/types/domain";
import { emitLabelEvent } from "@/utils/imageLabelingTools";
import {
  buildNumberSegmentGroups,
  type NumberSegmentGroup,
  type NumberSegmentSource,
} from "@/utils/numberSegmentRange";
import { resolveApiErrorMessage } from "@/utils/resolveApiErrorMessage";
import type { PolicyDetail } from "@/features/policy/types/domain";

const DEFAULT_ICON_TYPE: IconName = "icon-classification";
const VALIDATE_RESULT_CONFIRM_MESSAGE =
  "Are you sure you want to validate this issue?";
const INVALIDATE_RESULT_CONFIRM_MESSAGE =
  "Are you sure you want to undo validation for this issue?";
const VALIDATE_RESULTS_CONFIRM_MESSAGE =
  "Are you sure you want to validate these issues?";
const INVALIDATE_RESULTS_CONFIRM_MESSAGE =
  "Are you sure you want to undo validation for these issues?";
const DELETE_VALID_RESULT_CONFIRM_MESSAGE =
  "Are you sure you want to delete this validation issue?";
const DELETE_VALID_RESULTS_CONFIRM_MESSAGE =
  "Are you sure you want to delete these validation issues?";
const MSG_CREATE_VALID_RESULT_FAILED = "Failed to create validation issue.";
const MSG_UPDATE_VALID_RESULT_FAILED = "Failed to update validation issue.";
const MSG_UPDATE_VALID_REASON_FAILED = "Failed to update validation reason.";
const MSG_DELETE_VALID_RESULT_FAILED = "Failed to delete validation issue.";

const buildValidResultGroupKey = (
  segmentKey: string | null | undefined,
  resultId: string
) => (segmentKey ? `result-segment-${segmentKey}` : `result-${resultId}`);

const resolveGroupReason = (results: ValidResultResponse[]) => {
  const reasons = results.map((result) => result.reason ?? "");
  const uniqueReasons = new Set(reasons);
  if (uniqueReasons.size === 1) {
    return { reason: reasons[0], isMixed: false };
  }
  return { reason: "", isMixed: true };
};

const resolveLabelIcon = (
  label: LabelDetailResponse | null | undefined
): IconName => {
  switch (label?.inferenceType) {
    case "OBJECT_DETECTION":
      return "icon-object-detection";
    case "SEGMENTATION":
      return "icon-segmentation";
    case "RECOGNITION":
      return "icon-text";
    case "CLASSIFICATION":
    default:
      return DEFAULT_ICON_TYPE;
  }
};

const resolveLabelTitle = (
  label: LabelDetailResponse | null | undefined,
  fallback = "Label"
) => {
  if (!label) {
    return fallback;
  }
  switch (label.inferenceType) {
    case "CLASSIFICATION": {
      const value = label.labelValue as
        | ClassificationValue
        | ChartValue
        | undefined;
      return value?.className ?? "Classification";
    }
    case "OBJECT_DETECTION": {
      const value = label.labelValue as BoxValue | undefined;
      return value?.className ?? "Object";
    }
    case "SEGMENTATION": {
      const value = label.labelValue as SegmentationResponseValue | undefined;
      return value?.className ?? value?.objectName ?? "Segmentation";
    }
    case "RECOGNITION": {
      const value = label.labelValue as RecognitionValue | undefined;
      return value?.text ?? value?.className ?? "Text";
    }
    default:
      return fallback;
  }
};

const isNumberSegmentLabel = (label: LabelDetailResponse) => {
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

type ClassLookupValue = {
  classIndex?: number;
  className?: string;
};

type ValidResultGroup = {
  key: string;
  results: ValidResultResponse[];
  labelIds: string[];
  primaryLabel: LabelDetailResponse | null;
  segment?: NumberSegmentGroup;
};

const toClassLookupValue = (value: unknown): ClassLookupValue | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as ClassLookupValue;
  if (
    typeof candidate.classIndex !== "number" &&
    typeof candidate.className !== "string"
  ) {
    return undefined;
  }
  return candidate;
};

const resolvePolicyClassMeta = (
  policies: PolicyDetail[],
  policyId: string | null | undefined,
  value: ClassLookupValue | undefined
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
      ? policy.classes.find((entry) => entry.index === value.classIndex)
      : undefined;
  if (byIndex) {
    return byIndex;
  }
  if (value.className) {
    return (
      policy.classes.find((entry) => entry.name === value.className) ?? null
    );
  }
  return null;
};

const resolveLabelIconFill = (
  label: LabelDetailResponse | null | undefined,
  policies: PolicyDetail[]
) => {
  if (!label) {
    return undefined;
  }
  const classMeta = resolvePolicyClassMeta(
    policies,
    label.policyId ?? null,
    toClassLookupValue(label.labelValue)
  );
  return classMeta?.color;
};

function WorkspaceIssuePanel() {
  const {
    labelContextId,
    request: labelSearchRequest,
    isRecordLabelingMode,
  } = useWorkspaceLabelSearchParams();
  const { onMutationSuccess } = useLabelingMutations();
  const labelSearchQuery = useLabelSearch(labelSearchRequest);
  const labelSearchList = labelSearchQuery.data?.list ?? [];
  const labelById = useMemo(() => {
    const map = new Map<string, LabelDetailResponse>();
    labelSearchList.forEach((label) => {
      map.set(label.id, label);
    });
    return map;
  }, [labelSearchList]);
  const isIssuePanelOpen = useWorkspaceIssuePanelStore((state) => state.isOpen);
  const closeIssuePanel = useWorkspaceIssuePanelStore((state) => state.close);
  const issueDrafts = useWorkspaceIssuePanelStore((state) => state.drafts);
  const updateDraftReason = useWorkspaceIssuePanelStore(
    (state) => state.updateDraftReason
  );
  const updateDraftResult = useWorkspaceIssuePanelStore(
    (state) => state.updateDraftResult
  );
  const removeDraft = useWorkspaceIssuePanelStore((state) => state.removeDraft);
  const isValidationMode = useWorkspaceValidationModeStore(
    (state) => state.isValidationMode
  );
  const isLabelingMode = !isValidationMode;
  const workspaceViewMode = useWorkspaceViewModeStore((state) => state.mode);
  const selectedLabelObjects = useSelectedLabelObjectsStore(
    (state) => state.objects
  );
  const selectedTextSegment = useTextSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const selectedNumberSegment = useNumberSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const setSelectedNumberSegment = useNumberSegmentSelectionStore(
    (state) => state.setSelectedSegment
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
  const setSelectedTextSegment = useTextSegmentSelectionStore(
    (state) => state.setSelectedSegment
  );
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const contentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );
  const detailRows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.rows
  );
  const detailColumns = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.columns
  );
  const chartAxisSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.chartAxisSnapshot
  );
  const validResultSearchRequest = useMemo<
    ValidResultSearchRequest | undefined
  >(() => {
    if (!labelContextId) {
      return undefined;
    }
    const shouldUseContentSet =
      workspaceViewMode === "Record" ||
      isRecordLabelingMode ||
      (contentType ?? "").toUpperCase() === "TABLE";
    const request: ValidResultSearchRequest = {
      labelContextId: { operator: "EQ", value: labelContextId },
      validType: { operator: "EQ", value: "LABEL" },
      orderBy: { createdDate: "DESC" },
    };
    if (shouldUseContentSet) {
      if (!contentSetId) {
        return undefined;
      }
      request.contentSetId = { operator: "EQ", value: contentSetId };
      return request;
    }
    if (!elementId) {
      return undefined;
    }
    request.elementId = { operator: "EQ", value: elementId };
    return request;
  }, [
    contentSetId,
    contentType,
    elementId,
    isRecordLabelingMode,
    labelContextId,
    workspaceViewMode,
  ]);
  const validResultQuery = useValidResultSearch(validResultSearchRequest);
  const validResults = validResultQuery.data?.list ?? [];
  const policyIds = useMemo(() => {
    const ids = new Set<string>();
    labelSearchList.forEach((label) => {
      if (label.policyId) {
        ids.add(label.policyId);
      }
    });
    issueDrafts.forEach((draft) => {
      draft.labels.forEach((label) => {
        if (label.policyId) {
          ids.add(label.policyId);
        }
      });
    });
    validResults.forEach((result) => {
      if (result.policyId) {
        ids.add(result.policyId);
      }
    });
    return Array.from(ids);
  }, [issueDrafts, labelSearchList, validResults]);
  const { data: policies = [] } = useLabelingPoliciesBatch(policyIds);
  const { mutateAsync: createValidResult, isPending: isCreating } =
    useCreateValidResult();
  const { mutateAsync: updateValidResult, isPending: isUpdating } =
    useUpdateValidResult();
  const { mutateAsync: deleteValidResults, isPending: isDeleting } =
    useBulkDeleteValidResults();
  const [editedReasons, setEditedReasons] = useState<Record<string, string>>(
    {}
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLDivElement>());
  const prevDraftIdsRef = useRef<string[]>([]);
  const pendingDraftKeyRef = useRef<string | null>(null);
  const prevSelectionSignatureRef = useRef<string>("");
  const numberSegmentSources = useMemo<NumberSegmentSource[]>(() => {
    const sources: NumberSegmentSource[] = [];
    labelSearchList.forEach((label) => {
      if (!isNumberSegmentLabel(label)) {
        return;
      }
      sources.push({ label });
    });
    return sources;
  }, [labelSearchList]);
  const numberSegmentSnapshot = useMemo(() => {
    if (
      workspaceViewMode !== "Number" ||
      (contentType ?? "").toUpperCase() !== "TABLE"
    ) {
      return chartAxisSnapshot;
    }
    if (chartAxisSnapshot.xAxis.ticks.length > 0) {
      return chartAxisSnapshot;
    }
    if (!detailRows.length || !detailColumns.length) {
      return chartAxisSnapshot;
    }

    const ticks = detailRows.map((_, index) => ({
      key: index,
      label: String(index + 1),
      rowIndex: index,
    }));
    const series = detailColumns.map((columnId) => {
      const points = ticks.map((tick) => {
        const row = detailRows[tick.rowIndex ?? 0];
        const elementId =
          row && typeof row.elementId === "string" && row.elementId.length > 0
            ? row.elementId
            : null;
        return {
          axisKey: tick.key,
          rowIndex: tick.rowIndex ?? 0,
          columnId,
          elementId,
          rawValue: row ? row[columnId] ?? null : null,
          value: null,
        };
      });
      return {
        id: columnId,
        label: columnId,
        points,
        values: points.map((point) => point.value),
      };
    });
    return {
      ...chartAxisSnapshot,
      xAxis: {
        ...chartAxisSnapshot.xAxis,
        ticks,
      },
      yAxis: {
        ...chartAxisSnapshot.yAxis,
        series,
      },
      source: {
        rows: ticks.map((tick) => tick.rowIndex ?? 0),
        columns: detailColumns,
      },
    };
  }, [
    chartAxisSnapshot,
    contentType,
    detailColumns,
    detailRows,
    workspaceViewMode,
  ]);
  const numberSegmentGroups = useMemo(
    () => buildNumberSegmentGroups(numberSegmentSources, numberSegmentSnapshot),
    [numberSegmentSnapshot, numberSegmentSources]
  );
  const numberSegmentByLabelId = useMemo(() => {
    const map = new Map<string, NumberSegmentGroup>();
    numberSegmentGroups.forEach((group) => {
      group.labelIds.forEach((labelId) => {
        if (labelId) {
          map.set(labelId, group);
        }
      });
    });
    return map;
  }, [numberSegmentGroups]);

  const validResultGroups = useMemo<ValidResultGroup[]>(() => {
    const grouped = new Map<string, ValidResultGroup>();
    const groupedLabelIds = new Map<string, Set<string>>();
    const ordered: ValidResultGroup[] = [];

    validResults.forEach((result) => {
      const labelId = result.labelId ?? null;
      const segment = labelId ? numberSegmentByLabelId.get(labelId) : undefined;
      const groupKey = buildValidResultGroupKey(segment?.key, result.id);
      const existing = grouped.get(groupKey);
      if (!existing) {
        const labelIdSet = new Set<string>();
        if (labelId) {
          labelIdSet.add(labelId);
        }
        const primaryLabel = labelId ? (labelById.get(labelId) ?? null) : null;
        const nextGroup: ValidResultGroup = {
          key: groupKey,
          results: [result],
          labelIds: labelId ? [labelId] : [],
          primaryLabel,
          segment,
        };
        grouped.set(groupKey, nextGroup);
        groupedLabelIds.set(groupKey, labelIdSet);
        ordered.push(nextGroup);
        return;
      }
      existing.results.push(result);
      const labelIdSet =
        groupedLabelIds.get(groupKey) ??
        (() => {
          const created = new Set(existing.labelIds);
          groupedLabelIds.set(groupKey, created);
          return created;
        })();
      if (labelId && !labelIdSet.has(labelId)) {
        labelIdSet.add(labelId);
        existing.labelIds.push(labelId);
      }
      if (!existing.primaryLabel && labelId) {
        const label = labelById.get(labelId);
        if (label) {
          existing.primaryLabel = label;
        }
      }
      if (!existing.segment && segment) {
        existing.segment = segment;
      }
    });

    return ordered;
  }, [labelById, numberSegmentByLabelId, validResults]);

  const selectedLabelIds = useMemo(() => {
    const ids = new Set<string>();

    if (selectedLabelObjects.length === 1) {
      const selectedObject = selectedLabelObjects[0];
      const insertData = selectedObject?.labelInsertData as
        | (LabelInsertData & { id?: string })
        | undefined;
      const objectId =
        (typeof selectedObject?.unique === "string" && selectedObject.unique) ||
        (selectedObject as { id?: string } | undefined)?.id;
      if (insertData?.id) {
        ids.add(insertData.id);
      }
      if (objectId) {
        ids.add(objectId);
      }
    }

    if (selectedTextSegment?.labelId) {
      ids.add(selectedTextSegment.labelId);
    }

    const numberLabelIds = selectedNumberSegment?.labelIds ?? [];
    numberLabelIds.forEach((labelId) => {
      if (labelId) {
        ids.add(labelId);
      }
    });

    if (selectedClassificationInfo?.labelId) {
      ids.add(selectedClassificationInfo.labelId);
    } else if (selectedClassificationId) {
      ids.add(selectedClassificationId);
    }

    return Array.from(ids);
  }, [
    selectedClassificationId,
    selectedClassificationInfo?.labelId,
    selectedLabelObjects,
    selectedNumberSegment?.labelIds,
    selectedTextSegment?.labelId,
  ]);

  const selectedLabelSignature = useMemo(() => {
    if (!selectedLabelIds.length) {
      return "";
    }
    return [...selectedLabelIds].sort().join("|");
  }, [selectedLabelIds]);
  const selectedLabelIdSet = useMemo(
    () => new Set(selectedLabelIds),
    [selectedLabelIds]
  );

  const setItemRef = useCallback(
    (key: string) => (node: HTMLDivElement | null) => {
      if (!node) {
        itemRefs.current.delete(key);
        return;
      }
      itemRefs.current.set(key, node);
    },
    []
  );


  useEffect(() => {
    if (prevSelectionSignatureRef.current !== selectedLabelSignature) {
      pendingDraftKeyRef.current = null;
      prevSelectionSignatureRef.current = selectedLabelSignature;
    }
  }, [selectedLabelSignature]);

  useEffect(() => {
    const prevIds = prevDraftIdsRef.current;
    const nextIds = issueDrafts.map((draft) => draft.id);
    const prevIdSet = new Set(prevIds);
    const addedId = nextIds.find((id) => !prevIdSet.has(id));
    if (addedId) {
      const nextKey = `draft-${addedId}`;
      pendingDraftKeyRef.current = nextKey;
      setActiveKey(nextKey);
    }
    prevDraftIdsRef.current = nextIds;
  }, [issueDrafts]);

  useEffect(() => {
    const pendingKey = pendingDraftKeyRef.current;
    if (pendingKey) {
      const stillExists = issueDrafts.some(
        (draft) => `draft-${draft.id}` === pendingKey
      );
      if (stillExists) {
        setActiveKey(pendingKey);
        return;
      }
      pendingDraftKeyRef.current = null;
    }

    if (!selectedLabelIds.length) {
      setActiveKey(null);
      return;
    }

    const matchingDraft = issueDrafts.find((draft) =>
      draft.labels.some(
        (label) =>
          typeof label.labelId === "string" &&
          selectedLabelIdSet.has(label.labelId)
      )
    );
    if (matchingDraft) {
      setActiveKey(`draft-${matchingDraft.id}`);
      return;
    }

    const matchingResultGroup = validResultGroups.find((group) =>
      group.labelIds.some((labelId) => selectedLabelIdSet.has(labelId))
    );
    if (matchingResultGroup) {
      setActiveKey(matchingResultGroup.key);
      return;
    }

    setActiveKey(null);
  }, [issueDrafts, selectedLabelIdSet, selectedLabelIds.length, validResultGroups]);

  useEffect(() => {
    if (!isIssuePanelOpen || !activeKey) {
      return;
    }
    const node = itemRefs.current.get(activeKey);
    if (!node) {
      return;
    }
    node.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [
    activeKey,
    isIssuePanelOpen,
    issueDrafts.length,
    validResultGroups.length,
  ]);

  const handleSelectIssueLabel = useCallback(
    (labelIds: Array<string | null | undefined>) => {
      const normalizedIds = labelIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0
      );
      if (!normalizedIds.length) {
        return;
      }
      const normalizedIdSet = new Set(normalizedIds);
      const matchedLabel =
        normalizedIds
          .map((id) => labelById.get(id))
          .find((label): label is LabelDetailResponse => Boolean(label)) ??
        labelSearchList.find((label) => normalizedIdSet.has(label.id));
      const resolvedId = matchedLabel?.id ?? normalizedIds[0];
      if (!matchedLabel) {
        emitLabelEvent("selected", { uniques: [resolvedId] });
        return;
      }
      if (matchedLabel.inferenceType === "CLASSIFICATION") {
        if (isNumberSegmentLabel(matchedLabel)) {
          let segment: NumberSegmentGroup | undefined;
          for (const id of normalizedIds) {
            const found = numberSegmentByLabelId.get(id);
            if (found) {
              segment = found;
              break;
            }
          }
          if (segment) {
            setSelectedClassificationId(null);
            setSelectedNumberSegment({
              key: segment.key,
              labelIds: segment.labelIds,
              tempIds: segment.tempIds,
              start: segment.start,
              end: segment.end,
              color: segment.color,
              opacity: segment.opacity,
              zindex: segment.zindex,
              policyId: segment.policyId ?? null,
              classIndex: segment.classIndex,
              className: segment.className,
              columnName: segment.columnName,
            });
            return;
          }
        }
        const classificationValue = matchedLabel.labelValue as
          | ClassificationValue
          | ChartValue
          | undefined;
        setSelectedClassificationId(matchedLabel.id, {
          policyId: matchedLabel.policyId ?? null,
          classIndex: classificationValue?.classIndex ?? null,
          className: classificationValue?.className ?? null,
          labelId: matchedLabel.id ?? null,
          tempId: null,
          isCanvasFocused: false,
        });
        return;
      }
      if (matchedLabel.inferenceType === "RECOGNITION") {
        const recognitionValue = matchedLabel.labelValue as
          | RecognitionValue
          | undefined;
        if (
          typeof recognitionValue?.start === "number" &&
          typeof recognitionValue?.end === "number"
        ) {
          setSelectedTextSegment({
            key: matchedLabel.id,
            labelId: matchedLabel.id,
            tempId: matchedLabel.id,
            start: recognitionValue.start,
            end: recognitionValue.end,
            text: recognitionValue.text ?? "",
            color: recognitionValue.color,
            opacity: recognitionValue.opacity,
          });
        }
        return;
      }
      setSelectedClassificationId(null);
      emitLabelEvent("selected", { uniques: [matchedLabel.id] });
    },
    [
      labelById,
      labelSearchList,
      numberSegmentByLabelId,
      setSelectedClassificationId,
      setSelectedNumberSegment,
      setSelectedTextSegment,
    ]
  );

  const handleSubmitDraft = useCallback(
    async (draft: IssueDraft) => {
      if (isLabelingMode) {
        return;
      }
      if (!draft.body.reason?.trim()) {
        return;
      }
      const requests = draft.labels.reduce((acc, label) => {
        const resolvedContentSetId =
          label.contentSetId ?? draft.body.contentSetId;
        if (!resolvedContentSetId) {
          return acc;
        }
        acc.push({
          ...draft.body,
          labelId: label.labelId,
          contentSetId: resolvedContentSetId,
          elementId: label.elementId ?? draft.body.elementId,
          policyId: label.policyId ?? draft.body.policyId,
        });
        return acc;
      }, [] as ValidResultCreateRequest[]);

      if (!requests.length) {
        return;
      }
      try {
        await Promise.all(requests.map((body) => createValidResult(body)));
        removeDraft(draft.id);
        if (validResultSearchRequest) {
          void validResultQuery.refetch();
        }
        onMutationSuccess({ type: "valid-result-created" });
      } catch (error) {
        window.alert(
          resolveApiErrorMessage(error, MSG_CREATE_VALID_RESULT_FAILED)
        );
        return;
      }
    },
    [
      createValidResult,
      onMutationSuccess,
      isLabelingMode,
      labelContextId,
      removeDraft,
      validResultQuery,
      validResultSearchRequest,
    ]
  );

  const handleResultReasonChange = useCallback(
    (key: string, value: string) => {
      if (isLabelingMode) {
        return;
      }
      setEditedReasons((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [isLabelingMode]
  );

  const handleResultReasonBlur = useCallback(
    async (group: ValidResultGroup) => {
      if (isLabelingMode) {
        return;
      }
      const nextReason = editedReasons[group.key];
      const { reason: fallbackReason, isMixed } = resolveGroupReason(
        group.results
      );
      const baselineReason = isMixed ? undefined : fallbackReason;
      if (nextReason === undefined || nextReason === baselineReason) {
        if (nextReason === baselineReason) {
          setEditedReasons((prev) => {
            const { [group.key]: _removed, ...rest } = prev;
            return rest;
          });
        }
        return;
      }
      const updates = group.results.filter(
        (result) => (result.reason ?? "") !== nextReason
      );
      if (!updates.length) {
        setEditedReasons((prev) => {
          const { [group.key]: _removed, ...rest } = prev;
          return rest;
        });
        return;
      }
      try {
        await Promise.all(
          updates.map((result) =>
            updateValidResult({
              id: result.id,
              body: { reason: nextReason },
            })
          )
        );
        setEditedReasons((prev) => {
          const { [group.key]: _removed, ...rest } = prev;
          return rest;
        });
        if (validResultSearchRequest) {
          void validResultQuery.refetch();
        }
      } catch (error) {
        window.alert(
          resolveApiErrorMessage(error, MSG_UPDATE_VALID_REASON_FAILED)
        );
        return;
      }
    },
    [
      editedReasons,
      isLabelingMode,
      updateValidResult,
      validResultQuery,
      validResultSearchRequest,
    ]
  );

  const handleValidateResult = useCallback(
    async (group: ValidResultGroup) => {
      const isValidated = group.results.every((result) => result.result);
      const nextResult = !isValidated;
      const confirmMessage = nextResult
        ? group.results.length > 1
          ? VALIDATE_RESULTS_CONFIRM_MESSAGE
          : VALIDATE_RESULT_CONFIRM_MESSAGE
        : group.results.length > 1
          ? INVALIDATE_RESULTS_CONFIRM_MESSAGE
          : INVALIDATE_RESULT_CONFIRM_MESSAGE;
      if (!window.confirm(confirmMessage)) {
        return;
      }
      const updates = group.results.filter(
        (result) => result.result !== nextResult
      );
      if (!updates.length) {
        return;
      }
      try {
        await Promise.all(
          updates.map((result) =>
            updateValidResult({
              id: result.id,
              body: { result: nextResult },
            })
          )
        );
        if (validResultSearchRequest) {
          void validResultQuery.refetch();
        }
        const resolvedLabelContextId =
          group.results.find((result) => result.labelContextId)
            ?.labelContextId ?? labelContextId;
        onMutationSuccess({ type: "valid-result-updated" });
      } catch (error) {
        window.alert(
          resolveApiErrorMessage(error, MSG_UPDATE_VALID_RESULT_FAILED)
        );
        return;
      }
    },
    [
      onMutationSuccess,
      labelContextId,
      updateValidResult,
      validResultQuery,
      validResultSearchRequest,
    ]
  );

  const handleDeleteValidResult = useCallback(
    async (group: ValidResultGroup) => {
      if (isLabelingMode) {
        return;
      }
      const idsToDelete = Array.from(
        new Set(group.results.map((result) => result.id))
      );
      const confirmMessage =
        idsToDelete.length > 1
          ? DELETE_VALID_RESULTS_CONFIRM_MESSAGE
          : DELETE_VALID_RESULT_CONFIRM_MESSAGE;
      if (!window.confirm(confirmMessage)) {
        return;
      }
      try {
        await deleteValidResults({
          validResultIds: idsToDelete,
        });
        if (validResultSearchRequest) {
          void validResultQuery.refetch();
        }
        const resolvedLabelContextId =
          group.results.find((result) => result.labelContextId)
            ?.labelContextId ?? labelContextId;
        onMutationSuccess({ type: "valid-results-deleted" });
      } catch (error) {
        window.alert(
          resolveApiErrorMessage(error, MSG_DELETE_VALID_RESULT_FAILED)
        );
        return;
      }
    },
    [
      deleteValidResults,
      onMutationSuccess,
      isLabelingMode,
      labelContextId,
      validResultQuery,
      validResultSearchRequest,
    ]
  );

  if (!isIssuePanelOpen) {
    return null;
  }

  const hasIssues = issueDrafts.length > 0 || validResultGroups.length > 0;

  return (
    <div className="floating-panel floating-panel--issue">
      <div className="floating-panel__header">
        <Title title="Issue" />
      </div>
      <div className="floating-panel__body">
        {!hasIssues ? (
          <p className="issue-panel__empty">No issue draft selected.</p>
        ) : (
          <Wrapper
            className="issue-list"
            direction="vertical"
            gapSize="0.25rem"
            isFull
          >
            {issueDrafts.map((draft) => {
              const primaryLabelId = draft.labels[0]?.labelId ?? null;
              const primaryLabel = primaryLabelId
                ? labelById.get(primaryLabelId)
                : null;
              const fallbackTitle = resolveLabelTitle(
                primaryLabel,
                primaryLabelId ?? "Label"
              );
              const iconType = resolveLabelIcon(primaryLabel);
              const iconFill = resolveLabelIconFill(primaryLabel, policies);
              const draftKey = `draft-${draft.id}`;
              const isDraftSelected = activeKey === draftKey;
              return (
                <div
                  key={draftKey}
                  ref={setItemRef(draftKey)}
                  onClick={() => {
                    handleSelectIssueLabel(
                      draft.labels.map((label) => label.labelId)
                    );
                  }}
                  className={`issue-wrapper full-width${isDraftSelected ? " selected" : ""}`}
                >
                  <Wrapper direction="vertical" isFull>
                    <Wrapper
                      justify="between"
                      className="issue"
                      isFull
                      align="center"
                    >
                      <Wrapper
                        className="issue-item"
                        align="center"
                        gapSize="0.5rem"
                      >
                        <Icon iconType={iconType} fill={iconFill} />
                        <p className="label__title">{fallbackTitle}</p>
                      </Wrapper>
                      <Wrapper className="label-util" gapSize="0.25rem">
                        <Button
                          size="sm"
                          style="transparent"
                          className={draft.body.result ? "selected" : undefined}
                          aria-pressed={draft.body.result}
                          onClick={() => {
                            updateDraftResult(draft.id, !draft.body.result);
                          }}
                        >
                          <Icon iconType="icon-validated" size="xs" />
                        </Button>
                        <Button
                          size="sm"
                          style="transparent"
                          disabled={isLabelingMode}
                          onClick={() => {
                            if (isLabelingMode) {
                              return;
                            }
                            removeDraft(draft.id);
                          }}
                        >
                          <Icon iconType="icon-cancel" size="xs" />
                        </Button>
                      </Wrapper>
                    </Wrapper>
                    <Input
                      isFull
                      size="sm"
                      placeholder="max 50 chars"
                      border="underline"
                      maxLength={50}
                      value={draft.body.reason ?? ""}
                      onChange={(event) => {
                        if (isLabelingMode) {
                          return;
                        }
                        updateDraftReason(draft.id, event.target.value);
                      }}
                      onBlur={() => {
                        void handleSubmitDraft(draft);
                      }}
                      disabled={isCreating || isLabelingMode}
                      aria-busy={isCreating}
                    />
                  </Wrapper>
                </div>
              );
            })}
            {validResultGroups.map((group) => {
              const labelIds = group.labelIds;
              const label = group.primaryLabel;
              const fallbackLabelId = labelIds[0] ?? "Label";
              const labelTitle = resolveLabelTitle(label, fallbackLabelId);
              const iconType = resolveLabelIcon(label);
              const iconFill = resolveLabelIconFill(label, policies);
              const representativeReason = group.results[0]?.reason ?? "";
              const reasonValue =
                editedReasons[group.key] ?? representativeReason;
              const isResultSelected = activeKey === group.key;
              const isValidated = group.results.every(
                (result) => result.result
              );
              return (
                <div
                  key={group.key}
                  ref={setItemRef(group.key)}
                  onClick={() => {
                    handleSelectIssueLabel(labelIds);
                  }}
                  className={`issue-wrapper full-width${isResultSelected ? " selected" : ""}`}
                >
                  <Wrapper direction="vertical" isFull>
                    <Wrapper
                      justify="between"
                      className="issue"
                      isFull
                      align="center"
                    >
                      <Wrapper
                        className="issue-item"
                        align="center"
                        gapSize="0.5rem"
                      >
                        <Icon iconType={iconType} fill={iconFill} />
                        <p className="label__title">{labelTitle}</p>
                      </Wrapper>
                      <Wrapper className="label-util" gapSize="0.25rem">
                        <Button
                          size="sm"
                          style="transparent"
                          className={isValidated ? "selected" : undefined}
                          aria-pressed={isValidated}
                          onClick={() => {
                            void handleValidateResult(group);
                          }}
                        >
                          <Icon iconType="icon-validated" size="xs" />
                        </Button>
                        <Button
                          size="sm"
                          style="transparent"
                          disabled={isLabelingMode || isDeleting}
                          aria-busy={isDeleting}
                          onClick={() => {
                            void handleDeleteValidResult(group);
                          }}
                        >
                          <Icon iconType="icon-cancel" size="xs" />
                        </Button>
                      </Wrapper>
                    </Wrapper>
                    <Input
                      isFull
                      size="sm"
                      border="underline"
                      maxLength={50}
                      value={reasonValue}
                      onChange={(event) =>
                        handleResultReasonChange(group.key, event.target.value)
                      }
                      onBlur={() => {
                        void handleResultReasonBlur(group);
                      }}
                      placeholder="max 50 chars"
                      disabled={isUpdating || isLabelingMode}
                      aria-busy={isUpdating}
                    />
                  </Wrapper>
                </div>
              );
            })}
          </Wrapper>
        )}
      </div>
      <div className="floating-panel__footer">
        <Button
          title="Close"
          style="primary-outline"
          onClick={closeIssuePanel}
        />
      </div>
    </div>
  );
}

export default WorkspaceIssuePanel;
