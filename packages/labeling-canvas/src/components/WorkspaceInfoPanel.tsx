import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button, Select, Tabs, Wrapper } from "@/components";
import type { SearchOperatorValue } from "@/features/content-group/queries";
import { useLabelBatchStore } from "@/store/labelBatch.store";
import {
  useOpacityStore,
  usePaletteStore,
} from "@/store/labelingPaletteSelection.store";
import { useLabelInsertPayloadStore } from "@/store/labelInsertPayload.store";
import { useLabelSelectionStore } from "@/store/labelSelection.store";
import { useSelectedLabelObjectsStore } from "@/store/selectedLabelObjects.store";
import { useWorkspaceAttributeEditorStore } from "@/store/workspaceAttributeEditor.store";
import { useWorkspaceNavigationDetailSelectionStore } from "@/store/workspaceNavigationDetailSelection.store";
import { useWorkspaceValidationModeStore } from "@/store/workspaceValidationMode.store";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";

import { useLabelingPoliciesBatch } from "../queries";
import { useWorkspaceViewModeStore } from "../store/workspaceViewMode.store";
import type { LabelInsertData } from "../types/domain";
import { toRgba } from "../utils/imageLabelingColors";
import { emitLabelEvent } from "../utils/imageLabelingTools";
import { resolveWorkspaceViewModeFromContentType } from "../utils/workspaceViewMode";
import { useExtensionsBySlot } from "../providers/ExtensionProvider";
import WorkspaceAttributeFormSection from "./WorkspaceAttributeFormSection";
import WorkspaceFileLabelList from "./WorkspaceFileLabelList";
import WorkspaceImageLabelList from "./WorkspaceImageLabelList";
import WorkspaceNumberLabelList from "./WorkspaceNumberLabelList";
import WorkspaceRecordLabelList from "./WorkspaceRecordLabelList";
import WorkspaceTextLabelList from "./WorkspaceTextLabelList";

const createTempId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `temp-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
};

function WorkspaceInfoPanel() {
  const { extensions: infoPanelExtensions, renderContext: extRenderCtx } =
    useExtensionsBySlot("renderInfoPanelAction");
  const { filter } = useFilterBySearchParams();
  const policyIds = filter.policyIds as SearchOperatorValue<string[]>;
  const { data: policies = [] } = useLabelingPoliciesBatch(policyIds.value);
  const policiesList = useMemo(
    () => (Array.isArray(policies) ? [...policies] : []),
    [policies]
  );
  const workspaceViewMode = useWorkspaceViewModeStore((state) => state.mode);
  const isRecordViewMode = workspaceViewMode === "Record";
  const isFileViewMode = workspaceViewMode === "File";
  const isValidationMode = useWorkspaceValidationModeStore(
    (state) => state.isValidationMode
  );
  const attributeEditorTargets = useWorkspaceAttributeEditorStore(
    (state) => state.targets
  );
  const isAttributeEditorOpen = attributeEditorTargets.length > 0;
  const policyOptions = useMemo(() => {
    if (!Array.isArray(policiesList) || policiesList.length === 0)
      return [{ label: "No policy", value: "" }];
    return policiesList.map((policy) => ({
      label: policy.name,
      value: policy.id,
    }));
  }, [policiesList]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>(
    policyIds.value?.[0] ?? ""
  );
  const classItems = useMemo(() => {
    if (!Array.isArray(policiesList) || policiesList.length === 0) return [];
    return (
      policiesList
        .find((policy) => policy.id === selectedPolicyId)
        ?.classes.map((classItem) => ({
          ...classItem,
          hotKey: ((classItem.index ?? 0) + 1).toString(),
        })) ?? []
    );
  }, [policiesList, selectedPolicyId]);
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const schemaName = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.schemaName
  );
  const contentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );
  const setLabelPayload = useLabelInsertPayloadStore(
    (state) => state.setPayload
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
  const addClassificationLabel = useLabelBatchStore(
    (state) => state.addClassificationLabel
  );
  const selectedLabelObjects = useSelectedLabelObjectsStore(
    (state) => state.objects
  );
  const isPolicySelectionLocked = useMemo(() => {
    if (selectedClassificationInfo?.isCanvasFocused) {
      return true;
    }
    if (selectedClassificationId) {
      return true;
    }
    return selectedLabelObjects.length > 0;
  }, [
    selectedClassificationId,
    selectedClassificationInfo?.isCanvasFocused,
    selectedLabelObjects.length,
  ]);
  const setPaletteColorCode = usePaletteStore((state) => state.setColorCode);
  const setPaletteOpacity = useOpacityStore((state) => state.setOpacity);
  const [selectedTab, setSelectedTab] = useState<"Class" | "Element">("Class");
  const resolvedUnitType = useMemo<LabelInsertData["unitType"]>(() => {
    if (isRecordViewMode) {
      return "CONTENTSET";
    }
    return elementId ? "ELEMENT" : "CONTENTSET";
  }, [elementId, isRecordViewMode]);
  const resolvedLabelType = useMemo<LabelInsertData["labelType"]>(() => {
    const resolvedViewMode =
      resolveWorkspaceViewModeFromContentType(contentType);
    if (resolvedViewMode === "Number") {
      return "TABLE";
    }
    if (resolvedViewMode === "File") {
      return "FILE";
    }
    return undefined;
  }, [contentType]);
  const buildLabelInsertData = useCallback(
    (classItem?: (typeof classItems)[number]): LabelInsertData | null => {
      if (!selectedPolicyId) {
        return null;
      }
      if (!isFileViewMode && !classItem) {
        return null;
      }
      const basePayload: LabelInsertData = {
        contentSetId: contentSetId ?? undefined,
        elementId: isRecordViewMode ? undefined : (elementId ?? undefined),
        schemaName: schemaName ?? undefined,
        policyId: selectedPolicyId,
        inferenceType: "CLASSIFICATION",
        unitType: resolvedUnitType,
        ...(resolvedLabelType ? { labelType: resolvedLabelType } : {}),
        attributeValues: [],
      };
      if (isFileViewMode || !classItem) {
        return basePayload;
      }
      return {
        ...basePayload,
        labelValue: {
          classIndex: classItem.index,
          className: classItem.name,
        },
      };
    },
    [
      contentSetId,
      elementId,
      isFileViewMode,
      isRecordViewMode,
      schemaName,
      resolvedLabelType,
      resolvedUnitType,
      selectedPolicyId,
    ]
  );
  useEffect(() => {
    if (isFileViewMode) {
      return;
    }
    if (!classItems.length) {
      setSelectedClassId(0);
      return;
    }
    const hasSelected = classItems.some(
      (classItem) => classItem.index === selectedClassId
    );
    if (!hasSelected) {
      setSelectedClassId(classItems[0].index ?? 0);
    }
  }, [classItems, isFileViewMode, selectedClassId]);
  const handlePolicyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextPolicyId = e.target.value;
    const firstClassIndex =
      policiesList.find((policy) => policy.id === nextPolicyId)?.classes?.[0]
        ?.index ?? 0;
    setSelectedPolicyId(nextPolicyId);
    if (!isFileViewMode) {
      setSelectedClassId(
        typeof firstClassIndex === "number" ? firstClassIndex : 0
      );
    }
  };
  const handleClassChange = (index: number) => {
    if (isFileViewMode) {
      return;
    }
    setSelectedClassId(index);
    const nextClass = classItems.find((classItem) => classItem.index === index);
    applyClassSelection(nextClass);
  };
  const selectedClass = classItems.find(
    (classItem) => classItem.index === selectedClassId
  );
  const labelInsertData = useMemo<LabelInsertData | null>(() => {
    return buildLabelInsertData(selectedClass);
  }, [buildLabelInsertData, selectedClass]);

  useEffect(() => {
    if (isFileViewMode) {
      return;
    }
    if (!selectedClassificationInfo) {
      return;
    }
    if (!Array.isArray(policiesList) || policiesList.length === 0) {
      return;
    }
    const policyCandidates = policiesList.filter((policy) =>
      selectedClassificationInfo.policyId
        ? policy.id === selectedClassificationInfo.policyId
        : policy.id === selectedPolicyId
    );
    const targetPolicy =
      policyCandidates[0] ??
      policiesList.find(
        (policy) => policy.id === selectedClassificationInfo.policyId
      );
    if (targetPolicy?.id && targetPolicy.id !== selectedPolicyId) {
      setSelectedPolicyId(targetPolicy.id);
    }
    if (!targetPolicy) {
      return;
    }
    const { classIndex, className } = selectedClassificationInfo;
    const matchedClass =
      typeof classIndex === "number"
        ? targetPolicy.classes.find((item) => item.index === classIndex)
        : className
          ? targetPolicy.classes.find((item) => item.name === className)
          : undefined;
    if (matchedClass?.index !== undefined) {
      setSelectedClassId(matchedClass.index);
    }
  }, [
    isFileViewMode,
    policiesList,
    selectedClassificationInfo,
    selectedPolicyId,
    setSelectedClassId,
    setSelectedPolicyId,
  ]);

  useEffect(() => {
    if (isFileViewMode) {
      setLabelPayload(labelInsertData, null);
      return;
    }
    setLabelPayload(labelInsertData, {
      color: selectedClass?.color,
      opacity: selectedClass?.opacity,
    });
  }, [isFileViewMode, labelInsertData, selectedClass, setLabelPayload]);

  const applyClassSelection = useCallback(
    (classItem?: (typeof classItems)[number]) => {
      if (isFileViewMode) {
        return;
      }
      const nextLabelInsertData = buildLabelInsertData(classItem);
      if (!classItem || !nextLabelInsertData) {
        return;
      }

      if (isRecordViewMode) {
        const classificationValue =
          (nextLabelInsertData.labelValue as
            | { classIndex?: number; className?: string }
            | undefined) ?? undefined;
        const tempId = createTempId();
        addClassificationLabel(nextLabelInsertData, {
          color: classItem.color,
          opacity:
            typeof classItem.opacity === "number"
              ? classItem.opacity
              : undefined,
          tempId,
        });
        setSelectedClassificationId(tempId, {
          policyId: nextLabelInsertData.policyId,
          classIndex: classificationValue?.classIndex ?? null,
          className: classificationValue?.className ?? null,
          labelId: null,
          tempId,
          isCanvasFocused: false,
        });
        return;
      }

      const classificationValue =
        (nextLabelInsertData.labelValue as
          | { classIndex?: number; className?: string }
          | undefined) ?? undefined;
      const targetLabelId =
        selectedClassificationInfo?.labelId ?? selectedClassificationId ?? null;
      const targetTempId =
        selectedClassificationInfo?.tempId ??
        (selectedClassificationInfo?.isCanvasFocused ? createTempId() : null) ??
        (!targetLabelId ? (selectedClassificationId ?? null) : null);
      if (selectedClassificationId || selectedClassificationInfo) {
        const labelPayload = targetLabelId
          ? { ...nextLabelInsertData, id: targetLabelId }
          : nextLabelInsertData;
        addClassificationLabel(labelPayload, {
          color: classItem.color,
          opacity:
            typeof classItem.opacity === "number"
              ? classItem.opacity
              : undefined,
          tempId: targetTempId ?? undefined,
        });
        const nextSelectedId = targetLabelId ?? targetTempId ?? null;
        if (nextSelectedId) {
          setSelectedClassificationId(nextSelectedId, {
            policyId: nextLabelInsertData.policyId,
            classIndex: classificationValue?.classIndex ?? null,
            className: classificationValue?.className ?? null,
            labelId: targetLabelId ?? null,
            tempId: targetTempId ?? null,
            isCanvasFocused: false,
          });
        }
      }
      if (selectedLabelObjects.length) {
        emitLabelEvent("addClass", {
          class: classItem.name,
          hex: classItem.color,
          opacity:
            typeof classItem.opacity === "number"
              ? classItem.opacity
              : undefined,
          labelInsertData: nextLabelInsertData,
        });
      }
    },
    [
      addClassificationLabel,
      buildLabelInsertData,
      isFileViewMode,
      isRecordViewMode,
      selectedClassificationInfo,
      selectedClassificationId,
      setSelectedClassificationId,
      selectedLabelObjects.length,
    ]
  );

  useEffect(() => {
    if (isFileViewMode) {
      return;
    }
    const color = selectedClass?.color;
    const policyOpacity =
      typeof selectedClass?.opacity === "number" ? selectedClass.opacity : 1;
    if (!color) {
      return;
    }
    const normalizedColor =
      color.startsWith("rgba(") || color.startsWith("rgb(")
        ? color
        : toRgba(color, policyOpacity);
    setPaletteColorCode(normalizedColor);
    setPaletteOpacity(policyOpacity);
  }, [
    isFileViewMode,
    selectedClass?.color,
    selectedClass?.opacity,
    setPaletteColorCode,
    setPaletteOpacity,
  ]);

  useEffect(() => {
    return () => {
      setLabelPayload(null);
    };
  }, [setLabelPayload]);

  useEffect(() => {
    if (isFileViewMode) {
      return;
    }
    if (!classItems.length) {
      setSelectedClassId(0);
      return;
    }
    const hasSelected = classItems.some(
      (classItem) => classItem.index === selectedClassId
    );
    if (!hasSelected) {
      setSelectedClassId(classItems[0].index ?? 0);
    }
  }, [classItems, isFileViewMode, selectedClassId]);

  useEffect(() => {
    const shouldIgnoreTarget = (target: EventTarget | null) => {
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
      if (isFileViewMode) {
        return;
      }
      if (shouldIgnoreTarget(event.target)) {
        return;
      }
      const key = event.key;
      const matched = classItems.find((item) => item.hotKey === key);
      if (matched) {
        event.preventDefault();
        setSelectedClassId(matched.index ?? 0);
        applyClassSelection(matched);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [applyClassSelection, classItems, isFileViewMode]);

  if (isAttributeEditorOpen) {
    return <WorkspaceAttributeFormSection policies={policies} />;
  }
  return (
    <section className="content-sub-section content-sub-section--split show">
      <div className="content-sub-section__title">
        <Tabs
          titles={[
            {
              name: "Class",
            },
            {
              name: "Element",
              isDisabled:
                policies.find((policy) => policy.id === selectedPolicyId)
                  ?.elements?.length === 0,
            },
          ]}
          isSwitch
          size="sm"
          onClick={(tab) => {
            setSelectedTab(tab.name as "Class" | "Element");
          }}
        />
      </div>
      {/* Class Tab 영역 */}
      {selectedTab === "Class" && (
        <div className="content-sub-section__content">
          <Select
            options={policyOptions}
            className="mb-4"
            defaultValue={selectedPolicyId}
            onChange={(e) => handlePolicyChange(e)}
            disabled={isPolicySelectionLocked}
          />
          <Wrapper direction="vertical" gapSize="0.25rem">
            {classItems.map((classItem) => (
              <Button
                key={classItem.index}
                title={classItem.name}
                letter={classItem.hotKey}
                className={`button--class ${selectedClassId === classItem.index ? "selected" : ""}`}
                isFull
                style="gray-outline"
                justify="start"
                disabled={isFileViewMode}
                onClick={() => handleClassChange(classItem.index ?? 0)}
              >
                <div
                  className="color-preview"
                  style={{ backgroundColor: classItem.color }}
                />
              </Button>
            ))}
          </Wrapper>
        </div>
      )}
      {/* Element Tab 영역 */}
      {selectedTab === "Element" && (
        <div className="content-sub-section__content">
          <Wrapper direction="vertical" gapSize="0.5rem" isFull>
            <div className="content-detail-card-wrapper">
              <div className="content-detail-card__content">
                <Wrapper
                  gapSize="0.25rem"
                  direction="vertical"
                  className="element-wrapper"
                >
                  {policies
                    .find((policy) => policy.id === selectedPolicyId)
                    ?.elements?.map((element) => (
                      <p key={element} className="element">
                        {element}
                      </p>
                    ))}
                </Wrapper>
              </div>
            </div>
          </Wrapper>
        </div>
      )}
      <div className="content-sub-section__title">
        <Tabs
          titles={[
            {
              name: "Label",
            },
          ]}
          isSwitch
          size="sm"
        />
      </div>
      <div className="content-sub-section__content">
        {workspaceViewMode === "Record" && (
          <WorkspaceRecordLabelList policies={policies} />
        )}
        {workspaceViewMode === "Text" && (
          <WorkspaceTextLabelList policies={policies} />
        )}
        {workspaceViewMode === "Number" && (
          <WorkspaceNumberLabelList policies={policies} />
        )}
        {workspaceViewMode === "Image" && (
          <WorkspaceImageLabelList policies={policies} />
        )}
        {workspaceViewMode === "File" && <WorkspaceFileLabelList />}
      </div>
      {!isValidationMode &&
        infoPanelExtensions.map((ext) => (
          <div key={ext.id} className="content-sub-section__content">
            {ext.renderInfoPanelAction!(extRenderCtx)}
          </div>
        ))}
    </section>
  );
}

export default WorkspaceInfoPanel;
