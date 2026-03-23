import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { Badge, Icon } from "@/components";

import {
  useLabelWorkspaceDirty,
  WORKSPACE_DIRTY_CONFIRM_MESSAGE,
} from "../hooks/useLabelWorkspaceDirty";
import { useLabelBatchStore } from "../store/labelBatch.store";
import { useNumberLabelHistoryStore } from "../store/numberLabelHistory.store";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import {
  LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL,
  type LabelingRecordsCellAccessoriesMap,
} from "./LabelingRecordsTable";

const CELL_KEY_SEPARATOR = "::";
const WORKSPACE_RANGE_CHANGE_CONFIRM_MESSAGE =
  "Changing the selected range will discard unsaved labeling changes and clear the undo/redo history. Continue?";

interface WorkspaceNavigationDetailTableProps {
  autoSelectEnabled: boolean;
}

function createCellKey(rowIndex: number, columnId: string): string {
  return `${rowIndex}${CELL_KEY_SEPARATOR}${columnId}`;
}

function renderAccessories(
  accessories?: LabelingRecordsCellAccessoriesMap[keyof LabelingRecordsCellAccessoriesMap]
) {
  if (!accessories) return null;
  const { badges, hasIssue, hasValidationCompleted } = accessories;
  if (!badges?.length && !hasIssue && !hasValidationCompleted) return null;
  return (
    <div className="table-td__content-util">
      {badges?.map((badge, index) => (
        <Badge
          key={`${badge.title}-${index}`}
          title={badge.title}
          style={badge.style}
          size="lg"
        />
      ))}
      {hasValidationCompleted ? (
        <Icon iconType="icon-validated" style="primary" />
      ) : null}
      {hasIssue ? <Icon iconType="icon-issue" style="accent" /> : null}
    </div>
  );
}

export default function WorkspaceNavigationDetailTable({
  autoSelectEnabled,
}: WorkspaceNavigationDetailTableProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const columns = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.columns
  );
  const rows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.rows
  );
  const contentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );
  const elementId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.elementId
  );
  const selectedRows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.selectedRows
  );
  const selectedColumns = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.selectedColumns
  );
  const selectedCells = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.selectedCells
  );
  const chartAxisSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.chartAxisSnapshot
  );
  const resetWorkspaceChanges = useLabelBatchStore(
    (state) => state.resetWorkspaceChanges
  );
  const { dirty, confirmIfDirty } = useLabelWorkspaceDirty();
  const toggleRowSelection = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.toggleRowSelection
  );
  const toggleColumnSelection = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.toggleColumnSelection
  );
  const toggleCellSelection = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.toggleCellSelection
  );
  const setSelectionSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.setSelectionSnapshot
  );

  const isTableType = useMemo(
    () => (contentType ?? "").toUpperCase() === "TABLE",
    [contentType]
  );

  const discardRangeChanges = useCallback(() => {
    const temporalState = useNumberLabelHistoryStore.temporal.getState();
    temporalState.pause();
    resetWorkspaceChanges();
    temporalState.clear();
    setTimeout(() => {
      useNumberLabelHistoryStore.temporal.getState().resume();
    }, 0);
  }, [resetWorkspaceChanges]);

  const confirmRangeChange = useCallback(() => {
    if (!isTableType) {
      return true;
    }
    const temporalState = useNumberLabelHistoryStore.temporal.getState();
    const hasHistory =
      temporalState.pastStates.length > 0 ||
      temporalState.futureStates.length > 0;
    if (!dirty.isDirty && !hasHistory) {
      return true;
    }
    if (typeof window === "undefined") {
      return false;
    }
    if (!window.confirm(WORKSPACE_RANGE_CHANGE_CONFIRM_MESSAGE)) {
      return false;
    }
    discardRangeChanges();
    return true;
  }, [dirty.isDirty, discardRangeChanges, isTableType]);

  const selectedRowSet = useMemo(() => new Set(selectedRows), [selectedRows]);
  const selectedColumnSet = useMemo(
    () => new Set(selectedColumns),
    [selectedColumns]
  );
  const selectedCellSet = useMemo(
    () =>
      new Set(
        selectedCells.map((cell) => createCellKey(cell.rowIndex, cell.columnId))
      ),
    [selectedCells]
  );

  const handleRowToggle = useCallback(
    (rowIndex: number) => {
      if (!confirmRangeChange()) {
        return;
      }
      toggleRowSelection(rowIndex);
    },
    [confirmRangeChange, toggleRowSelection]
  );

  const handleColumnToggle = useCallback(
    (columnId: string) => {
      if (!isTableType) {
        return;
      }
      if (!confirmRangeChange()) {
        return;
      }
      toggleColumnSelection(columnId);
    },
    [confirmRangeChange, isTableType, toggleColumnSelection]
  );

  const handleCellToggle = useCallback(
    (rowIndex: number, columnId: string) => {
      if (isTableType) {
        if (!confirmRangeChange()) {
          return;
        }
        toggleCellSelection(rowIndex, columnId);
      } else {
        const isSameRowSelected =
          selectedRows.length === 1 && selectedRows[0] === rowIndex;
        if (isSameRowSelected) {
          return;
        }
        if (!confirmIfDirty(WORKSPACE_DIRTY_CONFIRM_MESSAGE)) {
          return;
        }
        setSelectionSnapshot({ selectedRows: [rowIndex] });
      }
    },
    [
      confirmIfDirty,
      confirmRangeChange,
      isTableType,
      selectedRows,
      setSelectionSnapshot,
      toggleCellSelection,
    ]
  );

  useEffect(() => {
    if (!isTableType) {
      return;
    }
    const selectedRowIndices = chartAxisSnapshot.source.rows ?? [];
    const selectedColumnIds = chartAxisSnapshot.source.columns ?? [];
    const isSingleSelection =
      selectedRowIndices.length === 1 && selectedColumnIds.length === 1;
    if (!isSingleSelection) {
      if (elementId !== null) {
        setSelectionSnapshot({ elementId: null });
      }
      return;
    }
    const rowIndex = selectedRowIndices[0];
    if (typeof rowIndex !== "number") {
      if (elementId !== null) {
        setSelectionSnapshot({ elementId: null });
      }
      return;
    }
    const targetRow = rows[rowIndex];
    const nextElementId =
      targetRow &&
      typeof (targetRow as { elementId?: string }).elementId === "string"
        ? (targetRow as { elementId?: string }).elementId
        : null;
    if (nextElementId !== elementId) {
      setSelectionSnapshot({ elementId: nextElementId });
    }
  }, [
    chartAxisSnapshot.source.columns,
    chartAxisSnapshot.source.rows,
    elementId,
    isTableType,
    rows,
    setSelectionSnapshot,
  ]);

  useEffect(() => {
    if (isTableType) {
      return;
    }
    if (selectedRows.length === 0) {
      return;
    }
    const rowIndex = selectedRows[0];
    if (typeof rowIndex !== "number") {
      return;
    }
    const targetRow = rows[rowIndex];
    const targetElementId =
      typeof targetRow?.elementId === "string" ? targetRow.elementId : "";
    const nextElementId = targetElementId.length > 0 ? targetElementId : null;
    if (nextElementId !== elementId) {
      setSelectionSnapshot({ elementId: nextElementId });
    }
  }, [elementId, isTableType, rows, selectedRows, setSelectionSnapshot]);

  useEffect(() => {
    if (!autoSelectEnabled || isTableType) {
      return;
    }
    if (rows.length === 0) {
      return;
    }
    if (selectedRows.length > 0) {
      return;
    }
    const firstSelectableRow = columns.length > 0 ? 0 : -1;
    if (firstSelectableRow >= 0) {
      setSelectionSnapshot({ selectedRows: [firstSelectableRow] });
    }
  }, [
    autoSelectEnabled,
    isTableType,
    rows.length,
    selectedRows.length,
    setSelectionSnapshot,
  ]);

  useEffect(() => {
    if (!wrapperRef.current) {
      return;
    }
    const container = wrapperRef.current;
    let target: HTMLElement | null = null;

    if (isTableType) {
      if (selectedCells.length > 0) {
        const key = createCellKey(
          selectedCells[0].rowIndex,
          selectedCells[0].columnId
        );
        target = container.querySelector(
          `[data-cell-key="${key}"]`
        ) as HTMLElement | null;
      }
      if (!target && selectedRows.length > 0) {
        target = container.querySelector(
          `[data-row-index="${selectedRows[0]}"]`
        ) as HTMLElement | null;
      }
      if (!target && selectedColumns.length > 0) {
        target = container.querySelector(
          `[data-column-id="${selectedColumns[0]}"]`
        ) as HTMLElement | null;
      }
    } else if (selectedRows.length > 0) {
      target = container.querySelector(
        `[data-row-index="${selectedRows[0]}"]`
      ) as HTMLElement | null;
    }

    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [isTableType, selectedCells, selectedRows, selectedColumns]);

  const handleKeyActivate = useCallback(
    (event: ReactKeyboardEvent, action: () => void) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    },
    []
  );

  if (!rows.length || !columns.length) {
    return null;
  }

  return (
    <div
      className="workspace-navigation-table__detail-wrapper"
      ref={wrapperRef}
    >
      <table className="table-content table-content-compact">
        <thead className="table__header-wrapper">
          <tr className="table__header-tr table-tr">
            <th className="table__header-th table-th">
              <div className="table-th__content">
                <span></span>
              </div>
            </th>
            {columns.map((column) => {
              const isColumnSelected =
                isTableType && selectedColumnSet.has(column);
              return (
                <th
                  key={column}
                  className={`table__header-th table-th${
                    isColumnSelected ? " selected" : ""
                  }`}
                  data-column-id={column}
                >
                  <div
                    className="table-th__content"
                    role={isTableType ? "button" : undefined}
                    tabIndex={isTableType ? 0 : undefined}
                    onClick={
                      isTableType ? () => handleColumnToggle(column) : undefined
                    }
                    onKeyDown={
                      isTableType
                        ? (event) =>
                            handleKeyActivate(event, () =>
                              handleColumnToggle(column)
                            )
                        : undefined
                    }
                  >
                    <span>{column}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="table__body-wrapper">
          {rows.map((row, rowIndex) => {
            const isRowSelected = selectedRowSet.has(rowIndex);
            return (
              <tr
                key={`detail-${rowIndex}`}
                className={`table__body-tr table-tr${
                  isRowSelected ? " selected" : ""
                }`}
                data-row-index={rowIndex}
              >
                <td
                  className={`table__body-td table-td${
                    isRowSelected ? " selected" : ""
                  }`}
                >
                  <div
                    className="table-td__content"
                    role={isTableType ? "button" : undefined}
                    tabIndex={isTableType ? 0 : undefined}
                    onClick={
                      isTableType ? () => handleRowToggle(rowIndex) : undefined
                    }
                    onKeyDown={
                      isTableType
                        ? (event) =>
                            handleKeyActivate(event, () =>
                              handleRowToggle(rowIndex)
                            )
                        : undefined
                    }
                  >
                    <span>{rowIndex + 1}</span>
                    {renderAccessories(
                      (
                        row as Record<
                          typeof LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL,
                          LabelingRecordsCellAccessoriesMap | undefined
                        >
                      )[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL]?.__rownum
                    )}
                  </div>
                </td>
                {columns.map((column) => {
                  const key = createCellKey(rowIndex, column);
                  const isColumnSelected =
                    isTableType && selectedColumnSet.has(column);
                  const isCellSelected =
                    isTableType && selectedCellSet.has(key);
                  const cellIsSelected =
                    isRowSelected || isColumnSelected || isCellSelected;
                  return (
                    <td
                      key={`${rowIndex}-${column}`}
                      className={`table__body-td table-td${
                        cellIsSelected ? " selected" : ""
                      }`}
                      data-cell-key={key}
                      data-row-index={rowIndex}
                      data-column-id={column}
                    >
                      <div
                        className="table-td__content"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCellToggle(rowIndex, column)}
                        onKeyDown={(event) =>
                          handleKeyActivate(event, () =>
                            handleCellToggle(rowIndex, column)
                          )
                        }
                      >
                        <span>{row[column] ?? "-"}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
