import { useCallback, useEffect, useMemo, useState } from "react";

import { Button, Icon, Wrapper } from "@/components";
import type { IconName } from "@/components/atoms/Icon";

import { useWorkspaceLabelSearchParams } from "../hooks/useWorkspaceLabelSearchParams";
import { useLabelSearch } from "../queries";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useLabelSelectionStore } from "../store/labelSelection.store";
import { useLabelVisibilityStore } from "../store/labelVisibility.store";
import { useWorkspaceAttributeEditorStore } from "../store/workspaceAttributeEditor.store";
import { useWorkspaceFileLabelStore } from "../store/workspaceFileLabel.store";
import type { FileValue } from "../types/domain";
import { resolveFileIconType, resolveFileName } from "../utils/fileLabel";

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

function WorkspaceFileLabelList() {
  const drafts = useWorkspaceFileLabelStore((state) => state.drafts);
  const removeDraft = useWorkspaceFileLabelStore((state) => state.removeDraft);
  const toggleDraftLock = useWorkspaceFileLabelStore(
    (state) => state.toggleDraftLock
  );
  const openAttributeEditor = useWorkspaceAttributeEditorStore(
    (state) => state.open
  );
  const selectedClassificationId = useLabelSelectionStore(
    (state) => state.selectedClassificationId
  );
  const setSelectedClassificationId = useLabelSelectionStore(
    (state) => state.setSelectedClassificationId
  );
  const hiddenClassificationIds = useLabelVisibilityStore(
    (state) => state.hiddenClassificationIds
  );
  const setClassificationVisibility = useLabelVisibilityStore(
    (state) => state.setClassificationVisibility
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
  const removeClassificationLabelById = useLabelBatchStore(
    (state) => state.removeClassificationLabelById
  );
  const [lockedLabelIds, setLockedLabelIds] = useState<Record<string, boolean>>(
    {}
  );
  const { request: labelSearchRequest } = useWorkspaceLabelSearchParams();
  const labelSearchQuery = useLabelSearch(labelSearchRequest);
  const deletedLabelSet = useMemo(
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

  const handleRemoveSelectedLabel = useCallback(() => {
    if (!selectedClassificationId) {
      return;
    }
    const draft = drafts.find((item) => item.id === selectedClassificationId);
    if (draft) {
      removeDraft(draft.id);
      setSelectedClassificationId(null);
      return;
    }
    removeClassificationLabelById(selectedClassificationId);
    setSelectedClassificationId(null);
  }, [
    drafts,
    removeClassificationLabelById,
    removeDraft,
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

  const handleToggleLock = useCallback(
    (rowId: string, isDraft: boolean) => {
      if (isDraft) {
        toggleDraftLock(rowId);
        return;
      }
      setLockedLabelIds((prev) => {
        const next = { ...prev };
        if (next[rowId]) {
          delete next[rowId];
        } else {
          next[rowId] = true;
        }
        return next;
      });
    },
    [toggleDraftLock]
  );
  const savedLabels = useMemo(() => {
    const list = labelSearchQuery.data?.list ?? [];
    return list.filter(
      (label) =>
        (label.labelType === "FILE" || !label.labelType) &&
        (!label.id || !deletedLabelSet.has(label.id))
    );
  }, [deletedLabelSet, labelSearchQuery.data?.list]);

  return (
    <Wrapper className="label-list" direction="vertical" gapSize="0.25rem">
      {drafts.map((draft, index) => {
        const classValue = draft.label.labelValue as
          | { classIndex?: number; className?: string }
          | undefined;
        const className =
          classValue?.className ??
          (typeof classValue?.classIndex === "number"
            ? `Class ${classValue.classIndex}`
            : null);
        const labelTitle = className ?? "File";
        const inferenceType = draft.label.inferenceType;
        const attributes =
          draft.label.attributeValues?.map((attribute) => ({
            title: attribute.name ?? attribute.attributeType ?? "Attribute",
            value: Array.isArray(attribute.values)
              ? attribute.values.join(", ")
              : "",
          })) ?? [];
        const isLocked = Boolean(draft.locked);
        const isHidden = Boolean(hiddenClassificationIds[draft.id]);
        const isSelected = selectedClassificationId === draft.id;
        const iconType = inferenceType
          ? resolveInferenceIcon(inferenceType)
          : resolveFileIconType(draft.file.name);
        return (
          <Wrapper
            key={draft.id}
            direction="vertical"
            className={`label-wrapper ${isSelected ? "selected" : ""}`}
            isFull
            style={{
              opacity: isHidden ? 0.4 : 1,
            }}
          >
            <Wrapper
              justify="between"
              className="label"
              isFull
              align="center"
              onClick={() => {
                if (isLocked) {
                  return;
                }
                setSelectedClassificationId(draft.id, {
                  policyId: draft.label.policyId ?? null,
                  classIndex: classValue?.classIndex ?? null,
                  className: classValue?.className ?? null,
                  labelId: null,
                  tempId: draft.id,
                  isCanvasFocused: false,
                });
              }}
            >
              <Wrapper className="label-item" align="center" gapSize="0.5rem">
                <Button
                  size="sm"
                  style="transparent"
                  disabled
                  aria-label="Reorder label"
                >
                  <Icon iconType="icon-drag" size="xs" />
                </Button>
                <p className="label__index">{index + 1}</p>
                <Icon iconType={iconType} fill={draft.classMeta?.color} />
                <p className="label__title">{labelTitle}</p>
              </Wrapper>
              <Wrapper className="label-util" gapSize="0.25rem">
                <Button
                  size="sm"
                  style="transparent"
                  disabled
                  aria-label="Edit attributes"
                  onClick={() => {
                    if (isLocked) {
                      return;
                    }
                    openAttributeEditor([
                      {
                        id: draft.id,
                        label: draft.label,
                      },
                    ]);
                  }}
                >
                  <Icon iconType="icon-edit" size="xs" />
                </Button>
                <Button
                  size="sm"
                  style="transparent"
                  aria-pressed={isHidden}
                  disabled={true}
                  aria-label={isHidden ? "Show label" : "Hide label"}
                  onClick={() =>
                    setClassificationVisibility(draft.id, !isHidden)
                  }
                >
                  <Icon iconType="icon-view" size="xs" />
                </Button>
                <Button
                  size="sm"
                  style="transparent"
                  aria-pressed={isLocked}
                  aria-label={isLocked ? "Unlock label" : "Lock label"}
                  onClick={() => handleToggleLock(draft.id, true)}
                  disabled
                >
                  <Icon
                    iconType={isLocked ? "icon-lock" : "icon-unlock"}
                    size="xs"
                  />
                </Button>
              </Wrapper>
            </Wrapper>
            <Wrapper className="attribute-list" gapSize="0.25rem" isWrap>
              <Wrapper
                className="attribute-item"
                isBordered
                isRounded
                gapSize="0.25rem"
              >
                <p className="attribute__title">File</p>
                <p className="attribute__value">{draft.file.name}</p>
              </Wrapper>
              {attributes.map((attribute, attrIndex) => (
                <Wrapper
                  key={`${draft.id}-attribute-${attrIndex}`}
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
          </Wrapper>
        );
      })}
      {savedLabels.map((label, index) => {
        const fileValue = label.labelValue as FileValue | null | undefined;
        const classificationValue = label.labelValue as
          | { classIndex?: number; className?: string }
          | undefined;
        const fileName = resolveFileName(fileValue) || "File";
        const attributes =
          label.attributeValues?.map((attribute) => ({
            title: attribute.name ?? attribute.attributeType ?? "Attribute",
            value: Array.isArray(attribute.values)
              ? attribute.values.join(", ")
              : "",
          })) ?? [];
        const displayIndex = drafts.length + index + 1;
        const iconType = label.inferenceType
          ? resolveInferenceIcon(label.inferenceType)
          : resolveFileIconType(fileName);
        const isHidden = Boolean(label.id && hiddenClassificationIds[label.id]);
        const isSelected =
          Boolean(label.id) && selectedClassificationId === label.id;
        const isLocked = Boolean(label.id && lockedLabelIds[label.id]);
        return (
          <Wrapper
            key={label.id}
            direction="vertical"
            className={`label-wrapper ${isSelected ? "selected" : ""}`}
            isFull
            style={{
              opacity: isHidden ? 0.4 : 1,
            }}
          >
            <Wrapper
              justify="between"
              className="label"
              isFull
              align="center"
              onClick={() => {
                if (!label.id || isLocked) {
                  return;
                }
                setSelectedClassificationId(label.id, {
                  policyId: label.policyId ?? null,
                  classIndex: classificationValue?.classIndex ?? null,
                  className: classificationValue?.className ?? null,
                  labelId: label.id,
                  tempId: null,
                  isCanvasFocused: false,
                });
              }}
            >
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
                <Icon iconType={iconType} />
                <p className="label__title">File</p>
              </Wrapper>
              <Wrapper className="label-util" gapSize="0.25rem">
                <Button
                  size="sm"
                  style="transparent"
                  disabled
                  aria-label="Edit attributes"
                >
                  <Icon iconType="icon-edit" size="xs" />
                </Button>
                <Button
                  size="sm"
                  style="transparent"
                  aria-pressed={isHidden}
                  aria-label={isHidden ? "Show label" : "Hide label"}
                  disabled
                  onClick={() => {
                    if (!label.id) {
                      return;
                    }
                    setClassificationVisibility(label.id, !isHidden);
                  }}
                >
                  <Icon iconType="icon-view" size="xs" />
                </Button>
                <Button
                  size="sm"
                  style="transparent"
                  aria-pressed={isLocked}
                  aria-label={isLocked ? "Unlock label" : "Lock label"}
                  disabled
                  onClick={() => {
                    if (!label.id) {
                      return;
                    }
                    handleToggleLock(label.id, false);
                  }}
                >
                  <Icon
                    iconType={isLocked ? "icon-lock" : "icon-unlock"}
                    size="xs"
                  />
                </Button>
              </Wrapper>
            </Wrapper>
            <Wrapper className="attribute-list" gapSize="0.25rem" isWrap>
              <Wrapper
                className="attribute-item"
                isBordered
                isRounded
                gapSize="0.25rem"
              >
                <p className="attribute__title">File</p>
                <p className="attribute__value">{fileName}</p>
              </Wrapper>
              {attributes.map((attribute, attrIndex) => (
                <Wrapper
                  key={`${label.id}-attribute-${attrIndex}`}
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
          </Wrapper>
        );
      })}
    </Wrapper>
  );
}

export default WorkspaceFileLabelList;
