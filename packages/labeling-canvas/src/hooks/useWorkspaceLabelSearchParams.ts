import { useMemo } from "react";

import type { SearchOperatorValue } from "@/features/content-group/queries";
import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";

import { useLabelBatchStore } from "../store/labelBatch.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import { useWorkspaceViewModeStore } from "../store/workspaceViewMode.store";
import type { LabelSearchRequest, SearchOperatorFilter } from "../types/domain";

export function useWorkspaceLabelSearchParams() {
  const { filter } = useFilterBySearchParams();
  const contentSetId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentSetId
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const contentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );
  const chartAxisSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.chartAxisSnapshot
  );
  const selectedRows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.selectedRows
  );
  const tableSelectedItems = filter.tableSelectedItems as
    | SearchOperatorValue<string[]>
    | undefined;
  const tableSelectedIndicator = tableSelectedItems?.value?.[0];
  const labelContextId = useLabelBatchStore((state) => state.labelContextId);
  const workspaceViewMode = useWorkspaceViewModeStore((state) => state.mode);

  const isRecordLabelingMode = useMemo(() => {
    return Boolean(
      tableSelectedIndicator?.includes("row") &&
        selectedRows.length === 0 &&
        contentType !== "TABLE"
    );
  }, [contentType, selectedRows.length, tableSelectedIndicator]);
  const isSingleNumberSelection = useMemo(() => {
    if (workspaceViewMode !== "Number") {
      return false;
    }
    const rows = chartAxisSnapshot.source.rows ?? [];
    const columns = chartAxisSnapshot.source.columns ?? [];
    return rows.length === 1 && columns.length === 1;
  }, [
    chartAxisSnapshot.source.columns,
    chartAxisSnapshot.source.rows,
    workspaceViewMode,
  ]);

  const buildOperator = useMemo(
    () =>
      <T extends string>(value: T): SearchOperatorFilter<T> => ({
        operator: "EQ",
        value,
      }),
    []
  );
  const unitTypeFilter = useMemo(() => {
    if (workspaceViewMode === "Record") {
      return undefined;
    }
    return buildOperator("ELEMENT");
  }, [buildOperator, workspaceViewMode]);

  const request = useMemo<LabelSearchRequest | undefined>(() => {
    if (!labelContextId) {
      return undefined;
    }
    const shouldUseContentSet =
      workspaceViewMode === "Record" ||
      isRecordLabelingMode ||
      (contentType ?? "").toUpperCase() === "TABLE";
    if (shouldUseContentSet) {
      if (
        workspaceViewMode === "Number" &&
        isSingleNumberSelection &&
        elementId
      ) {
        return {
          labelContextId: buildOperator(labelContextId),
          elementId: buildOperator(elementId),
          ...(unitTypeFilter ? { unitType: unitTypeFilter } : {}),
        };
      }
      if (!contentSetId) {
        return undefined;
      }
      return {
        labelContextId: buildOperator(labelContextId),
        contentSetId: buildOperator(contentSetId),
        ...(unitTypeFilter ? { unitType: unitTypeFilter } : {}),
      };
    }
    if (!elementId) {
      return undefined;
    }
    return {
      labelContextId: buildOperator(labelContextId),
      elementId: buildOperator(elementId),
      ...(unitTypeFilter ? { unitType: unitTypeFilter } : {}),
    };
  }, [
    buildOperator,
    contentSetId,
    contentType,
    elementId,
    isRecordLabelingMode,
    isSingleNumberSelection,
    labelContextId,
    unitTypeFilter,
    workspaceViewMode,
  ]);

  return {
    labelContextId,
    request,
    isRecordLabelingMode,
  };
}
