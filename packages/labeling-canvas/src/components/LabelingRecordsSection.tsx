import { useCallback, useEffect, useMemo } from "react";

import { useParams } from "@tanstack/react-router";

import type { IconName } from "@/components/atoms/Icon";
import Tip from "@/components/molecules/Tip";
import {
  VIRTUALIZED_RECORDS_ROW_META_SYMBOL,
  type VirtualizedRecordsTableCellClickPayload,
  type VirtualizedRecordsTableSelection,
  type VirtualizedRowMeta,
} from "@/components/organisms/VirtualizedRecordsTable";
import { useFocusZone } from "@/features/content-group/hooks/useFocusZone";
import useDatasetDetailPageData from "@/features/dataset/hooks/useDatasetDetailPageData";
import type {
  DatasetContentRecord,
  DatasetDTO,
  SchemaItemDTO,
} from "@/features/dataset/types/domain";
import {
  getSchemaSummaryCount,
  resolveRecordRowId,
} from "@/features/dataset/utils/contentRecords";

import { useLabelContextStatusMap } from "../hooks/useLabelContextStatusMap";
import { useLabelingRecordSelectionStore } from "../store/labelingRecordSelection.store";
import type {
  LabelingDatasetCellReference,
  LabelingRecordSelection,
  LabelingSchemaEntry,
} from "../types/recordSelection";
import {
  applyLabelingRecordStatusAccessories,
  buildSchemaSummaryCountMap,
} from "../utils/recordStatusAccessories";
import LabelingRecordsTable, {
  LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL,
  type LabelingRecordsCellAccessoriesMap,
  type LabelingRecordsTableRow,
} from "./LabelingRecordsTable";

function normalizeKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function ensureUniqueLabel(
  baseLabel: string,
  tracker: Map<string, number>
): string {
  const normalized =
    baseLabel.trim().length > 0 ? baseLabel.trim() : "Unnamed schema";
  const count = tracker.get(normalized) ?? 0;
  tracker.set(normalized, count + 1);
  if (count === 0) {
    return normalized;
  }
  return `${normalized} (${count + 1})`;
}

export function buildLabelingSchemaEntries(
  schemaList: SchemaItemDTO[],
  records: DatasetContentRecord[]
): LabelingSchemaEntry[] {
  const labelTracker = new Map<string, number>();
  const summaryKeySet = new Set<string>();
  const entries: LabelingSchemaEntry[] = [];

  const addEntry = (
    baseLabel: string,
    summaryCandidates: (string | null | undefined)[],
    contentType: string,
    schema?: SchemaItemDTO,
    meta?: {
      isRequired?: boolean;
      maxItems?: number | string | null;
      detailSchemaNames?: (string | null | undefined)[];
    }
  ) => {
    const label = ensureUniqueLabel(baseLabel, labelTracker);
    const candidateKeys = (meta?.detailSchemaNames ?? summaryCandidates)
      .map((candidate) => normalizeKey(candidate))
      .filter((candidate): candidate is string => Boolean(candidate));

    const normalizedSummaryKeys = [
      label,
      ...candidateKeys.filter((key) => key !== label),
    ].filter((key, index, array) => array.indexOf(key) === index);

    const detailSchemaNames =
      candidateKeys.length > 0 ? candidateKeys : [label];

    entries.push({
      label,
      summaryKeys: normalizedSummaryKeys,
      detailSchemaNames,
      contentType,
      schema,
      isRequired: Boolean(meta?.isRequired),
      maxItems:
        typeof meta?.maxItems === "number"
          ? meta.maxItems
          : (meta?.maxItems ?? null),
    });

    normalizedSummaryKeys.forEach((key) => summaryKeySet.add(key));
  };

  schemaList.forEach((schema, index) => {
    const baseInfo = schema.baseInfo ?? {};
    const preferredName =
      typeof baseInfo.schemaName === "string" && baseInfo.schemaName.trim()
        ? baseInfo.schemaName.trim()
        : `Schema ${index + 1}`;

    const candidateNames = [
      preferredName,
      baseInfo.schemaName,
      baseInfo.schemaId,
    ]
      .map((name) => (typeof name === "string" ? name.trim() : ""))
      .filter((name, idx, arr) => name.length > 0 && arr.indexOf(name) === idx);

    const contentType =
      typeof baseInfo.contentType === "string" &&
      baseInfo.contentType.trim().length > 0
        ? baseInfo.contentType.trim()
        : "CUSTOM";
    const maxItems =
      typeof baseInfo.contentSize === "number"
        ? baseInfo.contentSize
        : (baseInfo.contentSize ?? null);

    addEntry(preferredName, candidateNames, contentType, schema, {
      isRequired: Boolean(baseInfo.isRequired),
      maxItems,
      detailSchemaNames: candidateNames,
    });
  });

  records.forEach((record) => {
    Object.keys(record.summary ?? {}).forEach((rawKey) => {
      const key = normalizeKey(rawKey);
      if (!key || summaryKeySet.has(key)) {
        return;
      }
      addEntry(key, [key], "CUSTOM", undefined, {
        isRequired: false,
        maxItems: null,
        detailSchemaNames: [key],
      });
    });
  });

  if (!entries.length && records.length > 0) {
    addEntry("Records", [], "CUSTOM", undefined, {
      isRequired: false,
      maxItems: null,
      detailSchemaNames: ["Records"],
    });
  }

  return entries;
}

function formatSummaryValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? "-" : value.toLocaleString();
  }
  if (typeof value === "string") {
    return value.trim().length > 0 ? value : "-";
  }
  if (Array.isArray(value)) {
    const joined = value
      .map((item) => {
        if (item === null || item === undefined) {
          return "";
        }
        if (typeof item === "object") {
          return JSON.stringify(item);
        }
        return String(item);
      })
      .filter((entry) => entry.length > 0)
      .join(", ");
    return joined.length > 0 ? joined : "-";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return JSON.stringify(value);
}

function resolveSummaryValue(
  record: DatasetContentRecord,
  entry: LabelingSchemaEntry
): unknown {
  const summary = record.summary ?? {};
  for (const key of entry.summaryKeys) {
    if (Object.prototype.hasOwnProperty.call(summary, key)) {
      return summary[key];
    }
  }
  if (entry.schema) {
    const fallback = getSchemaSummaryCount(record, entry.schema);
    if (fallback != null) {
      return fallback;
    }
  }
  return undefined;
}

export function buildLabelingRows(
  schemaEntries: LabelingSchemaEntry[],
  records: DatasetContentRecord[],
  dataset: DatasetDTO | null
): LabelingRecordsTableRow[] {
  if (!records.length || !schemaEntries.length) {
    return [];
  }

  return records.map((record, index) => {
    const row: LabelingRecordsTableRow = {};
    const accessories: LabelingRecordsCellAccessoriesMap = {};
    const columnRefs: Record<string, LabelingDatasetCellReference> = {};

    schemaEntries.forEach((entry) => {
      const resolvedValue = resolveSummaryValue(record, entry);
      const value =
        resolvedValue !== undefined || entry.summaryKeys.length > 0
          ? resolvedValue
          : index + 1;
      row[entry.label] = formatSummaryValue(value);

      const schemaNames = entry.detailSchemaNames;
      const datasetIdForDetail =
        typeof record.datasetId === "string" && record.datasetId.trim().length
          ? record.datasetId
          : (dataset?.id ?? "");
      const versionRaw =
        typeof record.version === "string" && record.version.trim().length > 0
          ? record.version.trim()
          : typeof record.version === "number" &&
              Number.isFinite(record.version)
            ? record.version
            : null;
      const recordWithIds = record as {
        contentSetId?: string;
        contentSetsId?: string;
      };
      const trimmedContentSetId =
        typeof recordWithIds.contentSetId === "string" &&
        recordWithIds.contentSetId.trim().length > 0
          ? recordWithIds.contentSetId.trim()
          : typeof recordWithIds.contentSetsId === "string" &&
              recordWithIds.contentSetsId.trim().length > 0
            ? recordWithIds.contentSetsId.trim()
            : null;
      const contentSetIdForDetail =
        trimmedContentSetId ??
        (typeof record.id === "string" && record.id.trim().length > 0
          ? record.id.trim()
          : `record-${index}`);

      if (
        datasetIdForDetail &&
        typeof versionRaw === "string" &&
        versionRaw.length > 0 &&
        contentSetIdForDetail &&
        schemaNames.length > 0
      ) {
        columnRefs[entry.label] = {
          datasetId: datasetIdForDetail,
          version: versionRaw,
          contentSetId: contentSetIdForDetail,
          schemaNames,
          schemaLabel: entry.label,
          contentType: entry.contentType,
          isRequired: entry.isRequired,
          maxItems: entry.maxItems,
          showIntProps: true,
        };
      }
    });

    const rowMeta: VirtualizedRowMeta = {
      rowRef: record,
      rowId: resolveRecordRowId(record, `record-${index}`),
      columnRefs,
    };
    row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] = rowMeta;

    if (Object.keys(accessories).length > 0) {
      row[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] = accessories;
    }

    return row;
  });
}

const MSG_LOADING_DATASET = "Loading dataset records…";
const MSG_DATASET_REQUIRED = "Select a dataset to view records.";
const MSG_DATASET_ERROR = "Failed to load dataset information.";
const MSG_CONTENTS_ERROR = "Failed to load dataset records.";
const MSG_SCHEMA_REQUIRED =
  "Define at least one schema to view labeling records.";

interface TipContentConfig {
  content: string;
  iconType?: IconName;
  title?: string;
  style?: "primary" | "secondary" | "accent";
}

function renderTipContent({
  content,
  iconType = "icon-warning",
  title = "Notice",
  style = "accent",
}: TipContentConfig) {
  return (
    <Tip
      iconType={iconType}
      title={title}
      content={content}
      style={style}
      isClosable={false}
    />
  );
}

function LabelingRecordsSection() {
  const { datasetId, datasetVersion } = useParams({
    from: "/data-curation/labeling/{-$datasetId}/{-$datasetVersion}/" as never,
  });
  const tableSelectedItems = useLabelingRecordSelectionStore(
    (state) => state.tableSelectedItems
  );
  const setTableSelectedItems = useLabelingRecordSelectionStore(
    (state) => state.setTableSelectedItems
  );

  const tableSelection = useMemo<VirtualizedRecordsTableSelection>(
    () => ({
      modes: ["row", "column", "cell"],
      selectedItems: tableSelectedItems,
      setSelectedItems: setTableSelectedItems,
    }),
    [setTableSelectedItems, tableSelectedItems]
  );

  const {
    dataset,
    contentRecords,
    schemaList,
    isDatasetLoading,
    isDatasetError,
    datasetError,
    isContentsLoading,
    isContentsError,
    contentsError,
  } = useDatasetDetailPageData({
    datasetId,
    version: datasetVersion,
  });

  const schemaEntries = useMemo<LabelingSchemaEntry[]>(
    () => buildLabelingSchemaEntries(schemaList ?? [], contentRecords ?? []),
    [contentRecords, schemaList]
  );

  const baseRows = useMemo<LabelingRecordsTableRow[]>(
    () =>
      buildLabelingRows(schemaEntries, contentRecords ?? [], dataset ?? null),
    [schemaEntries, contentRecords, dataset]
  );

  const { contentSetStatusMap, schemaStatusMap } = useLabelContextStatusMap({
    datasetId,
    datasetVersion,
  });

  const schemaSummaryCountMap = useMemo(() => {
    return buildSchemaSummaryCountMap(contentRecords ?? []);
  }, [contentRecords]);

  const rows = useMemo<LabelingRecordsTableRow[]>(() => {
    return applyLabelingRecordStatusAccessories({
      rows: baseRows,
      schemaEntries,
      contentSetStatusMap,
      schemaStatusMap,
      schemaSummaryCountMap,
    });
  }, [
    baseRows,
    contentSetStatusMap,
    schemaEntries,
    schemaStatusMap,
    schemaSummaryCountMap,
  ]);

  const schemaNameToContentType = useMemo<Record<string, string>>(
    () =>
      schemaEntries.reduce<Record<string, string>>((map, entry) => {
        map[entry.label] = entry.contentType;
        return map;
      }, {}),
    [schemaEntries]
  );

  const rowInfoById = useMemo<
    Map<
      string,
      {
        record: DatasetContentRecord;
        displayRow: LabelingRecordsTableRow;
        accessories?: LabelingRecordsCellAccessoriesMap;
        columnRefs?: Record<string, LabelingDatasetCellReference>;
        rowIndex: number;
      }
    >
  >(() => {
    const map = new Map<
      string,
      {
        record: DatasetContentRecord;
        displayRow: LabelingRecordsTableRow;
        accessories?: LabelingRecordsCellAccessoriesMap;
        columnRefs?: Record<string, LabelingDatasetCellReference>;
        rowIndex: number;
      }
    >();

    rows.forEach((row, index) => {
      const meta = row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
        | VirtualizedRowMeta
        | undefined;
      const rowId = meta?.rowId;
      const record = meta?.rowRef as DatasetContentRecord | undefined;
      if (rowId && record) {
        map.set(rowId, {
          record,
          displayRow: row,
          accessories: row[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL],
          columnRefs: meta?.columnRefs as
            | Record<string, LabelingDatasetCellReference>
            | undefined,
          rowIndex: index,
        });
      }
    });

    return map;
  }, [rows]);

  const selectionState = useLabelingRecordSelectionStore(
    (state) => state.selection
  );
  const setRecordSelection = useLabelingRecordSelectionStore(
    (state) => state.setSelection
  );

  let fallbackContent: JSX.Element | null = null;

  if (isDatasetLoading && !dataset) {
    fallbackContent = renderTipContent({
      content: MSG_LOADING_DATASET,
      iconType: "icon-warning",
      title: "Notice",
      style: "accent",
    });
  } else if (isDatasetError) {
    const message =
      datasetError instanceof Error ? datasetError.message : undefined;
    fallbackContent = renderTipContent({
      content: message ? `${MSG_DATASET_ERROR} ${message}` : MSG_DATASET_ERROR,
      iconType: "icon-warning",
      title: "Error",
      style: "primary",
    });
  } else if (!dataset) {
    fallbackContent = renderTipContent({
      content: MSG_DATASET_REQUIRED,
      iconType: "icon-warning",
      title: "Notice",
      style: "accent",
    });
  } else if (isContentsError) {
    const message =
      contentsError instanceof Error ? contentsError.message : undefined;
    fallbackContent = renderTipContent({
      content: message
        ? `${MSG_CONTENTS_ERROR} ${message}`
        : MSG_CONTENTS_ERROR,
      iconType: "icon-warning",
      title: "Error",
      style: "primary",
    });
  } else if (isContentsLoading && !rows.length) {
    fallbackContent = renderTipContent({
      content: MSG_LOADING_DATASET,
      iconType: "icon-warning",
      title: "Notice",
      style: "accent",
    });
  } else if (!schemaEntries.length) {
    fallbackContent = renderTipContent({
      content: MSG_SCHEMA_REQUIRED,
      iconType: "icon-warning",
      title: "Notice",
      style: "accent",
    });
  }

  const hasFallback = fallbackContent !== null;

  const focusZone = useFocusZone({
    zone: "labeling-content",
    id: "labeling-records-section",
    takeOverOnMount: true,
  });

  const handleCellClick = useCallback(
    (payload: VirtualizedRecordsTableCellClickPayload) => {
      if (hasFallback || !schemaEntries.length) {
        return;
      }
      const rowMeta = payload.row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
        | VirtualizedRowMeta
        | undefined;
      const rowId = rowMeta?.rowId;
      if (!rowId) {
        return;
      }
      const info = rowInfoById.get(rowId);
      if (!info) {
        return;
      }

      const reference =
        (payload.reference as LabelingDatasetCellReference | undefined) ??
        (info.columnRefs ? Object.values(info.columnRefs)[0] : undefined);

      const selectionPayload: LabelingRecordSelection = {
        datasetId: dataset?.id ?? null,
        record: info.record,
        displayRow: info.displayRow,
        schemaEntries,
        schemaNameToContentType,
        accessories: info.accessories,
        detailReference: reference,
        rowIndex: info.rowIndex,
        rowId,
      };
      setRecordSelection(selectionPayload);
      payload.event.preventDefault();
      payload.event.stopPropagation();
    },
    [
      dataset?.id,
      hasFallback,
      rowInfoById,
      schemaEntries,
      schemaNameToContentType,
      setRecordSelection,
    ]
  );

  useEffect(() => {
    if (hasFallback || !schemaEntries.length) {
      if (selectionState) {
        setRecordSelection(null);
      }
      return;
    }

    if (!selectionState) {
      return;
    }

    const { rowId } = selectionState;
    if (!rowId) {
      setRecordSelection(null);
      return;
    }

    const info = rowInfoById.get(rowId);
    if (!info) {
      setRecordSelection(null);
      return;
    }

    const columnRefs = info.columnRefs ?? {};
    let reference = selectionState.detailReference;
    const referenceContentSetId =
      reference?.contentSetId ??
      (reference as unknown as { contentSetsId?: string | null })
        ?.contentSetsId ??
      undefined;

    if (
      reference &&
      !Object.values(columnRefs).some(
        (ref) =>
          ((ref as { contentSetId?: string; contentSetsId?: string })
            .contentSetId ??
            (ref as { contentSetId?: string; contentSetsId?: string })
              .contentSetsId) === referenceContentSetId &&
          ref.schemaLabel === reference?.schemaLabel
      )
    ) {
      reference = undefined;
    }
    if (!reference && Object.values(columnRefs).length > 0) {
      reference = Object.values(columnRefs)[0];
    }

    const currentDetailKey = selectionState.detailReference
      ? `${
          selectionState.detailReference.contentSetId ??
          (
            selectionState.detailReference as unknown as {
              contentSetsId?: string;
            }
          ).contentSetsId ??
          ""
        }::${selectionState.detailReference.schemaLabel}`
      : "__empty__";
    const nextDetailKey = reference
      ? `${
          reference.contentSetId ??
          (reference as unknown as { contentSetsId?: string }).contentSetsId ??
          ""
        }::${reference.schemaLabel}`
      : "__empty__";

    const datasetIdForSelection = dataset?.id ?? null;

    if (
      selectionState.datasetId === datasetIdForSelection &&
      selectionState.record === info.record &&
      selectionState.rowIndex === info.rowIndex &&
      currentDetailKey === nextDetailKey &&
      selectionState.schemaEntries === schemaEntries &&
      selectionState.schemaNameToContentType === schemaNameToContentType &&
      selectionState.accessories === info.accessories
    ) {
      return;
    }

    setRecordSelection({
      datasetId: datasetIdForSelection,
      record: info.record,
      displayRow: info.displayRow,
      schemaEntries,
      schemaNameToContentType,
      accessories: info.accessories,
      detailReference: reference,
      rowIndex: info.rowIndex,
      rowId,
    });
  }, [
    dataset?.id,
    hasFallback,
    rowInfoById,
    schemaEntries,
    schemaNameToContentType,
    selectionState,
    setRecordSelection,
  ]);

  return (
    <div
      className={focusZone.getContainerClassName(
        "content-main-section__content content-main-section__content--record"
      )}
      onClick={(e) => {
        focusZone.onClickFocus(e);
        const target = e.target as HTMLElement;
        // Ignore clicks inside folder elements
        if (target.closest(".folder-wrapper")) return;
        // selectGroup(null);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          focusZone.onClickFocus(e);
          // selectGroup(null);
        }
      }}
    >
      {fallbackContent ? (
        fallbackContent
      ) : (
        <>
          <Tip
            iconType="icon-information-white"
            title="Information"
            content="To start the labeling process, first select the desired Rows, Columns, or Cells."
            style="primary"
            className="mb-4"
            isClosable={true}
            onClose={() => {}}
          />
          <LabelingRecordsTable
            rows={rows}
            schemaNameToContentType={schemaNameToContentType}
            selection={tableSelection}
            onCellClick={handleCellClick}
          />
        </>
      )}
    </div>
  );
}

export default LabelingRecordsSection;

/*
Legacy static table markup (for reference)

<div className="table-wrapper">
  <table className="table-content table-content-default table-content-record">
    <thead className="table__header-wrapper">
      <tr className="table__header-tr table-tr">
        <th className="table__header-th table-th">
          <div className="table-th__content">
            <Checkbox id="" name="" />
          </div>
        </th>
        <th className="table__header-th table-th">
          <div className="table-th__content"></div>
        </th>
        <th className="table__header-th table-th">
          <div className="table-th__content">
            <Icon iconType="icon-file-image" />
            <span>Keyboard Image</span>
          </div>
        </th>
        <th className="table__header-th table-th">
          <div className="table-th__content">
            <span>Defect Rate</span>
          </div>
        </th>
      </tr>
    </thead>
    <tbody className="table__body-wrapper">
      <tr className="table__body-tr table-tr">
        <td className="table__body-td table-td">
          <div className="table-td__content">
            <Checkbox id="" name="" />
          </div>
        </td>
        <td className="table__body-td table-td">
          <div className="table-td__content">
            <span>1</span>
            <div className="table-td__content-util">
              <Badge title="Labeled" style="primary-light" />
              <Icon iconType="icon-issue" style="accent" />
            </div>
          </div>
        </td>
        <td className="table__body-td table-td">
          <div className="table-td__content">
            <Icon iconType="icon-file-image" />
            <span>108</span>
            <div className="table-td__content-util">
              <Badge title="in Progress" style="secondary-light" />
              <Icon iconType="icon-issue" style="accent" />
            </div>
          </div>
        </td>
        <td className="table__body-td table-td">
          <div className="table-td__content">
            <span>0.02</span>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</div>
*/
