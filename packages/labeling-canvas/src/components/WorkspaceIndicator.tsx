import { useEffect, useMemo } from "react";

import {
  VIRTUALIZED_RECORDS_ROW_META_SYMBOL,
  type VirtualizedRowMeta,
} from "@/components/organisms/VirtualizedRecordsTable";
import type { SearchOperatorValue } from "@/features/content-group/queries";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";

import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceNavigationFilteredRowsStore } from "../store/workspaceNavigationFilteredRows.store";

export default function WorkspaceIndicator() {
  const filteredRows = useWorkspaceNavigationFilteredRowsStore(
    (state) => state.filteredRows
  );
  const selectedRows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.selectedRows
  );
  const detailRows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.rows
  );
  const contentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );
  const activeRowId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.activeRowId
  );
  const columnName = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.columnName
  );
  const clearSelection = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.clearSelection
  );
  const { filter } = useFilterBySearchParams();

  const isTableType = (contentType ?? "").toUpperCase() === "TABLE";

  const indicatorState = useMemo(() => {
    if (!filteredRows.length) {
      return {
        recordName: "",
        schemaName: "",
        contentName: "",
        currentIndex: 0,
        totalCount: 0,
        isRecordLabelingMode: false,
      };
    }
    const isRecordLabelingMode =
      (
        filter.tableSelectedItems as SearchOperatorValue<string[]>
      )?.value?.[0]?.includes("row") &&
      !selectedRows.length &&
      contentType !== "TABLE";
    const selectedRowIndex = selectedRows[0] ?? 0;
    const filteredRowIndex = filteredRows.findIndex((row) => {
      const meta = row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
        | VirtualizedRowMeta
        | undefined;
      return meta?.rowId === activeRowId;
    });
    const resolvedRowIndex = filteredRowIndex >= 0 ? filteredRowIndex : 0;
    const selectedRow = detailRows[selectedRowIndex];
    const fileName =
      typeof (selectedRow as { fileName?: string })?.fileName === "string"
        ? ((selectedRow as { fileName?: string }).fileName as string)
        : "";
    const objectName =
      typeof (selectedRow as { objectName?: string })?.objectName === "string"
        ? (((selectedRow as { objectName?: string }).objectName as string)
            .split("/")
            .pop() ?? "")
        : "";
    const contentName =
      fileName.length > 0 ? fileName : objectName.length > 0 ? objectName : "";

    const detailRowCount = detailRows.length;
    const rowsPerRecord = detailRowCount > 0 ? detailRowCount : 1;
    const currentIndex = isRecordLabelingMode
      ? resolvedRowIndex + 1
      : selectedRowIndex + 1 + resolvedRowIndex * rowsPerRecord;
    const totalCount =
      filteredRows.reduce((n, row) => {
        const value = Number(row[columnName ?? Object.keys(row)[0]]);
        return Number.isNaN(value) ? n : n + value;
      }, 0) || 1;
    return {
      recordName: `Record ${resolvedRowIndex + 1}`,
      contentName,
      currentIndex,
      totalCount,
      detailRowCount,
      isRecordLabelingMode,
    };
  }, [
    activeRowId,
    filteredRows,
    detailRows,
    selectedRows,
    columnName,
    contentType,
    filter,
  ]);

  useEffect(() => {
    return () => {
      clearSelection();
    };
  }, [clearSelection]);

  return (
    <p>
      {indicatorState.recordName}: {columnName}
      {!indicatorState.isRecordLabelingMode && (
        <>
          {isTableType ? (
            <> ({indicatorState.detailRowCount} rows)</>
          ) : (
            <>
              {" "}
              {indicatorState.contentName}
              {` (${indicatorState.currentIndex}/${indicatorState.totalCount})`}
            </>
          )}
        </>
      )}
      <span />
    </p>
  );
}
