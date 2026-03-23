import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button, Checkbox, Input, Select, Wrapper } from "@/components";
import type { Attribute, PolicyDetail } from "@/features/policy/types/domain";

import { useLabelBatchStore } from "../store/labelBatch.store";
import { useWorkspaceAttributeEditorStore } from "../store/workspaceAttributeEditor.store";
import { useWorkspaceFileLabelStore } from "../store/workspaceFileLabel.store";
import type { AttributeValue, LabelInsertData } from "../types/domain";
import { getCanvasInstance, getLabeledObjects } from "../utils/imageLabelingCore";
import type { LabeledFabricObject } from "../utils/imageLabelingTypes";

interface WorkspaceAttributeEditPanelProps {
  policies: PolicyDetail[];
}

type ClassValue = { classIndex?: number; className?: string };

const resolvePolicyClassMeta = (
  policies: PolicyDetail[],
  policyId: string | undefined,
  value: ClassValue | undefined
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
      ? policy.classes.find((c) => c.index === value.classIndex)
      : undefined;
  if (byIndex) {
    return byIndex;
  }
  if (value.className) {
    return policy.classes.find((c) => c.name === value.className) ?? null;
  }
  return null;
};

const normalizeDraftValues = (
  attribute: Attribute,
  values: string[] | undefined
) => {
  if (!Array.isArray(values)) {
    return [];
  }
  const sanitized = values.filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  if (attribute.attributeType === "CHECKBOX") {
    return sanitized;
  }
  const first = sanitized[0];
  return first ? [first] : [];
};

const buildDraftFromLabel = (
  attributes: Attribute[],
  labelValues?: AttributeValue[]
) => {
  const valueMap = new Map<string, string[]>();
  (labelValues ?? []).forEach((entry) => {
    if (!entry.name) {
      return;
    }
    valueMap.set(entry.name, entry.values ?? []);
  });
  const next: Record<string, string[]> = {};
  attributes.forEach((attribute) => {
    next[attribute.name] = normalizeDraftValues(
      attribute,
      valueMap.get(attribute.name)
    );
  });
  return next;
};

const buildAttributeValues = (
  attributes: Attribute[],
  draftValues: Record<string, string[]>
): AttributeValue[] =>
  attributes.map((attribute) => {
    const rawValues = draftValues[attribute.name] ?? [];
    const trimmed = rawValues
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    const values =
      attribute.attributeType === "CHECKBOX"
        ? trimmed
        : trimmed.length
          ? [trimmed[0]]
          : [];
    return {
      name: attribute.name,
      attributeType: attribute.attributeType,
      values,
    };
  });

const stopWorkspaceShortcuts = (event: ReactKeyboardEvent<HTMLElement>) => {
  event.stopPropagation();
};

function WorkspaceAttributeEditPanel({
  policies,
}: WorkspaceAttributeEditPanelProps) {
  const targets = useWorkspaceAttributeEditorStore((state) => state.targets);
  const close = useWorkspaceAttributeEditorStore((state) => state.close);
  const addClassificationLabel = useLabelBatchStore(
    (state) => state.addClassificationLabel
  );
  const addRecognitionLabel = useLabelBatchStore(
    (state) => state.addRecognitionLabel
  );
  const updateFabricEntryLabel = useLabelBatchStore(
    (state) => state.updateFabricEntryLabel
  );
  const updateFileDraftLabel = useWorkspaceFileLabelStore(
    (state) => state.updateDraftLabel
  );

  const patchFabricLabelInsertData = (
    targetKey: string | null,
    nextLabel: LabelInsertData & { id?: string }
  ) => {
    const key = targetKey ?? nextLabel.id ?? null;
    if (!key) {
      return;
    }
    const canvas = getCanvasInstance();
    if (!canvas) {
      return;
    }
    const objects = getLabeledObjects(canvas) as LabeledFabricObject[];
    let didUpdate = false;
    objects.forEach((object) => {
      const currentInsertData = object.labelInsertData as
        | (LabelInsertData & { id?: string })
        | undefined;
      const objectKey =
        object.unique ??
        currentInsertData?.id ??
        (typeof object.info === "string" ? object.info : undefined) ??
        null;
      if (!objectKey || objectKey !== key) {
        return;
      }
      object.labelInsertData = {
        ...(currentInsertData ?? {}),
        ...nextLabel,
        id: currentInsertData?.id ?? nextLabel.id,
      };
      didUpdate = true;
    });
    if (didUpdate) {
      canvas.renderAll();
    }
  };

  const primaryTarget = targets[0];
  const classValue =
    (primaryTarget?.label.labelValue as ClassValue | undefined) ?? undefined;
  const classMeta = useMemo(
    () =>
      primaryTarget
        ? resolvePolicyClassMeta(
            policies,
            primaryTarget.label.policyId,
            classValue
          )
        : null,
    [classValue, policies, primaryTarget]
  );
  const attributes = useMemo(
    () => classMeta?.attributes ?? [],
    [classMeta?.attributes]
  );
  const [draftValues, setDraftValues] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!primaryTarget) {
      setDraftValues({});
      return;
    }
    setDraftValues(
      buildDraftFromLabel(attributes, primaryTarget.label.attributeValues)
    );
  }, [attributes, primaryTarget]);

  const handleTextChange = (name: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [name]: value.length ? [value] : [],
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [name]: value.length ? [value] : [],
    }));
  };

  const handleToggleCheckbox = (name: string, option: string) => {
    setDraftValues((prev) => {
      const current = new Set(prev[name] ?? []);
      if (current.has(option)) {
        current.delete(option);
      } else {
        current.add(option);
      }
      return {
        ...prev,
        [name]: Array.from(current),
      };
    });
  };

  const handleApply = () => {
    if (!primaryTarget || !targets.length) {
      close();
      return;
    }
    const nextAttributeValues = buildAttributeValues(attributes, draftValues);
    targets.forEach((target) => {
      const updatedLabel = {
        ...target.label,
        attributeValues: nextAttributeValues,
      };
      const classValue =
        (updatedLabel.labelValue as ClassValue | undefined) ?? undefined;
      const classMeta = resolvePolicyClassMeta(
        policies,
        updatedLabel.policyId,
        classValue
      );
      const labelValueWithColor = updatedLabel.labelValue as
        | { color?: string }
        | undefined;
      const resolvedColor = labelValueWithColor?.color ?? classMeta?.color;
      if (updatedLabel.labelType === "FILE") {
        updateFileDraftLabel(target.id, updatedLabel, {
          color: resolvedColor,
          opacity:
            typeof updatedLabel.labelValue === "object" &&
            updatedLabel.labelValue &&
            "opacity" in updatedLabel.labelValue
              ? (updatedLabel.labelValue as { opacity?: number }).opacity
              : undefined,
        });
        return;
      }
      if (updatedLabel.inferenceType === "RECOGNITION") {
        addRecognitionLabel(updatedLabel, {
          tempId: target.tempId ?? undefined,
          color: resolvedColor,
        });
        return;
      }
      if (
        updatedLabel.inferenceType === "CLASSIFICATION" ||
        !updatedLabel.inferenceType
      ) {
        addClassificationLabel(updatedLabel, {
          tempId: target.tempId ?? undefined,
          color: resolvedColor,
        });
        return;
      }
      const fabricKey = target.fabricKey ?? updatedLabel.id ?? target.id;
      updateFabricEntryLabel(fabricKey, updatedLabel);
      patchFabricLabelInsertData(fabricKey ?? null, updatedLabel);
    });
    close();
  };

  if (!primaryTarget) {
    return (
      <Wrapper direction="vertical" gapSize="0.75rem">
        <p>No label selected.</p>
      </Wrapper>
    );
  }

  const className =
    classMeta?.name ??
    classValue?.className ??
    (typeof classValue?.classIndex === "number"
      ? `Class ${classValue.classIndex}`
      : "Label");

  return (
    <Wrapper
      direction="vertical"
      gapSize="1rem"
      className="attribute-edit-panel"
    >
      <Wrapper direction="vertical" gapSize="0.25rem">
        <p className="attribute-edit-panel__title">{className}</p>
        <p className="attribute-edit-panel__meta">Class</p>
      </Wrapper>
      {attributes.length > 0 ? (
        <Wrapper direction="vertical" gapSize="1rem" isFull>
          {attributes.map((attribute) => {
            const fieldValues = draftValues[attribute.name] ?? [];
            const inputValue = fieldValues[0] ?? "";
            if (attribute.attributeType === "TEXT") {
              return (
                <Wrapper
                  key={attribute.name}
                  direction="vertical"
                  gapSize="0.5rem"
                >
                  <p className="attribute-edit-panel__label">
                    {attribute.name}
                  </p>
                  <Input
                    isFull
                    value={inputValue}
                    placeholder={attribute.placeholder ?? ""}
                    onKeyDown={stopWorkspaceShortcuts}
                    onChange={(event) =>
                      handleTextChange(attribute.name, event.target.value)
                    }
                  />
                </Wrapper>
              );
            }
            if (attribute.attributeType === "SELECT") {
              const options = (attribute.values ?? []).map((value) => ({
                label: value,
                value,
              }));
              return (
                <Wrapper
                  key={attribute.name}
                  direction="vertical"
                  gapSize="0.5rem"
                >
                  <p className="attribute-edit-panel__label">
                    {attribute.name}
                  </p>
                  <Select
                    isFull
                    value={inputValue}
                    placeholder="Select"
                    options={options}
                    onKeyDown={stopWorkspaceShortcuts}
                    onChange={(event) =>
                      handleSelectChange(attribute.name, event.target.value)
                    }
                  />
                </Wrapper>
              );
            }
            const options = attribute.values ?? [];
            return (
              <Wrapper
                key={attribute.name}
                direction="vertical"
                gapSize="0.5rem"
              >
                <p className="attribute-edit-panel__label">{attribute.name}</p>
                {options.length > 0 ? (
                  <Wrapper gapSize="0.5rem" isWrap>
                    {options.map((option, index) => {
                      const id =
                        `attribute-${attribute.name}-${option}-${index}`
                          .replace(/\s+/g, "-")
                          .toLowerCase();
                      return (
                        <Checkbox
                          key={id}
                          id={id}
                          name={attribute.name}
                          label={option}
                          checked={fieldValues.includes(option)}
                          onKeyDown={stopWorkspaceShortcuts}
                          onChange={() =>
                            handleToggleCheckbox(attribute.name, option)
                          }
                        />
                      );
                    })}
                  </Wrapper>
                ) : (
                  <p className="attribute-edit-panel__empty">No options.</p>
                )}
              </Wrapper>
            );
          })}
        </Wrapper>
      ) : (
        <p className="attribute-edit-panel__empty">
          No attributes configured for this class.
        </p>
      )}
      <Wrapper
        justify="center"
        gapSize="0.5rem"
        className="attribute-edit-panel__actions"
        isFull
      >
        <Button title="Cancel" style="secondary-outline" onClick={close} />
        <Button
          title="Apply Attributes"
          style="primary"
          disabled={!attributes.length}
          onClick={handleApply}
        />
      </Wrapper>
    </Wrapper>
  );
}

export default WorkspaceAttributeEditPanel;
