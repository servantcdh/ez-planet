import { useEffect, useMemo } from "react";
import {
  LabelingWorkspace,
  LabelingProviders,
  staticData,
  IDLE_MUTATION,
  useFilterStore,
  useWorkspaceNavigationDetailSelectionStore,
  type LabelingDataContextValue,
  type LabelingMutationContextValue,
  type LabelingDatasetContextValue,
} from "@servantcdh/ez-planet-labeling";
import {
  sampleImages,
  sampleTexts,
  sampleNumberData,
  samplePolicies,
  sampleRecords,
} from "./sampleData";

const DATASET_ID = "dataset-demo-001";
const DATASET_VERSION = "v1";
const POLICY_IDS = samplePolicies.map((p) => p.id);
const NOW = new Date().toISOString();

// ─── Data builders ──────────────────────────────────────────────

function buildPolicyDetails() {
  return samplePolicies.map((p) => ({
    id: p.id,
    basePolicyId: p.id,
    version: "1",
    baseVersion: "1",
    name: p.name,
    exist: true,
    classes: p.classes.map((c) => ({
      name: c.name,
      color: c.color,
      index: c.index,
      attributes: c.attributes ?? null,
    })),
    elements: [],
    tags: [],
    versions: [
      {
        id: `${p.id}-v1`,
        version: "1",
        classCount: p.classes.length,
        elementCount: 0,
        createdBy: "demo",
        createdDate: NOW,
      },
    ],
    zoneId: "demo",
    organizationId: "demo",
    accountId: "demo",
    userId: "demo",
    createdBy: "demo",
    createdDate: NOW,
    modifiedBy: "demo",
    modifiedDate: NOW,
  }));
}

function buildDataset() {
  return {
    id: DATASET_ID,
    orgId: "demo",
    zoneId: "demo",
    accountId: "demo",
    exist: true,
    name: "Labeling Demo Dataset",
    latestVersion: DATASET_VERSION,
    currentVersion: DATASET_VERSION,
    records: String(sampleRecords.length),
    versionList: [
      {
        version: DATASET_VERSION,
        versionedDate: NOW,
        versionRecords: String(sampleRecords.length),
      },
    ],
    isLock: false,
    isEditing: false,
    isArchMode: false,
    tags: ["demo"],
    schema: [
      {
        baseInfo: {
          schemaName: "image",
          contentType: "IMAGE",
          contentSize: 1,
          isRequired: true,
          isPreset: false,
          isVisible: true,
        },
        properties: {},
      },
      {
        baseInfo: {
          schemaName: "text",
          contentType: "CUSTOM",
          contentSize: 1,
          isRequired: false,
          isPreset: false,
          isVisible: true,
        },
        properties: {},
      },
      {
        baseInfo: {
          schemaName: "table",
          contentType: "TABLE",
          contentSize: 6,
          isRequired: false,
          isPreset: false,
          isVisible: true,
        },
        properties: {},
      },
    ],
    importTransactionId: undefined,
    createdId: "demo",
    createdBy: "demo",
    createdDate: NOW,
    modifiedId: "demo",
    modifiedBy: "demo",
    modifiedDate: NOW,
    schemaTypes: ["IMAGE", "CUSTOM", "TABLE"] as const,
  };
}

function buildContentsForRecord(rec: (typeof sampleRecords)[number]) {
  if (rec.contentType === "CUSTOM") {
    const text = sampleTexts[rec.contentSetId] ?? "";
    return {
      contents: { [rec.schemaName]: [{ value: text }] },
      summary: { [rec.schemaName]: 1 },
    };
  }
  if (rec.contentType === "TABLE") {
    const rows = sampleNumberData[rec.contentSetId] ?? [];
    return {
      contents: {
        [rec.schemaName]: rows.map((row) => ({
          hour: row.hour,
          temperature: String(row.temperature),
          humidity: String(row.humidity),
          trafficCount: String(row.trafficCount),
          airQualityIndex: String(row.airQualityIndex),
        })),
      },
      summary: { [rec.schemaName]: rows.length },
    };
  }
  // IMAGE (default)
  const img = sampleImages[rec.contentSetId];
  return {
    contents: { [rec.schemaName]: [{ endpointUrl: img?.url ?? "" }] },
    summary: { [rec.schemaName]: 1 },
  };
}

function buildContentRecords() {
  return sampleRecords.map((rec) => {
    const { contents, summary } = buildContentsForRecord(rec);
    return {
      id: rec.id,
      contentSetId: rec.contentSetId,
      datasetId: DATASET_ID,
      version: DATASET_VERSION,
      contents,
      summary,
      createdBy: "demo",
      createdDate: NOW,
      modifiedBy: "demo",
      modifiedDate: NOW,
    };
  });
}

function buildContentDetail(contentSetId: string) {
  const rec = sampleRecords.find((r) => r.contentSetId === contentSetId);
  if (!rec) return null;
  const { contents, summary } = buildContentsForRecord(rec);
  return {
    id: rec.id,
    contentSetId: rec.contentSetId,
    datasetId: DATASET_ID,
    version: DATASET_VERSION,
    contents,
    summary,
    createdBy: "demo",
    createdDate: NOW,
    modifiedBy: "demo",
    modifiedDate: NOW,
  };
}

// ─── Mutation context (no-ops for demo) ─────────────────────────

const REJECT = () => Promise.reject(new Error("Demo: mutations disabled"));

const MUTATIONS_CTX: LabelingMutationContextValue = {
  batchUpdateLabels: REJECT as never,
  batchUpdateLabelsState: IDLE_MUTATION,
  bulkCreateLabels: REJECT as never,
  bulkCreateLabelsState: IDLE_MUTATION,
  createLabelContext: REJECT as never,
  createLabelContextState: IDLE_MUTATION,
  updateLabelContext: REJECT as never,
  updateLabelContextState: IDLE_MUTATION,
  createLabelStatus: REJECT as never,
  createLabelStatusState: IDLE_MUTATION,
  uploadFileLabel: REJECT as never,
  uploadFileLabelState: IDLE_MUTATION,
  copyLabels: REJECT as never,
  copyLabelsState: IDLE_MUTATION,
  createValidResult: REJECT as never,
  createValidResultState: IDLE_MUTATION,
  updateValidResult: REJECT as never,
  updateValidResultState: IDLE_MUTATION,
  bulkDeleteValidResults: REJECT as never,
  bulkDeleteValidResultsState: IDLE_MUTATION,
  onMutationSuccess: () => {},
};

// ─── Provider data hook ─────────────────────────────────────────

function useProviderData() {
  const selectedContentSetId = useWorkspaceNavigationDetailSelectionStore(
    (s) => s.contentSetId,
  );

  const records = useMemo(() => buildContentRecords(), []);

  const dataCtx = useMemo<LabelingDataContextValue>(
    () => ({
      policiesBatch: staticData(buildPolicyDetails()),
      labelContext: staticData({
        id: "lctx-demo",
        datasetId: DATASET_ID,
        datasetVersion: DATASET_VERSION,
        policyIds: POLICY_IDS,
        enable: true,
        organizationId: "demo",
        accountId: "demo",
        zoneId: "demo",
        userId: "demo",
        inLabeling: false,
        isLabeled: false,
        createdBy: "demo",
        createdDate: NOW,
        modifiedBy: "demo",
        modifiedDate: NOW,
      }),
      labelContextStatus: staticData({
        labelContextId: "lctx-demo",
        datasetId: DATASET_ID,
        contentSets: sampleRecords.map((rec) => ({
          contentSetId: rec.contentSetId,
          totalCount: 0,
          contentSetStatus: [],
        })),
      }),
      labelContextInLabeling: staticData({ inLabeling: false }),
      labelContextEnable: staticData({ enable: true }),
      labelSearch: staticData({
        list: [],
        totalCount: 0,
        filter: {
          labelContextId: { operator: "EQ", value: "lctx-demo" },
        },
      }),
      previousLabelContexts: staticData([]),
      validResultSearch: staticData({
        list: [],
        totalCount: 0,
        filter: {},
      }),
    }),
    [],
  );

  const datasetCtx = useMemo<LabelingDatasetContextValue>(
    () => ({
      datasetDetail: staticData(buildDataset()),
      datasetContents: staticData({
        code: 200,
        message: "OK",
        data: { list: records, totalCount: records.length },
      }),
      datasetContentDetail: staticData(
        selectedContentSetId
          ? buildContentDetail(selectedContentSetId)
          : buildContentDetail(sampleRecords[0].contentSetId),
      ),
    }),
    [records, selectedContentSetId],
  );

  return { dataCtx, datasetCtx };
}

// ─── Seed stores ────────────────────────────────────────────────

function useSeedFilterStore() {
  useEffect(() => {
    useFilterStore.getState().setFilter({
      policyIds: { operator: "IN", value: POLICY_IDS },
      datasetId: { operator: "EQ", value: DATASET_ID },
      datasetVersion: { operator: "EQ", value: DATASET_VERSION },
    });
  }, []);
}

function useSeedSelectionStore() {
  const setSelectionSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (s) => s.setSelectionSnapshot,
  );

  useEffect(() => {
    const firstRecord = sampleRecords[0];
    const img = sampleImages[firstRecord.contentSetId];
    setSelectionSnapshot({
      columns: ["endpointUrl"],
      rows: [{ endpointUrl: img.url }],
      recordName: firstRecord.label,
      columnName: null,
      contentType: "IMAGE",
      contentSetId: firstRecord.contentSetId,
      schemaName: firstRecord.schemaName,
      elementId: null,
      selectedRows: [0],
    });
  }, [setSelectionSnapshot]);
}

// ─── App ────────────────────────────────────────────────────────

export default function App() {
  useSeedFilterStore();
  useSeedSelectionStore();

  const { dataCtx, datasetCtx } = useProviderData();

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <LabelingProviders
        data={dataCtx}
        mutations={MUTATIONS_CTX}
        dataset={datasetCtx}
      >
        <LabelingWorkspace />
      </LabelingProviders>
    </div>
  );
}
