import { useEffect, useMemo, useState } from "react";

import { useParams, useRouter } from "@tanstack/react-router";

import {
  Button,
  Icon,
  LabeledField,
  Pagination,
  Select,
  Step,
  Title,
  Wrapper,
} from "@/components";
import Folder from "@/components/atoms/Folder";
import { FilterToolbar } from "@/components/organisms";
import ContentBody from "@/components/templates/ContentBody";
import Section from "@/components/templates/Section";
import type { SearchOperatorValue } from "@/features/content-group/queries";
import {
  DatasetInfoPanel,
  DatasetTableList,
} from "@/features/dataset/components";
import useDatasetDetailPageData from "@/features/dataset/hooks/useDatasetDetailPageData";
import { useDatasetFilterMeta } from "@/features/dataset/hooks/useDatasetFilterMeta";
import { useDatasetDetail } from "@/features/dataset/queries";
import { useSelectedDatasetStore } from "@/features/dataset/store/selectedDataset.store";
import {
  useCopyLabels,
  useLabelContextEnable,
  useLabelingPoliciesBatch,
} from "@/queries";
import { useLabelingMutations } from "@/providers/LabelingMutationProvider";
import PolicyCardList from "@/features/policy/components/PolicyCardList";
import PolicyInfoPanel from "@/features/policy/components/PolicyInfoPanel";
import { useSelectedPolicyStore } from "@/features/policy/store/selectedPolicy.store";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";
import { getContentTypeMeta } from "@/lib/ui/contentType";
import { useModalContext, useModalStore } from "@/store/modal.store";

import { useLabelContextStatusMap } from "../hooks/useLabelContextStatusMap";
import { useImportLabelsModalStore } from "../store/importLabelsModal.store";
import { useLabelingRecordSelectionStore } from "../store/labelingRecordSelection.store";

function DatasetImportModalHeader() {
  return <Title title="Import Dataset" size="md" />;
}

function DatasetImportModalBody() {
  const { data: filterFields, isLoading: isFilterLoading } =
    useDatasetFilterMeta("dataset-list");

  return (
    <ContentBody columns={["1fr", "auto"]}>
      <Section className="content-main-section">
        <div className="content-main-section__functions">
          <div className="content-main-section__controls">
            <Pagination fields={filterFields} isLoading={isFilterLoading} />
          </div>
          <FilterToolbar fields={filterFields} isLoading={isFilterLoading} />
        </div>
        <DatasetTableList
          hideSelectionAndActionColumns
          clearSelectionOnUnmount={false}
        />
      </Section>
      <DatasetInfoPanel />
    </ContentBody>
  );
}

function DatasetImportModalFooter({
  onImportClick,
}: {
  onImportClick: (datasetId: string, datasetVersion: string) => void;
}) {
  const { close } = useModalContext();
  const {
    selectedDatasetId,
    selectedDatasetVersionList,
    selectedDatasetCurrentVersion,
    clearSelection,
  } = useSelectedDatasetStore();

  const [selectedDatasetVersion, setSelectedDatasetVersion] = useState<string>(
    selectedDatasetCurrentVersion ?? ""
  );

  useEffect(() => {
    setSelectedDatasetVersion(selectedDatasetCurrentVersion ?? "");
  }, [selectedDatasetVersionList, selectedDatasetCurrentVersion]);

  return (
    <>
      <LabeledField label="Version">
        <Select
          disabled={!selectedDatasetId}
          value={selectedDatasetVersion}
          onChange={(e) => setSelectedDatasetVersion(e.target.value)}
          options={[
            ...(selectedDatasetCurrentVersion != null
              ? [
                  {
                    label: selectedDatasetCurrentVersion ?? "",
                    value: selectedDatasetCurrentVersion?.toString() ?? "",
                  },
                ]
              : [{ label: "-", value: "", disabled: true }]),
            ...(selectedDatasetVersionList.length
              ? [...selectedDatasetVersionList].reverse().map((version) => ({
                  label: version.version ?? "",
                  value: version.version?.toString() ?? "",
                }))
              : []),
          ]}
        />
      </LabeledField>

      <Button
        title="Import"
        style="primary"
        disabled={!selectedDatasetId || !selectedDatasetVersion}
        onClick={() => {
          if (!selectedDatasetId || !selectedDatasetVersion) return;
          onImportClick(selectedDatasetId, selectedDatasetVersion);
          clearSelection();
          close();
        }}
      />
      <Button
        title="Cancel"
        style="primary-outline"
        onClick={() => {
          clearSelection();
          close();
        }}
      />
    </>
  );
}

function PolicyImportModalHeader() {
  return <Title title="Import Policy" size="md" />;
}

function PolicyImportModalBody() {
  return (
    <ContentBody className="policy-import-modal-body" columns={["1fr", "auto"]}>
      <Section className="content-main-section">
        <div className="content-main-section__functions">
          <div className="content-main-section__controls">
            <Pagination />
          </div>
          <FilterToolbar />
        </div>
        <PolicyCardList />
      </Section>
      <PolicyInfoPanel />
    </ContentBody>
  );
}

function PolicyImportModalFooter({
  onImportClick,
}: {
  onImportClick: (policyId: string) => void;
}) {
  const { close } = useModalContext();
  const { selectedPolicyId, selectPolicy } = useSelectedPolicyStore();

  return (
    <>
      <Button
        title="Import"
        style="primary"
        disabled={!selectedPolicyId}
        onClick={() => {
          if (!selectedPolicyId) return;
          onImportClick(selectedPolicyId);
          selectPolicy(null);
          close();
        }}
      />
      <Button title="Cancel" style="primary-outline" onClick={close} />
    </>
  );
}

function ImportLabelsModalHeader() {
  return <Title title="Import Labels from Version" size="md" />;
}

function ImportLabelsModalBody() {
  const { datasetId } = useParams({
    from: "/data-curation/labeling/{-$datasetId}/{-$datasetVersion}/" as never,
  });
  const { data: dataset, isLoading } = useDatasetDetail(datasetId ?? "", {
    enabled: Boolean(datasetId),
  });
  const {
    selectedVersion: activeVersion,
    setSelectedVersion,
    reset: resetSelectedVersion,
  } = useImportLabelsModalStore();

  const versions = dataset?.versionList ?? [];

  useEffect(() => {
    return () => {
      resetSelectedVersion();
    };
  }, []);

  if (!datasetId) {
    return (
      <Wrapper
        className="version-panel__list"
        isFull
        direction="vertical"
        gapSize="0.5rem"
      >
        <p className="version-panel__record">Dataset is not selected.</p>
      </Wrapper>
    );
  }

  return (
    <Wrapper
      className="version-panel__list"
      isFull
      direction="vertical"
      gapSize="0.5rem"
    >
      {isLoading && <p className="version-panel__record">Loading versions…</p>}
      {!isLoading && versions.length === 0 && (
        <p className="version-panel__record">No versions available.</p>
      )}
      {!isLoading &&
        versions.map((version) => {
          const isSelected = activeVersion === version.version;
          const recordCount =
            version.versionRecords && !isNaN(Number(version.versionRecords))
              ? Number(version.versionRecords)
              : (version.versionRecords ?? "-");
          const displayDate = version.versionedDate || "-";

          return (
            <div
              key={version.version ?? displayDate}
              role="button"
              tabIndex={0}
              className={`version-wrapper${isSelected ? " selected" : ""}`}
              onClick={() => setSelectedVersion(version.version ?? null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedVersion(version.version ?? null);
                }
              }}
            >
              <div className="version__label">
                <p className="version-panel__version">
                  <span className="version-panel__version-label">
                    {version.version ?? "-"}
                  </span>
                </p>
              </div>
              <div className="version__infomation">
                <p className="version-panel__date">{displayDate}</p>
                <p className="version-panel__record">
                  <em>Record</em>
                  {recordCount ?? "-"}
                </p>
              </div>
            </div>
          );
        })}
    </Wrapper>
  );
}

function ImportLabelsModalFooter({
  onImportClick,
}: {
  onImportClick: (version: string) => Promise<void>;
}) {
  const { close } = useModalContext();
  const selectedVersion = useImportLabelsModalStore(
    (state) => state.selectedVersion
  );
  const resetSelectedVersion = useImportLabelsModalStore(
    (state) => state.reset
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImport = async () => {
    if (!selectedVersion || isProcessing) {
      return;
    }
    setIsProcessing(true);
    try {
      await onImportClick(selectedVersion);
      resetSelectedVersion();
      close();
    } catch (error) {
      // error is surfaced by the caller; keep the modal open
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        title="Import"
        style="primary"
        disabled={!selectedVersion || isProcessing}
        onClick={handleImport}
      />
      <Button title="Cancel" style="primary-outline" onClick={close} />
    </>
  );
}

function LabelingInfoPanel() {
  const { datasetId, datasetVersion } = useParams({
    from: "/data-curation/labeling/{-$datasetId}/{-$datasetVersion}/" as never,
  });
  const router = useRouter();
  const { onMutationSuccess } = useLabelingMutations();
  const openModal = useModalStore((state) => state.openModal);
  const { filter, setFilter } = useFilterBySearchParams();

  const filterPolicyIds = useMemo(() => {
    return (filter.policyIds as SearchOperatorValue<string[]>)?.value ?? [];
  }, [filter]);
  const copyLabelsMutation = useCopyLabels();
  const [selectedEntities, setSelectedEntities] = useState<
    Array<{ type: "dataset" | "policy"; id: string }>
  >([]);

  const { dataset } = useDatasetDetailPageData({
    datasetId,
    version: datasetVersion,
  });
  const { labelContext, labelContextStatus } = useLabelContextStatusMap({
    datasetId,
    datasetVersion,
  });
  const { data: labelContextEnable } = useLabelContextEnable(labelContext?.id);
  const lockedPolicyIds = useMemo(
    () => new Set(labelContext?.policyIds ?? []),
    [labelContext?.policyIds]
  );
  const policyIds = useMemo(() => {
    return [...(labelContext?.policyIds ?? []), ...filterPolicyIds];
  }, [filterPolicyIds, labelContext?.policyIds]);
  const normalizedPolicyIds = useMemo(
    () =>
      Array.from(
        new Set(
          policyIds
            .map((id) => id?.trim())
            .filter((id): id is string => Boolean(id))
        )
      ),
    [policyIds]
  );
  const { data: policies = [] } = useLabelingPoliciesBatch(normalizedPolicyIds);

  const tableSelectedItems = useLabelingRecordSelectionStore(
    (state) => state.tableSelectedItems
  );

  const currentStep = useMemo(() => {
    return dataset ? (policies.length ? 3 : 2) : 1;
  }, [dataset, policies]);

  const canImportLabelsFromVersion =
    Boolean(dataset?.versionList?.length) &&
    policies.length > 0 &&
    Boolean(
      (labelContextStatus as { contentSets?: unknown[] })?.contentSets
        ?.length ??
        (labelContextStatus as { contentsets?: unknown[] })?.contentsets?.length
    ) === false &&
    Boolean(labelContext?.id);

  const handleImportLabelsFromVersion = async (
    sourceDatasetVersion: string
  ) => {
    const normalizedDatasetId = String(datasetId ?? "").trim();
    const targetDatasetVersion = String(datasetVersion ?? "").trim();
    const sourceVersion = String(sourceDatasetVersion ?? "").trim();
    const targetLabelContextId = labelContext?.id ?? "";
    const targetPolicyIds = policies
      .map((policy) => policy.id)
      .filter((id): id is string => Boolean(id));

    if (
      !normalizedDatasetId ||
      !targetDatasetVersion ||
      !targetLabelContextId
    ) {
      window.alert("Select a dataset and version before importing labels.");
      throw new Error("Dataset, version, or label context is missing");
    }
    if (!sourceVersion) {
      window.alert("Select a source version to import.");
      throw new Error("Source version is missing");
    }
    if (sourceVersion === targetDatasetVersion) {
      window.alert("Select a different version to import from.");
      throw new Error("Source version matches target version");
    }
    if (targetPolicyIds.length === 0) {
      window.alert("Add at least one policy before importing labels.");
      throw new Error("No policies selected");
    }

    try {
      const copyResult = await copyLabelsMutation.mutateAsync({
        copyType: "DATASET",
        targetLabelContextId,
        targetPolicyIds,
        sourceDatasetId: normalizedDatasetId,
        sourceDatasetVersion: sourceVersion,
      });

      if (targetLabelContextId) {
        onMutationSuccess({ type: "labels-copied" });
      }
      window.alert(
        copyResult.message ??
          `Copied ${copyResult.copiedCount ?? 0} label(s) from version ${sourceVersion}.`
      );
    } catch (error) {
      const apiMessage = (
        error as { response?: { data?: { message?: string } } }
      )?.response?.data?.message;
      const fallbackMessage =
        (error as Error | undefined)?.message ??
        "Failed to import labels from the selected version.";
      window.alert(apiMessage ?? fallbackMessage);
      throw error;
    }
  };

  const handleOpenDatasetImportModal = () => {
    openModal({
      header: DatasetImportModalHeader,
      body: DatasetImportModalBody,
      footer: (
        <DatasetImportModalFooter
          onImportClick={(datasetId, datasetVersion) => {
            const nextFilter = { ...filter };
            delete nextFilter.pageNumber;
            delete nextFilter.pageSize;
            setFilter(
              nextFilter,
              `/data-curation/labeling/${datasetId}/${datasetVersion}`
            );
          }}
        />
      ),
      closeOnBackdrop: true,
      size: "lg",
    });
  };

  const handleOpenPolicyImportModal = () => {
    openModal({
      header: PolicyImportModalHeader,
      body: PolicyImportModalBody,
      footer: (
        <PolicyImportModalFooter
          onImportClick={(policyId) => {
            const nextPolicyIds = new Set([...filterPolicyIds, policyId]);
            setFilter({
              policyIds: {
                operator: "IN",
                value: Array.from(nextPolicyIds),
              },
            });
          }}
        />
      ),
      closeOnBackdrop: true,
      size: "lg",
    });
  };

  const handleOpenImportLabelsModal = () => {
    openModal({
      header: ImportLabelsModalHeader,
      body: ImportLabelsModalBody,
      footer: () => (
        <ImportLabelsModalFooter
          onImportClick={handleImportLabelsFromVersion}
        />
      ),
      closeOnBackdrop: true,
      size: "xs",
    });
  };

  const isDatasetSelected = dataset
    ? selectedEntities.some(
        (entity) => entity.type === "dataset" && entity.id === dataset.id
      )
    : false;
  const isPolicySelected = (policyId: string) =>
    selectedEntities.some(
      (entity) => entity.type === "policy" && entity.id === policyId
    );

  useEffect(() => {
    if (lockedPolicyIds.size === 0) {
      return;
    }
    setSelectedEntities((prev) =>
      prev.filter(
        (entity) => entity.type !== "policy" || !lockedPolicyIds.has(entity.id)
      )
    );
  }, [lockedPolicyIds, setSelectedEntities]);

  const baseCanStartLabeling =
    tableSelectedItems.length > 0 &&
    policies.length > 0 &&
    Boolean(dataset?.id) &&
    Boolean(datasetVersion);
  const isLabelContextEnabled = labelContext?.id
    ? labelContextEnable?.enable === true
    : true;
  const canStartLabeling = baseCanStartLabeling && isLabelContextEnabled;

  return (
    <section className="content-sub-section content-sub-section--left show">
      <div className={`stepper-wrapper stepper-wrapper-vertical`}>
        <Step
          label="Dataset"
          step={1}
          currentStep={currentStep}
          totalSteps={2}
          className="shrink-0"
        >
          {dataset && (
            <Folder
              title={dataset.name}
              isThumbnailEnabled={false}
              isHeaderEnabled={false}
              minItemsPerRow={1}
              className={isDatasetSelected ? "selected" : undefined}
              onClick={() => {
                setSelectedEntities((prev) => {
                  if (
                    prev.some(
                      (entity) =>
                        entity.type === "dataset" && entity.id === dataset.id
                    )
                  ) {
                    return prev.filter(
                      (entity) =>
                        !(entity.type === "dataset" && entity.id === dataset.id)
                    );
                  }
                  const withoutDataset = prev.filter(
                    (entity) => entity.type !== "dataset"
                  );
                  return [
                    ...withoutDataset,
                    { type: "dataset", id: dataset.id },
                  ];
                });
              }}
            >
              <LabeledField label="Latest" size="sm" isMinWidth>
                <p>{dataset.latestVersion}</p>
              </LabeledField>
              <LabeledField label="Record" size="sm" isMinWidth>
                <p>{isNaN(Number(dataset.records)) ? "-" : dataset.records}</p>
              </LabeledField>
              <Wrapper gapSize="0.25rem" align="center">
                {dataset.schemaTypes
                  .filter((contentType) => contentType !== "CUSTOM")
                  .map((contentType) => {
                    const { iconType } = getContentTypeMeta(contentType);
                    if (!iconType) {
                      return null;
                    }
                    return (
                      <Icon key={contentType} iconType={iconType} size="sm" />
                    );
                  })}
              </Wrapper>
            </Folder>
          )}
          {!dataset && (
            <Button
              className="button-add button-add-xl"
              title="Dataset"
              style="transparent"
              size="md"
              isFull
              onClick={handleOpenDatasetImportModal}
            >
              <Icon iconType="icon-plus" size="sm" />
            </Button>
          )}
        </Step>
        <Step label="Policy" step={2} currentStep={currentStep} totalSteps={2}>
          {policies.map((policy) => {
            const isLocked = lockedPolicyIds.has(policy.id);
            const isSelected = !isLocked && isPolicySelected(policy.id);
            return (
              <Folder
                key={policy.id}
                title={policy.name}
                indicator={
                  policy.version ? (
                    <p className="version">{`v${policy.version}`}</p>
                  ) : undefined
                }
                className={[
                  isSelected ? "selected" : "",
                  isLocked ? "is-disabled" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                minItemsPerRow={1}
                isHeaderEnabled={false}
                isThumbnailEnabled={false}
                onClick={
                  isLocked
                    ? undefined
                    : () => {
                        setSelectedEntities((prev) => {
                          const alreadySelected = prev.some(
                            (entity) =>
                              entity.type === "policy" &&
                              entity.id === policy.id
                          );
                          if (alreadySelected) {
                            return prev.filter(
                              (entity) =>
                                !(
                                  entity.type === "policy" &&
                                  entity.id === policy.id
                                )
                            );
                          }
                          return [...prev, { type: "policy", id: policy.id }];
                        });
                      }
                }
              >
                <LabeledField label="Class" size="sm">
                  <p>{policy.classes?.length ?? 0}</p>
                </LabeledField>
                <Wrapper isFull>
                  <p className="classes">
                    {policy.classes?.length
                      ? policy.classes.map((item) => item.name).join(", ")
                      : "-"}
                  </p>
                </Wrapper>
              </Folder>
            );
          })}
          <Button
            className="button-add button-add-md"
            title="Policy"
            style="transparent"
            size="md"
            isFull
            onClick={handleOpenPolicyImportModal}
          >
            <Icon iconType="icon-plus" size="sm" />
          </Button>
        </Step>
      </div>
      <Wrapper
        direction="vertical"
        gapSize="0.5rem"
        className="content-sub-section__footer"
        isFull
      >
        <Button
          title="Remove"
          style="primary-outline"
          disabled={selectedEntities.length === 0}
          onClick={() => {
            const datasetSelections = selectedEntities.filter(
              (entity) => entity.type === "dataset"
            );
            const policySelections = selectedEntities.filter(
              (entity) => entity.type === "policy"
            );
            const parts: string[] = [];
            if (datasetSelections.length) {
              parts.push(
                `${datasetSelections.length} dataset${
                  datasetSelections.length > 1 ? "s" : ""
                }`
              );
            }
            if (policySelections.length) {
              parts.push(
                `${policySelections.length} polic${
                  policySelections.length > 1 ? "ies" : "y"
                }`
              );
            }
            const message =
              parts.length > 0
                ? `Are you sure you want to remove the selected ${parts.join(
                    " and "
                  )}?`
                : "Are you sure you want to remove the selected items?";

            if (!confirm(message)) {
              return;
            }

            if (policySelections.length) {
              const policyIdsToRemove = new Set(
                policySelections.map((selection) => selection.id)
              );
              const nextPolicyIds = filterPolicyIds.filter(
                (policyId) => !policyIdsToRemove.has(policyId)
              );
              setFilter(
                {
                  ...filter,
                  policyIds: {
                    operator: "IN",
                    value: nextPolicyIds,
                  },
                },
                datasetSelections.length ? "/data-curation/labeling" : undefined
              );
            } else if (datasetSelections.length) {
              router.navigate({
                to: `/data-curation/labeling` as never,
                search: (prev: never) => prev,
              });
            }

            setSelectedEntities([]);
          }}
          isFull
        />
        <Button
          title="Import Labels from Version"
          style="primary"
          onClick={handleOpenImportLabelsModal}
          disabled={!canImportLabelsFromVersion}
          isFull
        >
          <Icon iconType="icon-import" size="sm" />
        </Button>
        <Button
          title="Start Labeling"
          disabled={!canStartLabeling}
          onClick={async () => {
            if (!datasetId || !datasetVersion) {
              return;
            }
            const tableSelectedItemsFilter =
              tableSelectedItems.length > 0
                ? { operator: "IN", value: tableSelectedItems }
                : undefined;
            const nextFilter = {
              ...filter,
              datasetId: { operator: "EQ", value: datasetId },
              datasetVersion: { operator: "EQ", value: datasetVersion },
              ...(normalizedPolicyIds.length
                ? {
                    policyIds: {
                      operator: "IN",
                      value: normalizedPolicyIds,
                    },
                  }
                : {}),
              ...(tableSelectedItemsFilter
                ? { tableSelectedItems: tableSelectedItemsFilter }
                : {}),
            };
            setFilter(
              nextFilter as Record<
                string,
                | number
                | SearchOperatorValue<unknown>
                | Record<string, "ASC" | "DESC">
                | undefined
              >,
              `/data-curation/labeling/workspace`
            );
          }}
          isFull
        >
          <Icon iconType="icon-labeling" size="sm" />
        </Button>
      </Wrapper>
    </section>
  );
}

export default LabelingInfoPanel;
