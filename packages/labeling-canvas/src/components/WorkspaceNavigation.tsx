import { useEffect, useMemo } from "react";

import { Button, Icon } from "@/components";
import {
  CELL_SELECTION_KEY_PREFIX,
  COLUMN_SELECTION_KEY_PREFIX,
  ROW_SELECTION_KEY_PREFIX,
  VIRTUALIZED_RECORDS_ROW_META_SYMBOL,
  type VirtualizedRowMeta,
} from "@/components/organisms/VirtualizedRecordsTable";
import type { SearchOperatorValue } from "@/features/content-group/queries";
import useDatasetDetailPageData from "@/features/dataset/hooks/useDatasetDetailPageData";
import type { DatasetContentVersion } from "@/features/dataset/queries";
import {
  useWorkspaceLayoutStore,
  useWorkspaceNavigationActiveStore,
} from "@/store/workspaceLayout.store";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";

import { useLabelContextStatusMap } from "../hooks/useLabelContextStatusMap";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceNavigationFilteredRowsStore } from "../store/workspaceNavigationFilteredRows.store";
import type { LabelingSchemaEntry } from "../types/recordSelection";
import {
  applyLabelingRecordStatusAccessories,
  buildSchemaSummaryCountMap,
} from "../utils/recordStatusAccessories";
import {
  buildLabelingRows,
  buildLabelingSchemaEntries,
} from "./LabelingRecordsSection";
import {
  LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL,
  type LabelingRecordsCellAccessoriesMap,
  type LabelingRecordsTableRow,
} from "./LabelingRecordsTable";
import WorkspaceNavigationTable from "./WorkspaceNavigationTable";

const CELL_SELECTION_KEY_SEPARATOR = "::";
function resolveTableSelectedItemKeys(rawValue: unknown): string[] | null {
  if (!rawValue) {
    return null;
  }
  if (Array.isArray(rawValue)) {
    return rawValue.filter(
      (item): item is string => typeof item === "string" && item.length > 0
    );
  }
  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string" && item.length > 0
        );
      }
    } catch {
      // ignore parse error
    }
    return [trimmed];
  }
  if (typeof rawValue === "object") {
    const candidate = rawValue as { value?: unknown };
    const value = candidate.value;
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string => typeof item === "string" && item.length > 0
      );
    }
    if (value && typeof value === "object") {
      const nestedValue = (value as { value?: unknown }).value;
      if (Array.isArray(nestedValue)) {
        return nestedValue.filter(
          (item): item is string => typeof item === "string" && item.length > 0
        );
      }
    }
  }
  return null;
}

interface SelectionContext {
  rowOrder: string[] | null;
  rowColumnFilters: Map<string, Set<string> | null> | null;
  columnFilters: Set<string> | null;
}

function parseRowIdFromSelection(key: string): string | null {
  if (key.startsWith(ROW_SELECTION_KEY_PREFIX)) {
    const rowId = key.slice(ROW_SELECTION_KEY_PREFIX.length);
    return rowId.length > 0 ? rowId : null;
  }
  return null;
}

function parseCellSelectionKey(
  key: string
): { rowId: string; columnId: string } | null {
  if (!key.startsWith(CELL_SELECTION_KEY_PREFIX)) {
    return null;
  }
  const remainder = key.slice(CELL_SELECTION_KEY_PREFIX.length);
  const separatorIndex = remainder.indexOf(CELL_SELECTION_KEY_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }
  const rowId = remainder.slice(0, separatorIndex);
  const columnId = remainder.slice(
    separatorIndex + CELL_SELECTION_KEY_SEPARATOR.length
  );
  if (!rowId || !columnId) {
    return null;
  }
  return { rowId, columnId };
}

function getRowIdFromRow(row: LabelingRecordsTableRow, index: number): string {
  const meta = row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
    | VirtualizedRowMeta
    | undefined;
  if (typeof meta?.rowId === "string" && meta.rowId.length > 0) {
    return meta.rowId;
  }
  const rowRef = meta?.rowRef as { id?: string | number } | undefined;
  if (typeof rowRef?.id === "string" && rowRef.id.length > 0) {
    return rowRef.id;
  }
  if (typeof rowRef?.id === "number") {
    return String(rowRef.id);
  }
  return String(index);
}

function WorkspaceNavigation() {
  const direction = useWorkspaceLayoutStore((state) => state.direction);
  const setDirection = useWorkspaceLayoutStore((state) => state.setDirection);
  const active = useWorkspaceNavigationActiveStore((state) => state.active);
  const { filter, setFilter } = useFilterBySearchParams();

  const datasetIdFilterValue =
    (filter.datasetId as SearchOperatorValue<string>)?.value ?? "";
  const datasetVersionFilterValue =
    (filter.datasetVersion as SearchOperatorValue<DatasetContentVersion>)
      ?.value ??
    (filter.version as SearchOperatorValue<DatasetContentVersion>)?.value ??
    null;

  const tableSelectedItemKeys = useMemo<string[] | null>(() => {
    const filterValue = (
      filter.tableSelectedItems as SearchOperatorValue<unknown>
    )?.value;
    return resolveTableSelectedItemKeys(
      filterValue ?? (filter.tableSelectedItems as unknown)
    );
  }, [filter.tableSelectedItems]);

  const { dataset, contentRecords, schemaList } = useDatasetDetailPageData({
    datasetId: datasetIdFilterValue,
    version: datasetVersionFilterValue,
  });

  const schemaEntries = useMemo<LabelingSchemaEntry[]>(
    () => buildLabelingSchemaEntries(schemaList ?? [], contentRecords ?? []),
    [contentRecords, schemaList]
  );

  const rows = useMemo<LabelingRecordsTableRow[]>(
    () =>
      buildLabelingRows(schemaEntries, contentRecords ?? [], dataset ?? null),
    [schemaEntries, contentRecords, dataset]
  );
  const { contentSetStatusMap, schemaStatusMap } = useLabelContextStatusMap({
    datasetId: datasetIdFilterValue,
    datasetVersion: datasetVersionFilterValue,
  });

  const schemaSummaryCountMap = useMemo(() => {
    return buildSchemaSummaryCountMap(contentRecords ?? []);
  }, [contentRecords]);

  const rowsWithAccessories = useMemo<LabelingRecordsTableRow[]>(() => {
    return applyLabelingRecordStatusAccessories({
      rows,
      schemaEntries,
      contentSetStatusMap,
      schemaStatusMap,
      schemaSummaryCountMap,
    });
  }, [
    contentSetStatusMap,
    rows,
    schemaEntries,
    schemaStatusMap,
    schemaSummaryCountMap,
  ]);

  const rowSelectionSet = useMemo<Set<string>>(() => {
    if (!Array.isArray(tableSelectedItemKeys)) {
      return new Set();
    }
    return new Set(
      tableSelectedItemKeys
        .map((item) => parseRowIdFromSelection(item))
        .filter((rowId): rowId is string => Boolean(rowId))
    );
  }, [tableSelectedItemKeys]);

  const selectionContext = useMemo<SelectionContext>(() => {
    if (
      !Array.isArray(tableSelectedItemKeys) ||
      tableSelectedItemKeys.length === 0
    ) {
      return {
        rowOrder: null,
        rowColumnFilters: null,
        columnFilters: null,
      };
    }
    const rowOrder: string[] = [];
    const rowColumnFilters = new Map<string, Set<string> | null>();
    const columnFilters = new Set<string>();

    tableSelectedItemKeys.forEach((item: string) => {
      if (typeof item !== "string" || item.length === 0) {
        return;
      }

      if (item.startsWith(ROW_SELECTION_KEY_PREFIX)) {
        const rowId = parseRowIdFromSelection(item);
        if (!rowId) {
          return;
        }
        if (!rowColumnFilters.has(rowId)) {
          rowOrder.push(rowId);
        }
        rowColumnFilters.set(rowId, null);
        return;
      }

      const cellSelection = parseCellSelectionKey(item);
      if (cellSelection) {
        const { rowId, columnId } = cellSelection;
        if (!rowColumnFilters.has(rowId)) {
          rowOrder.push(rowId);
          rowColumnFilters.set(rowId, new Set([columnId]));
          return;
        }
        const existing = rowColumnFilters.get(rowId);
        if (!existing) {
          return;
        }
        existing.add(columnId);
        return;
      }

      if (item.startsWith(COLUMN_SELECTION_KEY_PREFIX)) {
        const columnId = item.slice(COLUMN_SELECTION_KEY_PREFIX.length);
        if (columnId.length > 0) {
          columnFilters.add(columnId);
        }
      }
    });

    return {
      rowOrder: rowOrder.length > 0 ? rowOrder : null,
      rowColumnFilters: rowOrder.length > 0 ? rowColumnFilters : null,
      columnFilters: columnFilters.size > 0 ? columnFilters : null,
    };
  }, [tableSelectedItemKeys]);

  const filteredRows = useMemo<LabelingRecordsTableRow[]>(() => {
    if (!rowsWithAccessories.length) {
      return rowsWithAccessories;
    }

    const { rowOrder, rowColumnFilters, columnFilters } = selectionContext;
    const hasRowFilter = Boolean(rowOrder?.length);
    const hasColumnFilter = Boolean(columnFilters?.size);

    if (!hasRowFilter && !hasColumnFilter) {
      return rowsWithAccessories;
    }

    const applyColumnFilter = (
      row: LabelingRecordsTableRow,
      specificColumns: ReadonlySet<string> | null
    ): LabelingRecordsTableRow | null => {
      const targetColumns =
        specificColumns ??
        (hasColumnFilter && columnFilters
          ? (columnFilters as ReadonlySet<string>)
          : null);

      if (!targetColumns) {
        return row;
      }
      if (targetColumns.size === 0) {
        return null;
      }

      const nextRow: LabelingRecordsTableRow = {};
      targetColumns.forEach((columnId) => {
        if (Object.prototype.hasOwnProperty.call(row, columnId)) {
          nextRow[columnId] = row[columnId];
        }
      });

      if (Object.keys(nextRow).length === 0) {
        return null;
      }

      const meta = row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
        | VirtualizedRowMeta
        | undefined;
      if (meta) {
        nextRow[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] = meta;
      }

      const accessories = row[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] as
        | LabelingRecordsCellAccessoriesMap
        | undefined;
      if (accessories) {
        const filteredAccessories: LabelingRecordsCellAccessoriesMap = {};
        if (accessories.__rownum) {
          filteredAccessories.__rownum = accessories.__rownum;
        }
        targetColumns.forEach((columnId) => {
          const accessory = accessories[columnId];
          if (accessory) {
            filteredAccessories[columnId] = accessory;
          }
        });
        if (Object.keys(filteredAccessories).length > 0) {
          nextRow[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] =
            filteredAccessories;
        }
      }

      return nextRow;
    };

    if (!hasRowFilter) {
      return rowsWithAccessories
        .map((row) => applyColumnFilter(row, null))
        .filter((row): row is LabelingRecordsTableRow => Boolean(row));
    }

    const rowMap = new Map<string, LabelingRecordsTableRow>();
    rowsWithAccessories.forEach((row, index) => {
      const rowId = getRowIdFromRow(row, index);
      rowMap.set(rowId, row);
    });

    return (rowOrder ?? [])
      .map((rowId) => {
        const row = rowMap.get(rowId);
        if (!row) {
          return null;
        }
        const specificColumns = rowColumnFilters?.get(rowId) ?? null;
        return applyColumnFilter(row, specificColumns);
      })
      .filter((row): row is LabelingRecordsTableRow => Boolean(row));
  }, [rowsWithAccessories, selectionContext]);

  const schemaNameToContentType = useMemo<Record<string, string>>(
    () =>
      schemaEntries.reduce<Record<string, string>>((map, entry) => {
        map[entry.label] = entry.contentType;
        return map;
      }, {}),
    [schemaEntries]
  );
  const setFilteredRowsStore = useWorkspaceNavigationFilteredRowsStore(
    (state) => state.setFilteredRows
  );
  const clearFilteredRowsStore = useWorkspaceNavigationFilteredRowsStore(
    (state) => state.clearFilteredRows
  );
  const setDetailContext = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.setContext
  );
  const clearDetailSelection = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.clearSelection
  );
  const setDetailActiveRow = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.setActiveRowId
  );

  useEffect(() => {
    setFilteredRowsStore(filteredRows);
  }, [filteredRows, setFilteredRowsStore]);

  useEffect(() => {
    return () => {
      clearFilteredRowsStore();
    };
  }, [clearFilteredRowsStore]);

  useEffect(() => {
    setDetailContext(null);
    clearDetailSelection();
    setDetailActiveRow(null);
  }, [
    datasetIdFilterValue,
    datasetVersionFilterValue,
    setDetailContext,
    clearDetailSelection,
    setDetailActiveRow,
  ]);

  useEffect(() => {
    if (!filteredRows.length) {
      const { datasetId, datasetVersion, policyIds } = filter;
      const datasetIdValue =
        (datasetId as SearchOperatorValue<string>)?.value ?? "";
      const datasetVersionValue =
        (datasetVersion as SearchOperatorValue<DatasetContentVersion>)?.value ??
        "";
      setFilter(
        { policyIds },
        `/data-curation/labeling/${datasetIdValue}/${datasetVersionValue}`
      );
    }
  }, [filteredRows, filter, setFilter]);

  return (
    <div
      style={active ? undefined : { display: "none" }}
      className={`content__navigation-wrapper ${direction === "vertical" ? "content__navigation-wrapper--bottom" : "content__navigation-wrapper--left"} `}
    >
      <div className="navigation-wrapper">
        <div className="navigation__title">
          <div className="title">
            <p>Navigation</p>
          </div>
          <div className="util">
            <Button
              size="sm"
              style="transparent"
              className={`${direction === "horizontal" ? "selected" : ""}`}
              onClick={() => setDirection("horizontal")}
            >
              <Icon iconType="icon-sidebar" size="xs" />
            </Button>
            <Button
              size="sm"
              style="transparent"
              className={`${direction === "vertical" ? "selected" : ""}`}
              onClick={() => setDirection("vertical")}
            >
              <Icon iconType="icon-bottombar" size="xs" />
            </Button>
          </div>
        </div>

        <div className="navigation__content">
          <WorkspaceNavigationTable
            rows={filteredRows}
            schemaNameToContentType={schemaNameToContentType}
            schemaStatusMap={schemaStatusMap}
            disableAutoExpand={false}
            initialSelectedRowId={
              rowSelectionSet.size > 0 ? Array.from(rowSelectionSet)[0] : null
            }
          />
        </div>
      </div>
    </div>
  );
}

export default WorkspaceNavigation;
