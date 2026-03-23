import { useCallback, useEffect, useMemo } from "react";

import { Button, Icon, Wrapper } from "@/components";
import type { IconName } from "@/components/atoms/Icon";
import type { PolicyDetail } from "@/features/policy/types/domain";

import { useWorkspaceLabelSearchParams } from "../hooks/useWorkspaceLabelSearchParams";
import { useLabelSearch } from "../queries";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useLabelSelectionStore } from "../store/labelSelection.store";
import { useLabelVisibilityStore } from "../store/labelVisibility.store";
import type {
  BoxValue,
  ClassificationValue,
  LabelDetailResponse,
  LabelInsertData,
  SegmentationResponseValue,
} from "../types/domain";

interface WorkspaceRecordLabelListProps {
  policies: PolicyDetail[];
}

interface RecordLabelRow {
  id: string;
  title: string;
  iconType: IconName;
  iconFill?: string;
  isClassification: boolean;
  policyId?: string | null;
  classificationValue?: ClassificationValue | null;
  classificationLabelId?: string | null;
  classificationTempId?: string | null;
  attributes: { title: string; value: string }[];
}

const buildAttributeRows = (
  label: LabelDetailResponse | (LabelInsertData & { id?: string })
): { title: string; value: string }[] => {
  const attributes = label.attributeValues ?? [];
  if (!attributes.length) {
    return [];
  }
  return attributes.map((attribute) => ({
    title: attribute.name ?? attribute.attributeType ?? "Attribute",
    value: (attribute.values ?? [])[0] ?? "",
  }));
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

const resolveInferenceIcon = (inferenceType?: string | null): IconName => {
  switch (inferenceType) {
    case "OBJECT_DETECTION":
      return "icon-object-detection";
    case "SEGMENTATION":
      return "icon-segmentation";
    case "RECOGNITION":
      return "icon-text";
    case "CLASSIFICATION":
      return "icon-classification";
    default:
      return "icon-labeling";
  }
};

const resolveNonClassificationTitle = (
  label: LabelDetailResponse | (LabelInsertData & { id?: string })
): string => {
  switch (label.inferenceType) {
    case "OBJECT_DETECTION": {
      const boxValue = label.labelValue as BoxValue | undefined;
      return boxValue?.className ?? "Object Detection";
    }
    case "SEGMENTATION": {
      const segValue = label.labelValue as SegmentationResponseValue | undefined;
      return segValue?.className ?? "Segmentation";
    }
    case "RECOGNITION": {
      const recognitionValue = label.labelValue as
        | { className?: string }
        | undefined;
      return recognitionValue?.className ?? "Recognition";
    }
    default:
      return label.inferenceType ?? "Label";
  }
};

function WorkspaceRecordLabelList({ policies }: WorkspaceRecordLabelListProps) {
  const { request: labelSearchRequest } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(labelSearchRequest);
  const classificationLabels = useLabelBatchStore(
    (state) => state.classificationLabels
  );
  const classificationDeletedIds = useLabelBatchStore(
    (state) => state.classificationDeletedIds
  );
  const removeClassificationLabel = useLabelBatchStore(
    (state) => state.removeClassificationLabel
  );
  const removeClassificationLabelById = useLabelBatchStore(
    (state) => state.removeClassificationLabelById
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
  const selectedClassificationId = useLabelSelectionStore(
    (state) => state.selectedClassificationId
  );
  const setSelectedClassificationId = useLabelSelectionStore(
    (state) => state.setSelectedClassificationId
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
            (label.unitType ?? "").toUpperCase() === "CONTENTSET" &&
            typeof label.id === "string"
        )
        .map((label) => label.id as string)
    );
    serverClassificationIds.forEach((id) => {
      if (hiddenClassificationIds[id] && !deletedClassificationSet.has(id)) {
        setClassificationVisibility(id, false);
      }
    });
    // 의도적으로 hiddenClassificationIds 변경에 반응하지 않음: 사용자 토글을 되돌리지 않기 위함.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedClassificationSet, labelSearchQuery.data?.list, setClassificationVisibility]);

  const recordLabelRows = useMemo<RecordLabelRow[]>(() => {
    const classificationMap = new Map<string, RecordLabelRow>();
    const nonClassificationRows: RecordLabelRow[] = [];
    const list = labelSearchQuery.data?.list ?? [];
    list.forEach((label) => {
      if ((label.unitType ?? "").toUpperCase() !== "CONTENTSET") {
        return;
      }
      if (label.inferenceType === "CLASSIFICATION") {
        if (label.id && deletedClassificationSet.has(label.id)) {
          return;
        }
        const classificationValue = label.labelValue as
          | ClassificationValue
          | undefined;
        const classMeta = resolvePolicyClassMeta(
          policies,
          label.policyId ?? null,
          classificationValue
        );
        const key =
          getClassificationKey(
            label.policyId ?? undefined,
            classificationValue
          ) ?? label.id;
        if (!key) {
          return;
        }
        classificationMap.set(key, {
          id: label.id ?? key,
          title:
            classMeta?.name ??
            classificationValue?.className ??
            (typeof classificationValue?.classIndex === "number"
              ? `Class ${classificationValue.classIndex}`
              : "Classification"),
          iconType: "icon-classification",
          iconFill: classMeta?.color,
          isClassification: true,
          policyId: label.policyId ?? null,
          classificationValue: classificationValue ?? null,
          classificationLabelId: label.id ?? null,
          classificationTempId: null,
          attributes: buildAttributeRows(label),
        });
        return;
      }

      nonClassificationRows.push({
        id: label.id ?? `${label.inferenceType ?? "label"}-${nonClassificationRows.length}`,
        title: resolveNonClassificationTitle(label),
        iconType: resolveInferenceIcon(label.inferenceType),
        isClassification: false,
        attributes: buildAttributeRows(label),
      });
    });

    classificationLabels.forEach((entry) => {
      if (entry.label.inferenceType !== "CLASSIFICATION") {
        return;
      }
      if ((entry.label.unitType ?? "").toUpperCase() !== "CONTENTSET") {
        return;
      }
      if (entry.label.id && deletedClassificationSet.has(entry.label.id)) {
        return;
      }
      const classificationValue = entry.label.labelValue as
        | ClassificationValue
        | undefined;
      const classMeta = resolvePolicyClassMeta(
        policies,
        entry.label.policyId ?? null,
        classificationValue
      );
      const key =
        getClassificationKey(
          entry.label.policyId ?? undefined,
          classificationValue
        ) ?? entry.tempId;
      if (!key) {
        return;
      }
      classificationMap.set(key, {
        id: entry.label.id ?? entry.tempId,
        title:
          classMeta?.name ??
          classificationValue?.className ??
          (typeof classificationValue?.classIndex === "number"
            ? `Class ${classificationValue.classIndex}`
            : "Classification"),
        iconType: "icon-classification",
        iconFill: classMeta?.color ?? entry.color,
        isClassification: true,
        policyId: entry.label.policyId ?? null,
        classificationValue: classificationValue ?? null,
        classificationLabelId: entry.label.id ?? null,
        classificationTempId: entry.tempId,
        attributes: buildAttributeRows(entry.label),
      });
    });

    return [...Array.from(classificationMap.values()), ...nonClassificationRows];
  }, [
    classificationLabels,
    deletedClassificationSet,
    labelSearchQuery.data?.list,
    policies,
  ]);

  const handleRemoveSelectedLabel = useCallback(() => {
    if (!selectedClassificationId) {
      return;
    }
    const targetRow = recordLabelRows.find(
      (row) => row.id === selectedClassificationId
    );
    if (!targetRow) {
      return;
    }
    if (targetRow.classificationTempId) {
      removeClassificationLabel(targetRow.classificationTempId);
    } else {
      const classificationId =
        targetRow.classificationLabelId ?? targetRow.id ?? null;
      if (classificationId) {
        removeClassificationLabelById(classificationId);
      }
    }
    setSelectedClassificationId(null);
  }, [
    recordLabelRows,
    removeClassificationLabel,
    removeClassificationLabelById,
    selectedClassificationId,
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
      if (event.key === "Backspace" || event.key === "Delete") {
        if (selectedClassificationId) {
          event.preventDefault();
          handleRemoveSelectedLabel();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleRemoveSelectedLabel, selectedClassificationId]);

  return (
    <Wrapper className="label-list" direction="vertical" gapSize="0.25rem">
      {recordLabelRows.map((label, index) => {
        const displayIndex = index + 1;
        const isHidden =
          label.isClassification && label.id
            ? Boolean(hiddenClassificationIds[label.id])
            : false;
        const isSelected =
          label.isClassification && selectedClassificationId === label.id;
        return (
          <Wrapper
            key={label.id}
            direction="vertical"
            className={`label-wrapper ${isSelected ? "selected" : ""}`}
            isFull
            style={{
              opacity: isHidden ? 0.4 : 1,
            }}
            onClick={() => {
              if (!label.isClassification) {
                return;
              }
              setSelectedClassificationId(label.id, {
                policyId: label.policyId ?? null,
                classIndex: label.classificationValue?.classIndex ?? null,
                className: label.classificationValue?.className ?? null,
                labelId: label.classificationLabelId ?? null,
                tempId: label.classificationTempId ?? null,
                isCanvasFocused: false,
              });
            }}
          >
            <Wrapper justify="between" className="label" isFull>
              <Wrapper className="label-item" align="center" gapSize="0.5rem">
                <Button
                  size="sm"
                  style="transparent"
                  disabled
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
                  disabled={!label.isClassification}
                  aria-pressed={label.isClassification ? isHidden : false}
                  aria-label={
                    label.isClassification
                      ? isHidden
                        ? "Show label"
                        : "Hide label"
                      : "Hide label"
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    if (label.isClassification) {
                      setClassificationVisibility(label.id, !isHidden);
                    }
                  }}
                >
                  <Icon iconType="icon-view" size="xs" />
                </Button>
              </Wrapper>
            </Wrapper>
            {label.attributes.length > 0 && (
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
                    <p className="attribute__value">{attribute.value || "—"}</p>
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

export default WorkspaceRecordLabelList;
