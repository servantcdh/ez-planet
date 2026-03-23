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
import { useTextLabelUiStore } from "../store/textLabelUi.store";
import { useTextSegmentSelectionStore } from "../store/textSegmentSelection.store";
import { useWorkspaceAttributeEditorStore } from "../store/workspaceAttributeEditor.store";
import type {
  ClassificationValue,
  LabelDetailResponse,
  LabelInsertData,
  RecognitionValue,
} from "../types/domain";

interface WorkspaceTextLabelListProps {
  policies: PolicyDetail[];
}

interface LabelAttributeRow {
  title: string;
  value: string;
}

type LabelRowSource = LabelDetailResponse | (LabelInsertData & { id?: string });

type TextLabelKind = "classification" | "recognition";

interface TextLabelRow {
  id: string;
  title: string;
  iconType: "icon-classification" | "icon-area-text";
  iconFill?: string;
  attributes: LabelAttributeRow[];
  selected: boolean;
  kind: TextLabelKind;
  policyId?: string | null;
  classificationValue?: ClassificationValue | null;
  classificationLabelId?: string | null;
  classificationTempId?: string | null;
  recognitionStart?: number;
  recognitionEnd?: number;
  recognitionText?: string;
  recognitionLabelId?: string | null;
  recognitionTempId?: string | null;
  recognitionOpacity?: number;
  recognitionZIndex?: number;
}

function resolvePolicyClassMeta(
  policies: PolicyDetail[],
  policyId: string | null | undefined,
  value: ClassificationValue | undefined
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
  policyId: string | undefined,
  value: ClassificationValue | undefined
): string | null => {
  const policyKey = policyId ?? "";
  const classIndex =
    typeof value?.classIndex === "number" ? `idx-${value.classIndex}` : null;
  const className = value?.className ? `name-${value.className}` : null;
  const keyPart = classIndex ?? className;
  if (!keyPart) {
    return null;
  }
  return `${policyKey}::${keyPart}`;
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

const normalizeRecognitionRange = (value: RecognitionValue | undefined) => {
  const start =
    typeof value?.start === "number" && Number.isFinite(value.start)
      ? Math.max(0, Math.floor(value.start))
      : null;
  const end =
    typeof value?.end === "number" && Number.isFinite(value.end)
      ? Math.max(0, Math.floor(value.end))
      : null;
  if (start === null || end === null || end <= start) {
    return null;
  }
  return { start, end };
};

const normalizeRecognitionZIndex = (
  value: RecognitionValue | undefined
): number | undefined => {
  if (typeof value?.zindex !== "number") {
    return undefined;
  }
  if (!Number.isFinite(value.zindex)) {
    return undefined;
  }
  return value.zindex;
};

const buildClassificationRow = (
  label: LabelRowSource,
  policies: PolicyDetail[],
  rowId: string,
  options?: { tempId?: string; fallbackColor?: string }
): TextLabelRow => {
  const classificationValue = label.labelValue as
    | ClassificationValue
    | undefined;
  const classMeta = resolvePolicyClassMeta(
    policies,
    label.policyId ?? null,
    classificationValue
  );
  return {
    id: rowId,
    title:
      classMeta?.name ?? classificationValue?.className ?? "Classification",
    iconType: "icon-classification",
    iconFill: classMeta?.color ?? options?.fallbackColor,
    attributes: buildAttributeRows(label),
    selected: false,
    kind: "classification",
    policyId: label.policyId ?? null,
    classificationValue: classificationValue ?? null,
    classificationLabelId: label.id ?? null,
    classificationTempId: options?.tempId ?? (label.id ? null : rowId),
  };
};

const buildRecognitionRow = (
  label: LabelRowSource,
  policies: PolicyDetail[],
  rowId: string,
  options?: { tempId?: string; fallbackColor?: string }
): TextLabelRow | null => {
  const recognitionValue = label.labelValue as RecognitionValue | undefined;
  const range = normalizeRecognitionRange(recognitionValue);
  if (!range) {
    return null;
  }
  const zindex = normalizeRecognitionZIndex(recognitionValue);
  const classMeta = resolvePolicyClassMeta(
    policies,
    label.policyId ?? null,
    recognitionValue
  );
  const iconFill =
    recognitionValue?.color ?? options?.fallbackColor ?? classMeta?.color;
  return {
    id: rowId,
    title: recognitionValue?.className ?? classMeta?.name ?? "Text",
    iconType: "icon-area-text",
    iconFill,
    attributes: buildAttributeRows(label),
    selected: false,
    kind: "recognition",
    policyId: label.policyId ?? null,
    recognitionStart: range.start,
    recognitionEnd: range.end,
    recognitionText: recognitionValue?.text ?? "",
    recognitionLabelId: label.id ?? null,
    recognitionTempId: options?.tempId ?? label.id ?? rowId,
    recognitionOpacity:
      typeof recognitionValue?.opacity === "number" &&
      Number.isFinite(recognitionValue.opacity)
        ? recognitionValue.opacity
        : undefined,
    recognitionZIndex: zindex,
  };
};

function WorkspaceTextLabelList({ policies }: WorkspaceTextLabelListProps) {
  const { request: labelSearchRequest } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(labelSearchRequest);
  const classificationLabels = useLabelBatchStore(
    (state) => state.classificationLabels
  );
  const recognitionLabels = useLabelBatchStore(
    (state) => state.recognitionLabels
  );
  const addRecognitionLabel = useLabelBatchStore(
    (state) => state.addRecognitionLabel
  );
  const classificationDeletedIds = useLabelBatchStore(
    (state) => state.classificationDeletedIds
  );
  const committedClassificationDeletedIds = useLabelBatchStore(
    (state) => state.committedClassificationDeletedIds
  );
  const recognitionDeletedIds = useLabelBatchStore(
    (state) => state.recognitionDeletedIds
  );
  const committedRecognitionDeletedIds = useLabelBatchStore(
    (state) => state.committedRecognitionDeletedIds
  );
  const removeClassificationLabel = useLabelBatchStore(
    (state) => state.removeClassificationLabel
  );
  const removeClassificationLabelById = useLabelBatchStore(
    (state) => state.removeClassificationLabelById
  );
  const trimClassificationDeletes = useLabelBatchStore(
    (state) => state.trimClassificationDeletes
  );
  const trimCommittedClassificationDeletes = useLabelBatchStore(
    (state) => state.trimCommittedClassificationDeletes
  );
  const trimRecognitionDeletes = useLabelBatchStore(
    (state) => state.trimRecognitionDeletes
  );
  const trimCommittedRecognitionDeletes = useLabelBatchStore(
    (state) => state.trimCommittedRecognitionDeletes
  );
  const hiddenClassificationIds = useLabelVisibilityStore(
    (state) => state.hiddenClassificationIds
  );
  const setClassificationVisibility = useLabelVisibilityStore(
    (state) => state.setClassificationVisibility
  );
  const hiddenRecognitionIds = useTextLabelUiStore(
    (state) => state.hiddenRecognitionIds
  );
  const lockedLabelIds = useTextLabelUiStore((state) => state.lockedLabelIds);
  const setRecognitionVisibility = useTextLabelUiStore(
    (state) => state.setRecognitionVisibility
  );
  const setLabelLock = useTextLabelUiStore((state) => state.setLabelLock);
  const pruneLabelState = useTextLabelUiStore((state) => state.pruneLabelState);
  const selectedClassificationId = useLabelSelectionStore(
    (state) => state.selectedClassificationId
  );
  const setSelectedClassificationId = useLabelSelectionStore(
    (state) => state.setSelectedClassificationId
  );
  const selectedSegment = useTextSegmentSelectionStore(
    (state) => state.selectedSegment
  );
  const setSelectedSegment = useTextSegmentSelectionStore(
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
  const deletedRecognitionSet = useMemo(
    () =>
      new Set(
        [...recognitionDeletedIds, ...committedRecognitionDeletedIds].filter(
          (id): id is string => typeof id === "string" && id.length > 0
        )
      ),
    [committedRecognitionDeletedIds, recognitionDeletedIds]
  );

  const recognitionLabelLookup = useMemo(() => {
    const map = new Map<
      string,
      { label: LabelRowSource; tempId?: string; color?: string }
    >();
    const list = labelSearchQuery.data?.list ?? [];
    list.forEach((label) => {
      if (label.inferenceType !== "RECOGNITION") {
        return;
      }
      if (label.id && deletedRecognitionSet.has(label.id)) {
        return;
      }
      map.set(label.id, { label });
    });
    recognitionLabels.forEach((entry) => {
      if (entry.label.inferenceType !== "RECOGNITION") {
        return;
      }
      if (entry.label.id && deletedRecognitionSet.has(entry.label.id)) {
        return;
      }
      const key = entry.label.id ?? entry.tempId;
      if (!key) {
        return;
      }
      map.set(key, {
        label: entry.label,
        tempId: entry.tempId,
        color: entry.color,
      });
    });
    return map;
  }, [deletedRecognitionSet, labelSearchQuery.data?.list, recognitionLabels]);

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
    if (!labelSearchQuery.data?.list) {
      return;
    }
    const serverIds = new Set(
      labelSearchQuery.data.list
        .map((label) => label.id)
        .filter((id): id is string => Boolean(id))
    );
    trimRecognitionDeletes(serverIds);
    trimCommittedRecognitionDeletes(serverIds);
  }, [
    labelSearchQuery.data?.list,
    trimCommittedRecognitionDeletes,
    trimRecognitionDeletes,
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
      if (!entry.label.id) {
        next.add(entry.tempId);
      }
    });
    return next;
  }, [classificationLabels]);

  const labelRows = useMemo<TextLabelRow[]>(() => {
    const list = labelSearchQuery.data?.list ?? [];
    const classificationMap = new Map<string, TextLabelRow>();

    list.forEach((label) => {
      if (label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if (label.id && deletedClassificationSet.has(label.id)) {
        return;
      }
      const row = buildClassificationRow(label, policies, label.id);
      const classificationKey =
        getClassificationKey(
          label.policyId ?? undefined,
          row.classificationValue ?? undefined
        ) ?? row.id;
      classificationMap.set(classificationKey, row);
    });

    classificationLabels.forEach((entry) => {
      if (entry.label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if (entry.label.id && deletedClassificationSet.has(entry.label.id)) {
        return;
      }
      const rowId = entry.label.id ?? entry.tempId;
      const row = buildClassificationRow(entry.label, policies, rowId, {
        tempId: entry.tempId,
        fallbackColor: entry.color,
      });
      const classificationKey =
        getClassificationKey(
          entry.label.policyId ?? undefined,
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

    const recognitionMap = new Map<string, TextLabelRow>();
    list.forEach((label) => {
      if (label.inferenceType !== "RECOGNITION") {
        return;
      }
      if (label.id && deletedRecognitionSet.has(label.id)) {
        return;
      }
      const row = buildRecognitionRow(label, policies, label.id);
      if (!row) {
        return;
      }
      recognitionMap.set(row.id, row);
    });

    recognitionLabels.forEach((entry) => {
      if (entry.label.inferenceType !== "RECOGNITION") {
        return;
      }
      if (entry.label.id && deletedRecognitionSet.has(entry.label.id)) {
        return;
      }
      const rowId = entry.label.id ?? entry.tempId;
      const row = buildRecognitionRow(entry.label, policies, rowId, {
        tempId: entry.tempId,
        fallbackColor: entry.color,
      });
      if (!row) {
        return;
      }
      recognitionMap.set(row.id, row);
    });

    const getRecognitionPriority = (row: TextLabelRow) =>
      typeof row.recognitionZIndex === "number" &&
      Number.isFinite(row.recognitionZIndex)
        ? row.recognitionZIndex
        : 0;
    const recognitionRows = Array.from(recognitionMap.values())
      .sort((a, b) => {
        const priorityDiff =
          getRecognitionPriority(b) - getRecognitionPriority(a);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        if ((a.recognitionStart ?? 0) !== (b.recognitionStart ?? 0)) {
          return (a.recognitionStart ?? 0) - (b.recognitionStart ?? 0);
        }
        if ((a.recognitionEnd ?? 0) !== (b.recognitionEnd ?? 0)) {
          return (a.recognitionEnd ?? 0) - (b.recognitionEnd ?? 0);
        }
        return a.id.localeCompare(b.id);
      })
      .map((row) => ({
        ...row,
        selected: row.id === selectedSegment?.key,
      }));

    return [...classificationRows, ...recognitionRows];
  }, [
    classificationLabels,
    deletedClassificationSet,
    deletedRecognitionSet,
    labelSearchQuery.data?.list,
    policies,
    recognitionLabels,
    selectedClassificationId,
    selectedSegment?.key,
  ]);

  const [orderedRows, setOrderedRows] = useState<TextLabelRow[]>(labelRows);

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

  const applyRecognitionPriority = useCallback(
    (rows: TextLabelRow[]) => {
      const recognitionRows = rows.filter((row) => row.kind === "recognition");
      if (!recognitionRows.length) {
        return;
      }
      const total = recognitionRows.length;
      recognitionRows.forEach((row, index) => {
        const nextZIndex = total - index;
        if (row.recognitionZIndex === nextZIndex) {
          return;
        }
        const lookup = recognitionLabelLookup.get(row.id);
        if (!lookup) {
          return;
        }
        const label = lookup.label;
        const currentValue =
          (label.labelValue as RecognitionValue | undefined) ?? {};
        const updatedLabel: LabelInsertData & { id?: string } = {
          ...label,
          inferenceType: "RECOGNITION",
          labelType: undefined,
          labelValue: {
            ...currentValue,
            zindex: nextZIndex,
          },
        };
        addRecognitionLabel(updatedLabel, {
          tempId: lookup.tempId,
          color: lookup.color,
        });
      });
    },
    [addRecognitionLabel, recognitionLabelLookup]
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
    if (sourceRow.kind !== "recognition" || targetRow.kind !== "recognition") {
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
    applyRecognitionPriority(next);
    resetDragState();
  };

  const handleDragStart = (
    event: ReactDragEvent<HTMLDivElement>,
    row: TextLabelRow
  ) => {
    if (row.kind !== "recognition") {
      event.preventDefault();
      return;
    }
    if (lockedLabelIds[row.id] || hiddenRecognitionIds[row.id]) {
      event.preventDefault();
      return;
    }
    dragSourceIdRef.current = row.id;
    event.dataTransfer?.setData("text/plain", row.id);
  };

  const handleDragOver = (
    event: ReactDragEvent<HTMLDivElement>,
    row: TextLabelRow
  ) => {
    if (row.kind !== "recognition") {
      return;
    }
    if (dragSourceIdRef.current === null) {
      return;
    }
    if (lockedLabelIds[row.id] || hiddenRecognitionIds[row.id]) {
      return;
    }
    event.preventDefault();
    dragTargetIdRef.current = row.id;
  };

  const handleDrop = (
    event: ReactDragEvent<HTMLDivElement>,
    row: TextLabelRow
  ) => {
    if (row.kind !== "recognition") {
      resetDragState();
      return;
    }
    if (lockedLabelIds[row.id] || hiddenRecognitionIds[row.id]) {
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
    (label: TextLabelRow) => {
      if (lockedLabelIds[label.id]) {
        return;
      }
      if (label.kind === "classification") {
        const classificationHidden = Boolean(hiddenClassificationIds[label.id]);
        setClassificationVisibility(label.id, !classificationHidden);
        return;
      }
      const recognitionHidden = Boolean(hiddenRecognitionIds[label.id]);
      setRecognitionVisibility(label.id, !recognitionHidden);
    },
    [
      hiddenClassificationIds,
      hiddenRecognitionIds,
      lockedLabelIds,
      setClassificationVisibility,
      setRecognitionVisibility,
    ]
  );

  const handleToggleLock = useCallback(
    (label: TextLabelRow) => {
      const nextLocked = !lockedLabelIds[label.id];
      setLabelLock(label.id, nextLocked);
    },
    [lockedLabelIds, setLabelLock]
  );

  const resolveAttributeTarget = useCallback(
    (label: TextLabelRow) => {
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
          return {
            id: label.id,
            label: entry.label,
            tempId: entry.tempId,
          };
        }
        const serverLabel = (labelSearchQuery.data?.list ?? []).find(
          (item) => item.id === labelId
        );
        if (serverLabel) {
          return {
            id: label.id,
            label: serverLabel,
          };
        }
        return null;
      }
      const recognitionEntry = recognitionLabelLookup.get(label.id);
      if (recognitionEntry) {
        return {
          id: label.id,
          label: recognitionEntry.label,
          tempId: recognitionEntry.tempId,
        };
      }
      return null;
    },
    [classificationLabels, labelSearchQuery.data?.list, recognitionLabelLookup]
  );

  const handleOpenAttributeEditor = useCallback(
    (label: TextLabelRow) => {
      const target = resolveAttributeTarget(label);
      if (!target) {
        return;
      }
      openAttributeEditor([target]);
    },
    [openAttributeEditor, resolveAttributeTarget]
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
        const recognitionHidden =
          label.kind === "recognition"
            ? Boolean(hiddenRecognitionIds[label.id])
            : false;
        const isHidden = classificationHidden || recognitionHidden;
        const canDrag = label.kind === "recognition" && !isLocked && !isHidden;
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
                if (
                  typeof label.recognitionStart !== "number" ||
                  typeof label.recognitionEnd !== "number"
                ) {
                  return;
                }
                setSelectedSegment({
                  key: label.id,
                  labelId: label.recognitionLabelId ?? null,
                  tempId: label.recognitionTempId ?? label.id,
                  start: label.recognitionStart,
                  end: label.recognitionEnd,
                  text: label.recognitionText ?? "",
                  color: label.iconFill,
                  opacity: label.recognitionOpacity,
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
                  disabled={isLocked && label.kind === "recognition"}
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

export default WorkspaceTextLabelList;
