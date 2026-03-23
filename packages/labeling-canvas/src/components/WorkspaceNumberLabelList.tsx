import {
  type DragEvent as ReactDragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button, Icon, Wrapper } from "@/components";
import type { PolicyDetail } from "@/features/policy/types/domain";

import { useWorkspaceLabelSearchParams } from "../hooks/useWorkspaceLabelSearchParams";
import { useLabelSearch } from "../queries";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useLabelSelectionStore } from "../store/labelSelection.store";
import { useLabelVisibilityStore } from "../store/labelVisibility.store";
import { useNumberLabelUiStore } from "../store/numberLabelUi.store";
import { useNumberSegmentSelectionStore } from "../store/numberSegmentSelection.store";
import { useWorkspaceAttributeEditorStore } from "../store/workspaceAttributeEditor.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import type {
  ChartValue,
  LabelDetailResponse,
  LabelInsertData,
} from "../types/domain";
import {
  buildNumberSegmentGroups,
  type NumberSegmentGroup,
  type NumberSegmentSource,
} from "../utils/numberSegmentRange";

interface WorkspaceNumberLabelListProps {
  policies: PolicyDetail[];
}

interface LabelAttributeRow {
  title: string;
  value: string;
}

type LabelRowSource = LabelDetailResponse | (LabelInsertData & { id?: string });

type NumberLabelKind = "classification" | "segment";

interface NumberLabelRow {
  id: string;
  title: string;
  iconType: "icon-classification" | "icon-area-number";
  iconFill?: string;
  attributes: LabelAttributeRow[];
  selected: boolean;
  kind: NumberLabelKind;
  policyId?: string | null;
  classificationValue?: ChartValue | null;
  classificationLabelId?: string | null;
  classificationTempId?: string | null;
  segmentLabelIds?: string[];
  segmentTempIds?: string[];
  segmentStart?: number;
  segmentEnd?: number;
  segmentOpacity?: number;
  segmentZIndex?: number;
}

function resolvePolicyClassMeta(
  policies: PolicyDetail[],
  policyId: string | null | undefined,
  value:
    | {
        classIndex?: number;
        className?: string;
      }
    | undefined
) {
  if (!policyId || !value) {
    return null;
  }
  const policy = policies.find((item) => item.id === policyId);
  if (!policy) {
    return null;
  }
  const byIndex =
    typeof value.classIndex === "number"
      ? policy.classes.find((c) => c.index === value.classIndex)
      : undefined;
  if (byIndex) {
    return byIndex;
  }
  if (value.className) {
    return policy.classes.find((c) => c.name === value.className) ?? null;
  }
  return null;
}

const getClassificationKey = (
  label: LabelRowSource,
  value: ChartValue | undefined
): string | null => {
  const policyKey = label.policyId ?? "";
  const classIndex =
    typeof value?.classIndex === "number" ? `idx-${value.classIndex}` : null;
  const className = value?.className ? `name-${value.className}` : null;
  const keyPart = classIndex ?? className;
  if (!keyPart) {
    return null;
  }
  const columnName = value?.columnName ? value.columnName : "no-column";
  const elementKey = label.elementId ? label.elementId : "no-element";
  return `${policyKey}::${keyPart}::${elementKey}::${columnName}`;
};

const buildAttributeRows = (label: LabelRowSource): LabelAttributeRow[] => {
  const attributes = label.attributeValues ?? [];
  if (!attributes.length) {
    return [];
  }
  return attributes.map((attribute) => ({
    title: attribute.name ?? attribute.attributeType ?? "Attribute",
    value: Array.isArray(attribute.values) ? attribute.values.join(", ") : "",
  }));
};

const buildClassificationRow = (
  label: LabelRowSource,
  policies: PolicyDetail[],
  rowId: string,
  options?: { tempId?: string; fallbackColor?: string }
): NumberLabelRow => {
  const chartValue = label.labelValue as ChartValue | undefined;
  const classMeta = resolvePolicyClassMeta(
    policies,
    label.policyId ?? null,
    chartValue
  );
  return {
    id: rowId,
    title:
      classMeta?.name ??
      chartValue?.className ??
      (typeof chartValue?.classIndex === "number"
        ? `Class ${chartValue.classIndex}`
        : "Classification"),
    iconType: "icon-classification",
    iconFill: chartValue?.color ?? classMeta?.color ?? options?.fallbackColor,
    attributes: buildAttributeRows(label),
    selected: false,
    kind: "classification",
    policyId: label.policyId ?? null,
    classificationValue: chartValue ?? null,
    classificationLabelId: label.id ?? null,
    classificationTempId: options?.tempId ?? (label.id ? null : rowId),
  };
};

const buildSegmentRow = (
  segment: NumberSegmentGroup,
  policies: PolicyDetail[]
): NumberLabelRow => {
  const sourceLabel = segment.sources[0]?.label;
  const chartValue = (sourceLabel?.labelValue as ChartValue | undefined) ?? {
    classIndex: segment.classIndex,
    className: segment.className,
    columnName: segment.columnName,
    color: segment.color,
    opacity: segment.opacity,
    zindex: segment.zindex,
  };
  const classMeta = resolvePolicyClassMeta(
    policies,
    segment.policyId ?? null,
    chartValue
  );
  return {
    id: segment.key,
    title: chartValue?.className ?? classMeta?.name ?? "Range",
    iconType: "icon-area-number",
    iconFill: segment.color ?? classMeta?.color,
    attributes: sourceLabel ? buildAttributeRows(sourceLabel) : [],
    selected: false,
    kind: "segment",
    policyId: segment.policyId ?? null,
    classificationValue: chartValue ?? null,
    segmentLabelIds: segment.labelIds,
    segmentTempIds: segment.tempIds,
    segmentStart: segment.start,
    segmentEnd: segment.end,
    segmentOpacity: segment.opacity,
    segmentZIndex: segment.zindex,
  };
};

const isSegmentLabel = (label: LabelRowSource): boolean => {
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

function WorkspaceNumberLabelList({ policies }: WorkspaceNumberLabelListProps) {
  const { request: labelSearchRequest } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(labelSearchRequest);
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const chartAxisSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.chartAxisSnapshot
  );
  const classificationLabels = useLabelBatchStore(
    (state) => state.classificationLabels
  );
  const addClassificationLabel = useLabelBatchStore(
    (state) => state.addClassificationLabel
  );
  const removeClassificationLabelById = useLabelBatchStore(
    (state) => state.removeClassificationLabelById
  );
  const removeClassificationLabel = useLabelBatchStore(
    (state) => state.removeClassificationLabel
  );
  const classificationDeletedIds = useLabelBatchStore(
    (state) => state.classificationDeletedIds
  );
  const committedClassificationDeletedIds = useLabelBatchStore(
    (state) => state.committedClassificationDeletedIds
  );
  const trimClassificationDeletes = useLabelBatchStore(
    (state) => state.trimClassificationDeletes
  );
  const trimCommittedClassificationDeletes = useLabelBatchStore(
    (state) => state.trimCommittedClassificationDeletes
  );
  const hiddenClassificationIds = useLabelVisibilityStore(
    (state) => state.hiddenClassificationIds
  );
  const setClassificationVisibility = useLabelVisibilityStore(
    (state) => state.setClassificationVisibility
  );
  const hiddenSegmentIds = useNumberLabelUiStore(
    (state) => state.hiddenSegmentIds
  );
  const lockedLabelIds = useNumberLabelUiStore((state) => state.lockedLabelIds);
  const setSegmentVisibility = useNumberLabelUiStore(
    (state) => state.setSegmentVisibility
  );
  const setLabelLock = useNumberLabelUiStore((state) => state.setLabelLock);
  const pruneLabelState = useNumberLabelUiStore(
    (state) => state.pruneLabelState
  );
  const selectedClassificationId = useLabelSelectionStore(
    (state) => state.selectedClassificationId
  );
  const setSelectedClassificationId = useLabelSelectionStore(
    (state) => state.setSelectedClassificationId
  );
  const selectedSegment = useNumberSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const setSelectedSegment = useNumberSegmentSelectionStore(
    (state) => state.setSelectedSegment
  );
  const openAttributeEditor = useWorkspaceAttributeEditorStore(
    (state) => state.open
  );

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

  const segmentSources = useMemo<NumberSegmentSource[]>(() => {
    const sources = new Map<string, NumberSegmentSource>();
    const fallbackSources: NumberSegmentSource[] = [];
    const list = labelSearchQuery.data?.list ?? [];
    list.forEach((label) => {
      if (!isSegmentLabel(label)) {
        return;
      }
      if (label.id && deletedClassificationSet.has(label.id)) {
        return;
      }
      if (contentSetId && label.contentSetId !== contentSetId) {
        return;
      }
      if (label.id) {
        sources.set(label.id, { label });
        return;
      }
      fallbackSources.push({ label });
    });
    classificationLabels.forEach((entry) => {
      if (!isSegmentLabel(entry.label)) {
        return;
      }
      if (entry.label.id && deletedClassificationSet.has(entry.label.id)) {
        return;
      }
      if (contentSetId && entry.label.contentSetId !== contentSetId) {
        return;
      }
      const key = entry.label.id ?? entry.tempId;
      if (key) {
        sources.set(key, {
          label: entry.label,
          tempId: entry.tempId,
          color: entry.color,
        });
        return;
      }
      fallbackSources.push({
        label: entry.label,
        tempId: entry.tempId,
        color: entry.color,
      });
    });
    return [...sources.values(), ...fallbackSources];
  }, [
    classificationLabels,
    contentSetId,
    deletedClassificationSet,
    labelSearchQuery.data?.list,
  ]);

  const segmentGroups = useMemo(
    () => buildNumberSegmentGroups(segmentSources, chartAxisSnapshot),
    [chartAxisSnapshot, segmentSources]
  );

  const segmentLabelLookup = useMemo(() => {
    const map = new Map<string, NumberSegmentSource[]>();
    segmentGroups.forEach((segment) => {
      map.set(segment.key, segment.sources);
    });
    return map;
  }, [segmentGroups]);

  useEffect(() => {
    if (!labelSearchQuery.data?.list) {
      return;
    }
    const serverIds = new Set(
      labelSearchQuery.data.list
        .map((label) => label.id)
        .filter((id): id is string => Boolean(id))
    );
    trimClassificationDeletes(serverIds);
    trimCommittedClassificationDeletes(serverIds);
  }, [
    labelSearchQuery.data?.list,
    trimClassificationDeletes,
    trimCommittedClassificationDeletes,
  ]);

  useEffect(() => {
    if (!labelSearchQuery.data?.list?.length) {
      return;
    }
    const serverClassificationIds = new Set(
      labelSearchQuery.data.list
        .filter(
          (label) =>
            label.inferenceType === "CLASSIFICATION" &&
            typeof label.id === "string"
        )
        .map((label) => label.id as string)
    );
    serverClassificationIds.forEach((id) => {
      if (hiddenClassificationIds[id] && !deletedClassificationSet.has(id)) {
        setClassificationVisibility(id, false);
      }
    });
  }, [
    deletedClassificationSet,
    hiddenClassificationIds,
    labelSearchQuery.data?.list,
    setClassificationVisibility,
  ]);

  const localClassificationTempIds = useMemo(() => {
    const next = new Set<string>();
    classificationLabels.forEach((entry) => {
      if (!entry.label.id && !isSegmentLabel(entry.label)) {
        next.add(entry.tempId);
      }
    });
    return next;
  }, [classificationLabels]);

  const labelRows = useMemo<NumberLabelRow[]>(() => {
    const list = labelSearchQuery.data?.list ?? [];
    const classificationMap = new Map<string, NumberLabelRow>();

    list.forEach((label) => {
      if (label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if ((label.labelType ?? "").toUpperCase() !== "TABLE") {
        return;
      }
      if (isSegmentLabel(label)) {
        return;
      }
      if (label.id && deletedClassificationSet.has(label.id)) {
        return;
      }
      if (contentSetId && label.contentSetId !== contentSetId) {
        return;
      }
      if (!label.id) {
        return;
      }
      const row = buildClassificationRow(label, policies, label.id);
      const classificationKey =
        getClassificationKey(label, row.classificationValue ?? undefined) ??
        row.id;
      classificationMap.set(classificationKey, row);
    });

    classificationLabels.forEach((entry) => {
      if (entry.label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if ((entry.label.labelType ?? "").toUpperCase() !== "TABLE") {
        return;
      }
      if (isSegmentLabel(entry.label)) {
        return;
      }
      if (entry.label.id && deletedClassificationSet.has(entry.label.id)) {
        return;
      }
      if (contentSetId && entry.label.contentSetId !== contentSetId) {
        return;
      }
      const rowId = entry.label.id ?? entry.tempId;
      const row = buildClassificationRow(entry.label, policies, rowId, {
        tempId: entry.tempId,
        fallbackColor: entry.color,
      });
      const classificationKey =
        getClassificationKey(
          entry.label,
          row.classificationValue ?? undefined
        ) ?? rowId;
      classificationMap.set(classificationKey, row);
    });

    const classificationRows = Array.from(classificationMap.values()).map(
      (row) => ({
        ...row,
        selected: row.id === selectedClassificationId,
      })
    );

    const getSegmentPriority = (row: NumberLabelRow) =>
      typeof row.segmentZIndex === "number" &&
      Number.isFinite(row.segmentZIndex)
        ? row.segmentZIndex
        : 0;
    const segmentRows = segmentGroups
      .map((segment) => {
        const row = buildSegmentRow(segment, policies);
        return {
          ...row,
          selected: row.id === selectedSegment?.key,
        };
      })
      .sort((a, b) => {
        const priorityDiff = getSegmentPriority(b) - getSegmentPriority(a);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        if ((a.segmentStart ?? 0) !== (b.segmentStart ?? 0)) {
          return (a.segmentStart ?? 0) - (b.segmentStart ?? 0);
        }
        if ((a.segmentEnd ?? 0) !== (b.segmentEnd ?? 0)) {
          return (a.segmentEnd ?? 0) - (b.segmentEnd ?? 0);
        }
        return a.id.localeCompare(b.id);
      });

    return [...classificationRows, ...segmentRows];
  }, [
    classificationLabels,
    contentSetId,
    deletedClassificationSet,
    labelSearchQuery.data?.list,
    policies,
    segmentGroups,
    selectedSegment?.key,
    selectedClassificationId,
  ]);

  const [orderedRows, setOrderedRows] = useState<NumberLabelRow[]>(labelRows);

  useEffect(() => {
    setOrderedRows((prev) => {
      if (!prev.length) {
        return labelRows;
      }
      const prevIds = new Set(prev.map((row) => row.id));
      const nextIds = new Set(labelRows.map((row) => row.id));
      const isSameSize = prevIds.size === nextIds.size;
      const hasSameIds =
        isSameSize && Array.from(prevIds).every((id) => nextIds.has(id));
      if (!hasSameIds) {
        return labelRows;
      }
      const lookup = new Map(labelRows.map((row) => [row.id, row]));
      return prev.map((row) => lookup.get(row.id) ?? row);
    });
  }, [labelRows]);

  useEffect(() => {
    const ids = new Set(orderedRows.map((row) => row.id));
    pruneLabelState(ids);
  }, [orderedRows, pruneLabelState]);

  useEffect(() => {
    if (!orderedRows.length) {
      if (selectedClassificationId) {
        setSelectedClassificationId(null);
      }
      return;
    }
    const rowIds = new Set(orderedRows.map((row) => row.id));
    if (selectedClassificationId && !rowIds.has(selectedClassificationId)) {
      setSelectedClassificationId(null);
    }
  }, [orderedRows, selectedClassificationId, setSelectedClassificationId]);

  const dragSourceIdRef = useRef<string | null>(null);
  const dragTargetIdRef = useRef<string | null>(null);

  const resetDragState = () => {
    dragSourceIdRef.current = null;
    dragTargetIdRef.current = null;
  };

  const applySegmentPriority = useCallback(
    (rows: NumberLabelRow[]) => {
      const segmentRows = rows.filter((row) => row.kind === "segment");
      if (!segmentRows.length) {
        return;
      }
      const total = segmentRows.length;
      segmentRows.forEach((row, index) => {
        const nextZIndex = total - index;
        if (row.segmentZIndex === nextZIndex) {
          return;
        }
        const sources = segmentLabelLookup.get(row.id);
        if (!sources?.length) {
          return;
        }
        sources.forEach((source) => {
          const label = source.label;
          const currentValue =
            (label.labelValue as ChartValue | undefined) ?? {};
          const updatedLabel: LabelInsertData & { id?: string } = {
            ...label,
            inferenceType: "CLASSIFICATION",
            labelType: "TABLE",
            labelValue: {
              ...currentValue,
              zindex: nextZIndex,
            },
          };
          addClassificationLabel(updatedLabel, {
            tempId: source.tempId,
            color: source.color,
          });
        });
      });
    },
    [addClassificationLabel, segmentLabelLookup]
  );

  const applyReorder = () => {
    const sourceId = dragSourceIdRef.current;
    const targetId = dragTargetIdRef.current;
    if (!sourceId || !targetId || sourceId === targetId) {
      resetDragState();
      return;
    }
    const next = [...orderedRows];
    const fromIndex = next.findIndex((row) => row.id === sourceId);
    const toIndex = next.findIndex((row) => row.id === targetId);
    if (fromIndex < 0 || toIndex < 0) {
      resetDragState();
      return;
    }
    const sourceRow = next[fromIndex];
    const targetRow = next[toIndex];
    if (sourceRow.kind !== "segment" || targetRow.kind !== "segment") {
      resetDragState();
      return;
    }
    if (lockedLabelIds[sourceId] || lockedLabelIds[targetId]) {
      resetDragState();
      return;
    }
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderedRows(next);
    applySegmentPriority(next);
    resetDragState();
  };

  const handleDragStart = (
    event: ReactDragEvent<HTMLDivElement>,
    row: NumberLabelRow
  ) => {
    if (row.kind !== "segment") {
      event.preventDefault();
      return;
    }
    if (lockedLabelIds[row.id] || hiddenSegmentIds[row.id]) {
      event.preventDefault();
      return;
    }
    dragSourceIdRef.current = row.id;
    event.dataTransfer?.setData("text/plain", row.id);
  };

  const handleDragOver = (
    event: ReactDragEvent<HTMLDivElement>,
    row: NumberLabelRow
  ) => {
    if (row.kind !== "segment") {
      return;
    }
    if (dragSourceIdRef.current === null) {
      return;
    }
    if (lockedLabelIds[row.id] || hiddenSegmentIds[row.id]) {
      return;
    }
    event.preventDefault();
    dragTargetIdRef.current = row.id;
  };

  const handleDrop = (
    event: ReactDragEvent<HTMLDivElement>,
    row: NumberLabelRow
  ) => {
    if (row.kind !== "segment") {
      resetDragState();
      return;
    }
    if (lockedLabelIds[row.id] || hiddenSegmentIds[row.id]) {
      resetDragState();
      return;
    }
    event.preventDefault();
    dragTargetIdRef.current = row.id;
    applyReorder();
  };

  const handleDragEnd = () => {
    resetDragState();
  };

  const handleRemoveSelectedClassification = useCallback(() => {
    if (!selectedClassificationId) {
      return;
    }
    const targetRow = orderedRows.find(
      (row) => row.id === selectedClassificationId
    );
    if (!targetRow || targetRow.kind !== "classification") {
      return;
    }
    setClassificationVisibility(targetRow.id, true);
    if (localClassificationTempIds.has(targetRow.id)) {
      removeClassificationLabel(targetRow.id);
    } else {
      removeClassificationLabelById(targetRow.id);
    }
    setOrderedRows((prev) => prev.filter((row) => row.id !== targetRow.id));
    setSelectedClassificationId(null);
  }, [
    localClassificationTempIds,
    orderedRows,
    removeClassificationLabel,
    removeClassificationLabelById,
    selectedClassificationId,
    setClassificationVisibility,
    setSelectedClassificationId,
  ]);

  useEffect(() => {
    const shouldIgnore = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false;
      }
      const tagName = target.tagName.toLowerCase();
      return (
        target.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      );
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnore(event.target)) {
        return;
      }
      if (event.key === "Escape") {
        if (selectedClassificationId) {
          setSelectedClassificationId(null);
          event.preventDefault();
        }
        return;
      }
      if (event.key !== "Backspace" && event.key !== "Delete") {
        return;
      }
      if (!selectedClassificationId) {
        return;
      }
      handleRemoveSelectedClassification();
      event.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    handleRemoveSelectedClassification,
    selectedClassificationId,
    setSelectedClassificationId,
  ]);

  const handleToggleVisibility = useCallback(
    (label: NumberLabelRow) => {
      if (lockedLabelIds[label.id]) {
        return;
      }
      if (label.kind === "classification") {
        const classificationHidden = Boolean(hiddenClassificationIds[label.id]);
        setClassificationVisibility(label.id, !classificationHidden);
        return;
      }
      const segmentHidden = Boolean(hiddenSegmentIds[label.id]);
      setSegmentVisibility(label.id, !segmentHidden);
    },
    [
      hiddenClassificationIds,
      hiddenSegmentIds,
      lockedLabelIds,
      setClassificationVisibility,
      setSegmentVisibility,
    ]
  );

  const handleToggleLock = useCallback(
    (label: NumberLabelRow) => {
      const nextLocked = !lockedLabelIds[label.id];
      setLabelLock(label.id, nextLocked);
    },
    [lockedLabelIds, setLabelLock]
  );

  const resolveAttributeTargets = useCallback(
    (label: NumberLabelRow) => {
      if (label.kind === "classification") {
        const tempId = label.classificationTempId ?? null;
        const labelId = label.classificationLabelId ?? label.id;
        const entry = classificationLabels.find((item) => {
          if (tempId && item.tempId === tempId) {
            return true;
          }
          if (labelId && item.label.id === labelId) {
            return true;
          }
          return false;
        });
        if (entry) {
          return [
            {
              id: label.id,
              label: entry.label,
              tempId: entry.tempId,
            },
          ];
        }
        const serverLabel = (labelSearchQuery.data?.list ?? []).find(
          (item) => item.id === labelId
        );
        if (serverLabel) {
          return [
            {
              id: label.id,
              label: serverLabel,
            },
          ];
        }
        return null;
      }
      const sources = segmentLabelLookup.get(label.id) ?? [];
      if (!sources.length) {
        return null;
      }
      const targets = new Map<
        string,
        {
          id: string;
          label: LabelRowSource;
          tempId?: string;
        }
      >();
      sources.forEach((source) => {
        const labelId = source.label.id ?? source.tempId;
        if (!labelId) {
          return;
        }
        targets.set(labelId, {
          id: labelId,
          label: source.label,
          tempId: source.tempId,
        });
      });
      if (!targets.size) {
        return null;
      }
      return Array.from(targets.values());
    },
    [classificationLabels, labelSearchQuery.data?.list, segmentLabelLookup]
  );

  const handleOpenAttributeEditor = useCallback(
    (label: NumberLabelRow) => {
      const targets = resolveAttributeTargets(label);
      if (!targets?.length) {
        return;
      }
      openAttributeEditor(targets);
    },
    [openAttributeEditor, resolveAttributeTargets]
  );

  return (
    <Wrapper className="label-list" direction="vertical" gapSize="0.25rem">
      {orderedRows.map((label, index) => {
        const displayIndex = index + 1;
        const isLocked = Boolean(lockedLabelIds[label.id]);
        const classificationHidden =
          label.kind === "classification"
            ? Boolean(hiddenClassificationIds[label.id])
            : false;
        const segmentHidden =
          label.kind === "segment"
            ? Boolean(hiddenSegmentIds[label.id])
            : false;
        const isHidden = classificationHidden || segmentHidden;
        const canDrag = label.kind === "segment" && !isLocked && !isHidden;
        const hasAttributes = label.attributes.length > 0;
        const canEditAttributes = !isLocked;

        return (
          <Wrapper
            key={label.id}
            direction="vertical"
            className={`label-wrapper ${label.selected ? "selected" : ""}`}
            isFull
            draggable={canDrag}
            onDragStart={(event) => handleDragStart(event, label)}
            onDragOver={(event) => handleDragOver(event, label)}
            onDrop={(event) => handleDrop(event, label)}
            onDragEnd={handleDragEnd}
            style={{
              opacity: isHidden ? 0.4 : 1,
            }}
          >
            <Wrapper
              justify="between"
              className="label"
              isFull
              onClick={() => {
                if (isLocked) {
                  return;
                }
                if (label.kind === "classification") {
                  setSelectedClassificationId(label.id, {
                    policyId: label.policyId ?? null,
                    classIndex: label.classificationValue?.classIndex ?? null,
                    className: label.classificationValue?.className ?? null,
                    labelId: label.classificationLabelId ?? null,
                    tempId: label.classificationTempId ?? null,
                    isCanvasFocused: false,
                  });
                  return;
                }
                setSelectedClassificationId(null);
                if (
                  typeof label.segmentStart !== "number" ||
                  typeof label.segmentEnd !== "number"
                ) {
                  setSelectedSegment(null);
                  return;
                }
                const classificationValue = label.classificationValue ?? null;
                setSelectedSegment({
                  key: label.id,
                  labelIds: label.segmentLabelIds ?? [],
                  tempIds: label.segmentTempIds ?? [],
                  start: label.segmentStart,
                  end: label.segmentEnd,
                  color: label.iconFill,
                  opacity: label.segmentOpacity,
                  zindex: label.segmentZIndex,
                  policyId: label.policyId ?? null,
                  classIndex: classificationValue?.classIndex,
                  className: classificationValue?.className,
                  columnName: classificationValue?.columnName,
                });
              }}
            >
              <Wrapper className="label-item" align="center" gapSize="0.5rem">
                <Button
                  size="sm"
                  style="transparent"
                  disabled={!canDrag}
                  aria-label="Reorder label"
                >
                  <Icon iconType="icon-drag" size="xs" />
                </Button>
                <p className="label__index">{displayIndex}</p>
                <Icon iconType={label.iconType} fill={label.iconFill} />
                <p className="label__title">{label.title}</p>
              </Wrapper>
              <Wrapper className="label-util" gapSize="0.25rem">
                <Button
                  size="sm"
                  style="transparent"
                  disabled={!canEditAttributes}
                  aria-label="Edit attributes"
                  onClick={() => handleOpenAttributeEditor(label)}
                >
                  <Icon iconType="icon-edit" size="xs" />
                </Button>
                <Button
                  size="sm"
                  style="transparent"
                  disabled={isLocked && label.kind === "segment"}
                  aria-pressed={isHidden}
                  aria-label={isHidden ? "Show label" : "Hide label"}
                  onClick={() => handleToggleVisibility(label)}
                >
                  <Icon iconType="icon-view" size="xs" />
                </Button>
                <Button
                  size="sm"
                  style="transparent"
                  aria-pressed={isLocked}
                  aria-label={isLocked ? "Unlock label" : "Lock label"}
                  onClick={() => handleToggleLock(label)}
                >
                  <Icon
                    iconType={isLocked ? "icon-lock" : "icon-unlock"}
                    size="xs"
                  />
                </Button>
              </Wrapper>
            </Wrapper>
            {hasAttributes && (
              <Wrapper className="attribute-list" gapSize="0.25rem" isWrap>
                {label.attributes.map((attribute, idx) => (
                  <Wrapper
                    key={`${label.id}-attribute-${idx}`}
                    className="attribute-item"
                    isBordered
                    isRounded
                    gapSize="0.25rem"
                  >
                    <p className="attribute__title">{attribute.title}</p>
                    <p className="attribute__value">
                      {attribute.value || "—"}
                    </p>
                  </Wrapper>
                ))}
              </Wrapper>
            )}
          </Wrapper>
        );
      })}
    </Wrapper>
  );
}

export default WorkspaceNumberLabelList;
