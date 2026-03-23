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
import { useSelectedLabelObjectsStore } from "../store/selectedLabelObjects.store";
import { useWorkspaceAttributeEditorStore } from "../store/workspaceAttributeEditor.store";
import type {
  BoxValue,
  ClassificationValue,
  LabelDetailResponse,
  LabelInsertData,
  SegmentationResponseValue,
} from "../types/domain";
import { getCanvasInstance } from "../utils/imageLabelingCore";
import { emitLabelEvent } from "../utils/imageLabelingTools";
import type { LabeledFabricObject } from "../utils/imageLabelingTypes";

interface WorkspaceImageLabelListProps {
  policies: PolicyDetail[];
}

interface LabelAttributeRow {
  title: string;
  value: string;
}

interface ImageLabelRow {
  id: string;
  unique: string;
  title: string;
  iconType:
    | "icon-object-detection"
    | "icon-classification"
    | "icon-segmentation";
  iconFill?: string;
  attributes: LabelAttributeRow[];
  selected: boolean;
  isClassification: boolean;
  policyId?: string | null;
  classificationValue?: ClassificationValue | null;
  classificationLabelId?: string | null;
  classificationTempId?: string | null;
}

const pruneStateByRows = <T,>(
  source: Record<string, T>,
  ids: Set<string>
): Record<string, T> => {
  const next: Record<string, T> = {};
  Object.keys(source).forEach((key) => {
    if (ids.has(key)) {
      next[key] = source[key];
    }
  });
  return next;
};

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

function toClassificationRow(
  label: LabelDetailResponse,
  policies: PolicyDetail[],
  isSelected: boolean
): ImageLabelRow {
  const classificationValue = label.labelValue as
    | ClassificationValue
    | undefined;
  const classMeta = resolvePolicyClassMeta(
    policies,
    label.policyId ?? null,
    classificationValue
  );
  return {
    id: label.id,
    unique: label.id,
    title: classificationValue?.className ?? "Classification",
    iconType: "icon-classification",
    iconFill: classMeta?.color,
    attributes: buildAttributeRows(label),
    selected: isSelected,
    isClassification: true,
    policyId: label.policyId ?? null,
    classificationValue: classificationValue ?? null,
    classificationLabelId: label.id ?? null,
  };
}

function toBoxRow(
  label: LabelDetailResponse,
  isSelected: boolean,
  _sequence: number
): ImageLabelRow {
  const boxValue = label.labelValue as BoxValue | undefined;
  return {
    id: label.id,
    unique: label.id,
    title: boxValue?.className ?? "Object",
    iconType: "icon-object-detection",
    iconFill: boxValue?.lineColor ?? boxValue?.color,
    attributes: buildAttributeRows(label),
    selected: isSelected,
    isClassification: false,
  };
}

function toSegmentationRow(
  label: LabelDetailResponse,
  isSelected: boolean,
  _sequence: number
): ImageLabelRow {
  const segValue = label.labelValue as SegmentationResponseValue | undefined;
  return {
    id: label.id,
    unique: label.id,
    title: segValue?.className ?? "Segmentation",
    iconType: "icon-segmentation",
    iconFill: segValue?.segColor ?? segValue?.color,
    attributes: buildAttributeRows(label),
    selected: isSelected,
    isClassification: false,
  };
}

function buildAttributeRows(label: LabelDetailResponse): LabelAttributeRow[] {
  const attributes = label.attributeValues ?? [];
  if (!attributes.length) {
    return [];
  }
  return attributes.map((attribute) => ({
    title: attribute.name ?? attribute.attributeType ?? "Attribute",
    value: Array.isArray(attribute.values) ? attribute.values.join(", ") : "",
  }));
}

function mapLabelToRow(
  label: LabelDetailResponse,
  policies: PolicyDetail[],
  isSelected: boolean,
  index: number
): ImageLabelRow | null {
  switch (label.inferenceType) {
    case "CLASSIFICATION":
      return toClassificationRow(label, policies, isSelected);
    case "OBJECT_DETECTION":
      return toBoxRow(label, isSelected, index + 1);
    case "SEGMENTATION":
      return toSegmentationRow(label, isSelected, index + 1);
    default:
      return null;
  }
}

type LabelRowSource = LabelDetailResponse | (LabelInsertData & { id?: string });

function toLabelDetailResponse(
  label: LabelRowSource,
  fallbackId: string
): LabelDetailResponse {
  if ("labelContextId" in label) {
    return label;
  }
  return {
    id: label.id ?? fallbackId,
    labelContextId: "",
    policyId: label.policyId ?? "",
    inferenceType: label.inferenceType,
    labelValue: label.labelValue ?? undefined,
    attributeValues: label.attributeValues ?? [],
    contentSetId: label.contentSetId ?? undefined,
    elementId: label.elementId ?? undefined,
    labelType: label.labelType ?? undefined,
    unitType: label.unitType ?? undefined,
    contentId: undefined,
    isLabeled: undefined,
    organizationId: undefined,
    accountId: undefined,
    zoneId: undefined,
    userId: undefined,
    autoLabelingInfo: undefined,
    modifiedBy: undefined,
    modifiedDate: undefined,
    createdBy: undefined,
    createdDate: undefined,
  };
}

function WorkspaceImageLabelList({ policies }: WorkspaceImageLabelListProps) {
  const { request: labelSearchRequest } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(labelSearchRequest);
  const selectedObjects = useSelectedLabelObjectsStore(
    (state) => state.objects
  );
  const removeClassificationLabelById = useLabelBatchStore(
    (state) => state.removeClassificationLabelById
  );
  const removeClassificationLabel = useLabelBatchStore(
    (state) => state.removeClassificationLabel
  );
  const hiddenClassificationIds = useLabelVisibilityStore(
    (state) => state.hiddenClassificationIds
  );
  const setClassificationVisibility = useLabelVisibilityStore(
    (state) => state.setClassificationVisibility
  );
  const fabricEntries = useLabelBatchStore((state) => state.fabricEntries);
  const classificationLabels = useLabelBatchStore(
    (state) => state.classificationLabels
  );
  const committedClassificationDeletedIds = useLabelBatchStore(
    (state) => state.committedClassificationDeletedIds
  );
  const fabricDeletedIds = useLabelBatchStore(
    (state) => state.fabricDeletedIds
  );
  const classificationDeletedIds = useLabelBatchStore(
    (state) => state.classificationDeletedIds
  );
  const trimClassificationDeletes = useLabelBatchStore(
    (state) => state.trimClassificationDeletes
  );
  const trimCommittedClassificationDeletes = useLabelBatchStore(
    (state) => state.trimCommittedClassificationDeletes
  );
  const selectedClassificationId = useLabelSelectionStore(
    (state) => state.selectedClassificationId
  );
  const setSelectedClassificationId = useLabelSelectionStore(
    (state) => state.setSelectedClassificationId
  );
  const openAttributeEditor = useWorkspaceAttributeEditorStore(
    (state) => state.open
  );

  const selectedObjectMap = useMemo(() => {
    const map = new Map<string, boolean>();
    selectedObjects.forEach((object) => {
      if (object.unique) {
        map.set(object.unique, Boolean(object.selected));
      }
    });
    return map;
  }, [selectedObjects]);
  const deletedClassificationSet = useMemo(
    () =>
      new Set([
        ...classificationDeletedIds,
        ...committedClassificationDeletedIds,
      ]),
    [classificationDeletedIds, committedClassificationDeletedIds]
  );
  const deletedFabricIdSet = useMemo(
    () =>
      new Set(
        (fabricDeletedIds ?? []).filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0
        )
      ),
    [fabricDeletedIds]
  );

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

  // 서버에 존재하는 분류 라벨은 숨김 플래그를 해제해 뱃지/리스트가 다시 보이도록 복원.
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

  const labelRows = useMemo<ImageLabelRow[]>(() => {
    const list = labelSearchQuery.data?.list ?? [];
    const classificationMap = new Map<string, ImageLabelRow>();
    list.forEach((label) => {
      if (label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if (label.id && deletedClassificationSet.has(label.id)) {
        return;
      }
      const row = mapLabelToRow(label, policies, false, 0);
      if (row) {
        const classificationValueForKey = row.classificationValue ?? undefined;
        const key =
          getClassificationKey(
            label.policyId ?? undefined,
            classificationValueForKey
          ) ?? row.id;
        classificationMap.set(key, row);
      }
    });
    classificationLabels.forEach((entry) => {
      const detail = toLabelDetailResponse(entry.label, entry.tempId);
      const row = mapLabelToRow(detail, policies, false, 0);
      if (!row) {
        return;
      }
      const rowId = detail.id ?? entry.tempId;
      const classificationValue =
        (detail.labelValue as ClassificationValue | undefined) ?? undefined;
      const key =
        getClassificationKey(
          detail.policyId ?? undefined,
          classificationValue
        ) ?? rowId;
      classificationMap.set(key, {
        ...row,
        id: rowId,
        unique: rowId,
        policyId: entry.label.policyId ?? row.policyId ?? null,
        classificationValue:
          (entry.label.labelValue as ClassificationValue | undefined) ??
          row.classificationValue ??
          null,
        classificationLabelId: entry.label.id ?? null,
        classificationTempId: entry.tempId,
      });
    });
    const classificationRows = Array.from(classificationMap.values()).map(
      (row) => ({
        ...row,
        selected: row.selected || row.id === selectedClassificationId,
      })
    );

    const entryValues = Object.values(fabricEntries);
    if (!entryValues.length) {
      const fallbackObjectRows = list
        .filter((label) => label.inferenceType !== "CLASSIFICATION")
        .map((label, index) => {
          if (label.id && deletedFabricIdSet.has(label.id)) {
            return null;
          }
          const row = mapLabelToRow(
            label,
            policies,
            Boolean(selectedObjectMap.get(label.id ?? "")),
            index
          );
          if (!row || !label.id) {
            return null;
          }
          return {
            ...row,
            id: label.id,
            unique: label.id,
          };
        })
        .filter((row): row is ImageLabelRow => Boolean(row));
      return [...classificationRows, ...fallbackObjectRows];
    }
    const objectRows: ImageLabelRow[] = [];
    entryValues.forEach((entry, index) => {
      if (entry.label.inferenceType === "CLASSIFICATION") {
        return;
      }
      const detail = toLabelDetailResponse(entry.label, entry.key);
      const row = mapLabelToRow(
        detail,
        policies,
        Boolean(selectedObjectMap.get(entry.key)),
        index
      );
      if (row) {
        objectRows.push({
          ...row,
          id: detail.id ?? entry.key,
          unique: entry.key,
        });
      }
    });

    const objectRowIds = new Set(objectRows.map((row) => row.id));
    const fallbackObjectRows = list
      .filter(
        (label) =>
          label.inferenceType !== "CLASSIFICATION" &&
          label.id != null &&
          !objectRowIds.has(label.id) &&
          !deletedFabricIdSet.has(label.id)
      )
      .map((label, index) => {
        const row = mapLabelToRow(
          label,
          policies,
          Boolean(selectedObjectMap.get(label.id ?? "")),
          index
        );
        if (!row || !label.id) {
          return null;
        }
        return {
          ...row,
          id: label.id,
          unique: label.id,
        };
      })
      .filter((row): row is ImageLabelRow => Boolean(row));

    return [...classificationRows, ...objectRows, ...fallbackObjectRows];
  }, [
    classificationLabels,
    deletedClassificationSet,
    deletedFabricIdSet,
    fabricEntries,
    labelSearchQuery.data?.list,
    selectedClassificationId,
    policies,
    selectedObjectMap,
  ]);

  const [orderedRows, setOrderedRows] = useState<ImageLabelRow[]>(labelRows);
  const [hiddenLabelIds, setHiddenLabelIds] = useState<Record<string, boolean>>(
    {}
  );
  const [lockedLabelIds, setLockedLabelIds] = useState<Record<string, boolean>>(
    {}
  );

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
    setHiddenLabelIds((prev) => pruneStateByRows(prev, ids));
    setLockedLabelIds((prev) => pruneStateByRows(prev, ids));
  }, [orderedRows]);

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

  const getFabricObjectByUnique = useCallback((unique?: string) => {
    const canvas = getCanvasInstance();
    if (!canvas || !unique) {
      return undefined;
    }
    const objects = canvas.getObjects() as LabeledFabricObject[];
    return objects.find((object) => object.unique === unique);
  }, []);

  const removeLocalStateForLabel = useCallback(
    (labelId: string) => {
      setHiddenLabelIds((prev) => {
        if (!prev[labelId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[labelId];
        return next;
      });
      setLockedLabelIds((prev) => {
        if (!prev[labelId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[labelId];
        return next;
      });
    },
    []
  );

  const emitSequenceUpdate = (rows: ImageLabelRow[]) => {
    const payload = rows
      .filter((row) => !row.isClassification)
      .map((row, index) => ({
        unique: row.unique,
        seq: index,
      }));
    if (payload.length === 0) {
      return;
    }
    emitLabelEvent("seq", { seq: payload });
  };

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
    if (
      next[fromIndex].isClassification ||
      next[toIndex].isClassification ||
      lockedLabelIds[sourceId] ||
      lockedLabelIds[targetId]
    ) {
      resetDragState();
      return;
    }
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderedRows(next);
    emitSequenceUpdate(next);
    resetDragState();
  };

  const handleDragStart = (
    event: ReactDragEvent<HTMLDivElement>,
    row: ImageLabelRow
  ) => {
    if (
      row.isClassification ||
      lockedLabelIds[row.id] ||
      hiddenLabelIds[row.id]
    ) {
      event.preventDefault();
      return;
    }
    dragSourceIdRef.current = row.id;
    event.dataTransfer?.setData("text/plain", row.id);
  };

  const handleDragOver = (
    event: ReactDragEvent<HTMLDivElement>,
    row: ImageLabelRow
  ) => {
    if (
      row.isClassification ||
      dragSourceIdRef.current === null ||
      lockedLabelIds[row.id]
    ) {
      return;
    }
    event.preventDefault();
    dragTargetIdRef.current = row.id;
  };

  const handleDrop = (
    event: ReactDragEvent<HTMLDivElement>,
    row: ImageLabelRow
  ) => {
    if (row.isClassification || lockedLabelIds[row.id]) {
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

  // const handleRemoveLabel = useCallback(
  //   (label: ImageLabelRow) => {
  //     if (lockedLabelIds[label.id]) {
  //       return;
  //     }
  //     setClassificationVisibility(label.id, true);
  //     if (label.isClassification) {
  //       if (localClassificationTempIds.has(label.id)) {
  //         removeClassificationLabel(label.id);
  //       } else {
  //         removeClassificationLabelById(label.id);
  //       }
  //       setOrderedRows((prev) => prev.filter((row) => row.id !== label.id));
  //       removeLocalStateForLabel(label.id);
  //       if (selectedClassificationId === label.id) {
  //         setSelectedClassificationId(null);
  //       }
  //       return;
  //     }
  //     removeFabricEntryByKey(label.unique);
  //     emitLabelEvent("deleted", { unique: label.unique });
  //     setOrderedRows((prev) => prev.filter((row) => row.id !== label.id));
  //     removeLocalStateForLabel(label.id);
  //   },
  //   [
  //     lockedLabelIds,
  //     localClassificationTempIds,
  //     removeClassificationLabel,
  //     removeClassificationLabelById,
  //     removeFabricEntryByKey,
  //     removeLocalStateForLabel,
  //     selectedClassificationId,
  //     setSelectedClassificationId,
  //     setClassificationVisibility,
  //   ]
  // );
  const handleRemoveSelectedClassification = useCallback(() => {
    if (!selectedClassificationId) {
      return;
    }
    const targetRow = orderedRows.find(
      (row) => row.id === selectedClassificationId
    );
    if (!targetRow || !targetRow.isClassification) {
      return;
    }
    setClassificationVisibility(targetRow.id, true);
    if (localClassificationTempIds.has(targetRow.id)) {
      removeClassificationLabel(targetRow.id);
    } else {
      removeClassificationLabelById(targetRow.id);
    }
    setOrderedRows((prev) => prev.filter((row) => row.id !== targetRow.id));
    removeLocalStateForLabel(targetRow.id);
    setSelectedClassificationId(null);
  }, [
    localClassificationTempIds,
    orderedRows,
    removeClassificationLabel,
    removeClassificationLabelById,
    removeLocalStateForLabel,
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
    (label: ImageLabelRow) => {
      if (lockedLabelIds[label.id]) {
        return;
      }
      if (label.isClassification) {
        const classificationHidden = Boolean(hiddenClassificationIds[label.id]);
        setClassificationVisibility(label.id, !classificationHidden);
        return;
      }
      const target = getFabricObjectByUnique(label.unique);
      if (!target) {
        return;
      }
      const nextHidden = !hiddenLabelIds[label.id];
      target.set({
        visible: !nextHidden,
        evented: !nextHidden,
        selectable: !nextHidden,
      });
      target.canvas?.renderAll();
      setHiddenLabelIds((prev) => {
        const next = { ...prev };
        if (nextHidden) {
          next[label.id] = true;
        } else {
          delete next[label.id];
        }
        return next;
      });
    },
    [
      getFabricObjectByUnique,
      hiddenClassificationIds,
      hiddenLabelIds,
      lockedLabelIds,
      setClassificationVisibility,
    ]
  );

  const handleToggleLock = useCallback(
    (label: ImageLabelRow) => {
      const nextLocked = !lockedLabelIds[label.id];
      setLockedLabelIds((prev) => {
        const next = { ...prev };
        if (nextLocked) {
          next[label.id] = true;
        } else {
          delete next[label.id];
        }
        return next;
      });
      if (label.isClassification) {
        return;
      }
      const target = getFabricObjectByUnique(label.unique);
      if (!target) {
        return;
      }
      target.set({
        lockMovementX: nextLocked,
        lockMovementY: nextLocked,
        selectable: !nextLocked,
        evented: !nextLocked,
      });
      target.canvas?.renderAll();
    },
    [getFabricObjectByUnique, lockedLabelIds]
  );

  const resolveAttributeTarget = useCallback(
    (label: ImageLabelRow) => {
      if (label.isClassification) {
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
      const entry = fabricEntries[label.unique];
      if (entry) {
        return {
          id: label.id,
          label: entry.label,
          fabricKey: entry.key,
        };
      }
      const serverLabel = (labelSearchQuery.data?.list ?? []).find(
        (item) => item.id === label.id
      );
      if (serverLabel) {
        return {
          id: label.id,
          label: serverLabel,
          fabricKey: label.unique || serverLabel.id,
        };
      }
      return null;
    },
    [classificationLabels, fabricEntries, labelSearchQuery.data?.list]
  );

  const handleOpenAttributeEditor = useCallback(
    (label: ImageLabelRow) => {
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
        const classificationHidden = label.isClassification
          ? Boolean(hiddenClassificationIds[label.id])
          : false;
        const objectHidden = label.isClassification
          ? false
          : Boolean(hiddenLabelIds[label.id]);
        const isHidden = classificationHidden || objectHidden;
        const canDrag = !label.isClassification && !isLocked && !isHidden;
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
              // cursor: canDrag ? "grab" : "not-allowed",
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
                if (label.isClassification) {
                  setSelectedClassificationId(label.id, {
                    policyId: label.policyId ?? null,
                    classIndex: label.classificationValue?.classIndex ?? null,
                    className: label.classificationValue?.className ?? null,
                    labelId: label.classificationLabelId ?? null,
                    tempId:
                      label.classificationTempId ??
                      (label.classificationLabelId ? null : label.id),
                  });
                  return;
                }
                setSelectedClassificationId(null);
                emitLabelEvent("selected", { uniques: [label.unique] });
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
                {/* <Button
                  size="sm"
                  style="transparent"
                  disabled={isLocked}
                  aria-label="Remove label"
                  onClick={() => handleRemoveLabel(label)}
                >
                  <Icon iconType="icon-remove" size="xs" />
                </Button> */}
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
                  disabled={isLocked && !label.isClassification}
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

export default WorkspaceImageLabelList;
