import { create } from "zustand";

interface DetailTableRow {
  [key: string]: string | undefined;
  elementId?: string;
}

export interface DetailTableCellSelection {
  rowIndex: number;
  columnId: string;
}

interface WorkspaceNavigationDetailContext {
  columns: string[];
  rows: DetailTableRow[];
  recordName: string | null;
  columnName: string | null;
  contentType: string | null;
  contentSetId: string | null;
  schemaName: string | null;
  /**
   * @deprecated Use contentSetId.
   */
  contentsetId?: string | null;
  elementId: string | null;
}

export const WORKSPACE_CHART_PIVOT_MODE = {
  ROW_AS_X: "ROW_AS_X",
  COLUMN_AS_X: "COLUMN_AS_X",
} as const;

export type ChartPivotMode =
  (typeof WORKSPACE_CHART_PIVOT_MODE)[keyof typeof WORKSPACE_CHART_PIVOT_MODE];

interface WorkspaceNavigationChartAxisTick {
  key: number | string;
  label: string;
  rowIndex?: number;
  columnId?: string;
}

interface WorkspaceNavigationChartSeriesPoint {
  axisKey: number | string;
  rowIndex: number;
  columnId: string;
  elementId: string | null;
  value: number | null;
  rawValue: string | null;
}

interface WorkspaceNavigationChartSeries {
  id: string;
  label: string;
  values: Array<number | null>;
  points: WorkspaceNavigationChartSeriesPoint[];
}

export interface WorkspaceNavigationChartAxisSnapshot {
  mode: ChartPivotMode;
  canRender: boolean;
  xAxis: {
    label: string;
    ticks: WorkspaceNavigationChartAxisTick[];
  };
  yAxis: {
    label: string;
    series: WorkspaceNavigationChartSeries[];
  };
  source: {
    rows: number[];
    columns: string[];
  };
}

type ChartDependencyState = {
  columns: string[];
  rows: DetailTableRow[];
  contentType: string | null;
  selectedRows: number[];
  selectedColumns: string[];
  selectedCells: DetailTableCellSelection[];
  chartPivotMode: ChartPivotMode;
};

function resolveXAxisLabel(mode: ChartPivotMode): string {
  return mode === WORKSPACE_CHART_PIVOT_MODE.ROW_AS_X ? "Row Index" : "Column";
}

function resolveYAxisLabel(mode: ChartPivotMode): string {
  return mode === WORKSPACE_CHART_PIVOT_MODE.ROW_AS_X
    ? "Column Value"
    : "Row Value";
}

function createEmptyChartAxisSnapshot(
  mode: ChartPivotMode,
  source: WorkspaceNavigationChartAxisSnapshot["source"] = {
    rows: [],
    columns: [],
  }
): WorkspaceNavigationChartAxisSnapshot {
  return {
    mode,
    canRender: false,
    xAxis: {
      label: resolveXAxisLabel(mode),
      ticks: [],
    },
    yAxis: {
      label: resolveYAxisLabel(mode),
      series: [],
    },
    source,
  };
}

function normalizeNumericValue(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const normalized = trimmed.replace(/,/g, "");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function deriveRowSelection(state: ChartDependencyState): number[] {
  const candidateSet = new Set<number>();
  state.selectedRows.forEach((idx) => {
    if (
      typeof idx === "number" &&
      Number.isFinite(idx) &&
      idx >= 0 &&
      idx < state.rows.length
    ) {
      candidateSet.add(idx);
    }
  });
  state.selectedCells.forEach((cell) => {
    const idx = cell.rowIndex;
    if (
      typeof idx === "number" &&
      Number.isFinite(idx) &&
      idx >= 0 &&
      idx < state.rows.length
    ) {
      candidateSet.add(idx);
    }
  });
  const deduped = Array.from(candidateSet).sort((a, b) => a - b);
  if (deduped.length > 0) {
    return deduped;
  }
  if (state.rows.length > 0) {
    return state.rows.map((_, index) => index);
  }
  return deduped;
}

function deriveColumnSelection(state: ChartDependencyState): string[] {
  const candidateSet = new Set<string>();
  state.selectedColumns.forEach((columnId) => {
    if (typeof columnId === "string" && columnId.length > 0) {
      candidateSet.add(columnId);
    }
  });
  state.selectedCells.forEach((cell) => {
    const columnId = cell.columnId;
    if (typeof columnId === "string" && columnId.length > 0) {
      candidateSet.add(columnId);
    }
  });
  if (candidateSet.size === 0) {
    return state.columns.slice();
  }
  return state.columns.filter((column) => candidateSet.has(column));
}

function computeChartAxisSnapshot(
  state: ChartDependencyState
): WorkspaceNavigationChartAxisSnapshot {
  const mode = state.chartPivotMode;
  const isTableType = (state.contentType ?? "").toUpperCase() === "TABLE";
  if (!isTableType) {
    return createEmptyChartAxisSnapshot(mode);
  }

  const hasSelection =
    state.selectedRows.length > 0 ||
    state.selectedColumns.length > 0 ||
    state.selectedCells.length > 0;
  if (!hasSelection) {
    return createEmptyChartAxisSnapshot(mode);
  }

  const effectiveRows = deriveRowSelection(state);
  const effectiveColumns = deriveColumnSelection(state);
  const baseSnapshot = createEmptyChartAxisSnapshot(mode, {
    rows: effectiveRows,
    columns: effectiveColumns,
  });

  if (!effectiveRows.length || !effectiveColumns.length) {
    return baseSnapshot;
  }

  if (mode === WORKSPACE_CHART_PIVOT_MODE.ROW_AS_X) {
    const xAxisTicks = effectiveRows.map((rowIndex) => ({
      key: rowIndex,
      label: String(rowIndex + 1),
      rowIndex,
    }));
    const series = effectiveColumns.map((columnId) => {
      const points = xAxisTicks.map((tick) => {
        const row = state.rows[tick.rowIndex ?? 0];
        const rawValue = row ? (row[columnId] ?? null) : null;
        const elementId =
          row && typeof row.elementId === "string" && row.elementId.length > 0
            ? row.elementId
            : null;
        return {
          axisKey: tick.key,
          rowIndex: tick.rowIndex ?? 0,
          columnId,
          elementId,
          rawValue,
          value: normalizeNumericValue(rawValue),
        };
      });
      return {
        id: columnId,
        label: columnId,
        points,
        values: points.map((point) => point.value),
      };
    });
    const canRender = series.some((serie) =>
      serie.values.some((value) => value !== null)
    );
    return {
      ...baseSnapshot,
      canRender,
      xAxis: {
        ...baseSnapshot.xAxis,
        ticks: xAxisTicks,
      },
      yAxis: {
        ...baseSnapshot.yAxis,
        series,
      },
    };
  }

  const xAxisTicks = effectiveColumns.map((columnId) => ({
    key: columnId,
    label: columnId,
    columnId,
  }));
  const series = effectiveRows.map((rowIndex) => {
    const points = xAxisTicks.map((tick) => {
      const columnId = tick.columnId ?? "";
      const row = state.rows[rowIndex];
      const rawValue = row ? (row[columnId] ?? null) : null;
      const elementId =
        row && typeof row.elementId === "string" && row.elementId.length > 0
          ? row.elementId
          : null;
      return {
        axisKey: tick.key,
        rowIndex,
        columnId,
        elementId,
        rawValue,
        value: normalizeNumericValue(rawValue),
      };
    });
    return {
      id: `row-${rowIndex}`,
      label: `Row ${rowIndex + 1}`,
      points,
      values: points.map((point) => point.value),
    };
  });
  const canRender = series.some((serie) =>
    serie.values.some((value) => value !== null)
  );
  return {
    ...baseSnapshot,
    canRender,
    xAxis: {
      ...baseSnapshot.xAxis,
      ticks: xAxisTicks,
    },
    yAxis: {
      ...baseSnapshot.yAxis,
      series,
    },
  };
}

interface WorkspaceNavigationDetailSelectionState
  extends WorkspaceNavigationDetailContext {
  activeRowId: string | null;
  selectedRows: number[];
  selectedColumns: string[];
  selectedCells: DetailTableCellSelection[];
  chartPivotMode: ChartPivotMode;
  chartAxisSnapshot: WorkspaceNavigationChartAxisSnapshot;
  detailContextResetKey: number;
  setChartPivotMode: (mode: ChartPivotMode) => void;
  toggleChartPivotMode: () => void;
  setContext: (context: WorkspaceNavigationDetailContext | null) => void;
  setActiveRowId: (rowId: string | null) => void;
  setSelectionSnapshot: (
    payload: Partial<WorkspaceNavigationDetailContext> & {
      selectedRows?: number[];
      selectedColumns?: string[];
      selectedCells?: DetailTableCellSelection[];
    }
  ) => void;
  incrementDetailContextKey: () => void;
  toggleRowSelection: (rowIndex: number) => void;
  toggleColumnSelection: (columnId: string) => void;
  toggleCellSelection: (rowIndex: number, columnId: string) => void;
  clearSelection: () => void;
}

const INITIAL_STATE: Omit<
  WorkspaceNavigationDetailSelectionState,
  | "setContext"
  | "setActiveRowId"
  | "setSelectionSnapshot"
  | "toggleRowSelection"
  | "toggleColumnSelection"
  | "toggleCellSelection"
  | "clearSelection"
  | "setChartPivotMode"
  | "toggleChartPivotMode"
  | "incrementDetailContextKey"
> = {
  columns: [],
  rows: [],
  recordName: null,
  columnName: null,
  contentType: null,
  contentSetId: null,
  schemaName: null,
  elementId: null,
  activeRowId: null,
  selectedRows: [],
  selectedColumns: [],
  selectedCells: [],
  chartPivotMode: WORKSPACE_CHART_PIVOT_MODE.ROW_AS_X,
  chartAxisSnapshot: createEmptyChartAxisSnapshot(
    WORKSPACE_CHART_PIVOT_MODE.ROW_AS_X
  ),
  detailContextResetKey: 0,
};

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((value, index) => value === b[index]);
}

function areRowsCoreEqual(a: DetailTableRow[], b: DetailTableRow[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    const rowA = a[i];
    const rowB = b[i];
    const keysA = Object.keys(rowA);
    const keysB = Object.keys(rowB);
    if (keysA.length !== keysB.length) {
      return false;
    }
    for (const key of keysA) {
      if (rowA[key] !== rowB[key]) {
        return false;
      }
    }
    const symbolsA = Object.getOwnPropertySymbols(rowA);
    const symbolsB = Object.getOwnPropertySymbols(rowB);
    if (symbolsA.length !== symbolsB.length) {
      return false;
    }
    if (symbolsA.length > 0) {
      const symbolsBSet = new Set(symbolsB);
      const rowARecord = rowA as Record<PropertyKey, unknown>;
      const rowBRecord = rowB as Record<PropertyKey, unknown>;
      for (const symbol of symbolsA) {
        if (!symbolsBSet.has(symbol)) {
          return false;
        }
        if (rowARecord[symbol] !== rowBRecord[symbol]) {
          return false;
        }
      }
    }
  }
  return true;
}

function areRowsSymbolEqual(a: DetailTableRow[], b: DetailTableRow[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    const rowA = a[i];
    const rowB = b[i];
    const symbolsA = Object.getOwnPropertySymbols(rowA);
    const symbolsB = Object.getOwnPropertySymbols(rowB);
    if (symbolsA.length !== symbolsB.length) {
      return false;
    }
    if (symbolsA.length === 0) {
      continue;
    }
    const symbolsBSet = new Set(symbolsB);
    const rowARecord = rowA as Record<PropertyKey, unknown>;
    const rowBRecord = rowB as Record<PropertyKey, unknown>;
    for (const symbol of symbolsA) {
      if (!symbolsBSet.has(symbol)) {
        return false;
      }
      if (rowARecord[symbol] !== rowBRecord[symbol]) {
        return false;
      }
    }
  }
  return true;
}

function dedupeCells(
  cells: DetailTableCellSelection[] | undefined
): DetailTableCellSelection[] {
  if (!cells?.length) {
    return [];
  }
  const map = new Map<string, DetailTableCellSelection>();
  cells.forEach((cell) => {
    if (
      typeof cell.rowIndex !== "number" ||
      cell.rowIndex < 0 ||
      typeof cell.columnId !== "string" ||
      cell.columnId.length === 0
    ) {
      return;
    }
    const key = `${cell.rowIndex}::${cell.columnId}`;
    map.set(key, { rowIndex: cell.rowIndex, columnId: cell.columnId });
  });
  return Array.from(map.values());
}

export const useWorkspaceNavigationDetailSelectionStore =
  create<WorkspaceNavigationDetailSelectionState>((set) => ({
    ...INITIAL_STATE,
    setContext: (context) =>
      set((state) => {
        if (!context) {
          const shouldReset =
            state.columns.length > 0 ||
            state.rows.length > 0 ||
            state.recordName !== null ||
            state.columnName !== null ||
            state.contentType !== null ||
            state.contentSetId !== null ||
            state.schemaName !== null ||
            state.elementId !== null ||
            state.activeRowId !== null ||
            state.selectedRows.length > 0 ||
            state.selectedColumns.length > 0 ||
            state.selectedCells.length > 0;
          if (!shouldReset) {
            return state;
          }
          return {
            ...state,
            ...INITIAL_STATE,
            chartPivotMode: state.chartPivotMode,
            chartAxisSnapshot: createEmptyChartAxisSnapshot(
              state.chartPivotMode
            ),
          };
        }

        const nextColumns = Array.isArray(context.columns)
          ? context.columns
          : [];
        const nextRows = Array.isArray(context.rows) ? context.rows : [];
        const nextRecordName = context.recordName ?? null;
        const nextColumnName = context.columnName ?? null;
        const nextContentType = context.contentType ?? null;
        const nextContentSetId =
          context.contentSetId ?? context.contentsetId ?? null;
        const isTableType = (nextContentType ?? "").toUpperCase() === "TABLE";
        const nextSchemaName = context.schemaName ?? null;

        const rowsCoreEqual = areRowsCoreEqual(state.rows, nextRows);
        const rowsSymbolEqual = rowsCoreEqual
          ? areRowsSymbolEqual(state.rows, nextRows)
          : false;
        const rowsEqual = rowsCoreEqual && rowsSymbolEqual;
        const baseContextChanged =
          state.recordName !== nextRecordName ||
          state.columnName !== nextColumnName ||
          state.contentType !== nextContentType ||
          state.contentSetId !== nextContentSetId ||
          state.schemaName !== nextSchemaName;
        const resolvedElementId = context.elementId ?? null;
        const nextElementId = isTableType
          ? baseContextChanged
            ? null
            : state.elementId
          : baseContextChanged
            ? resolvedElementId
            : state.elementId ?? resolvedElementId;
        const contextChanged =
          baseContextChanged || state.elementId !== nextElementId;
        const shouldUpdate =
          !areStringArraysEqual(state.columns, nextColumns) ||
          !rowsEqual ||
          contextChanged;

        if (!shouldUpdate) {
          return state;
        }

        const selectedRows = contextChanged
          ? []
          : state.selectedRows.filter(
              (rowIndex) =>
                typeof rowIndex === "number" &&
                rowIndex >= 0 &&
                rowIndex < nextRows.length
            );
        const selectedColumns = contextChanged
          ? []
          : state.selectedColumns.filter((columnId) =>
              nextColumns.includes(columnId)
            );
        const selectedCells = contextChanged
          ? []
          : state.selectedCells.filter(
              (cell) =>
                typeof cell.rowIndex === "number" &&
                cell.rowIndex >= 0 &&
                cell.rowIndex < nextRows.length &&
                nextColumns.includes(cell.columnId)
            );
        const chartAxisSnapshot = computeChartAxisSnapshot({
          columns: nextColumns,
          rows: nextRows,
          contentType: nextContentType,
          selectedRows,
          selectedColumns,
          selectedCells,
          chartPivotMode: state.chartPivotMode,
        });

        return {
          ...state,
          columns: nextColumns,
          rows: nextRows,
          recordName: nextRecordName,
          columnName: nextColumnName,
          contentType: nextContentType,
          contentSetId: nextContentSetId,
          schemaName: nextSchemaName,
          elementId: nextElementId,
          activeRowId: state.activeRowId,
          selectedRows,
          selectedColumns,
          selectedCells,
          chartAxisSnapshot,
        };
      }),
    setActiveRowId: (rowId) =>
      set((state) => {
        if (state.activeRowId === rowId) {
          return state;
        }
        return { ...state, activeRowId: rowId };
      }),
    setSelectionSnapshot: (payload) =>
      set((state) => {
        const nextColumns =
          payload.columns !== undefined
            ? (payload.columns ?? [])
            : state.columns;
        const nextRows =
          payload.rows !== undefined ? (payload.rows ?? []) : state.rows;
        const nextRecordName =
          payload.recordName !== undefined
            ? payload.recordName
            : state.recordName;
        const nextColumnName =
          payload.columnName !== undefined
            ? payload.columnName
            : state.columnName;
        const nextContentType =
          payload.contentType !== undefined
            ? payload.contentType
            : state.contentType;
        const nextSelectedRows =
          payload.selectedRows !== undefined
            ? Array.from(
                new Set(
                  (payload.selectedRows ?? []).filter(
                    (idx) => typeof idx === "number" && idx >= 0
                  )
                )
              )
            : state.selectedRows;
        const nextSelectedColumns =
          payload.selectedColumns !== undefined
            ? Array.from(
                new Set(
                  (payload.selectedColumns ?? []).filter(
                    (col): col is string =>
                      typeof col === "string" && col.length > 0
                  )
                )
              )
            : state.selectedColumns;
        const nextSelectedCells =
          payload.selectedCells !== undefined
            ? dedupeCells(payload.selectedCells)
            : state.selectedCells;

        const nextContentSetId =
          payload.contentSetId !== undefined
            ? (payload.contentSetId ?? null)
            : payload.contentsetId !== undefined
              ? payload.contentsetId ?? null
              : state.contentSetId;
        const nextElementId =
          payload.elementId !== undefined
            ? (payload.elementId ?? null)
            : state.elementId;
        const nextSchemaName =
          payload.schemaName !== undefined
            ? payload.schemaName ?? null
            : state.schemaName;
        const chartAxisSnapshot = computeChartAxisSnapshot({
          columns: nextColumns,
          rows: nextRows,
          contentType: nextContentType,
          selectedRows: nextSelectedRows,
          selectedColumns: nextSelectedColumns,
          selectedCells: nextSelectedCells,
          chartPivotMode: state.chartPivotMode,
        });

        return {
          ...state,
          columns: nextColumns,
          rows: nextRows,
          recordName: nextRecordName,
          columnName: nextColumnName,
          contentType: nextContentType,
          contentSetId: nextContentSetId,
          schemaName: nextSchemaName,
          elementId: nextElementId,
          selectedRows: nextSelectedRows,
          selectedColumns: nextSelectedColumns,
          selectedCells: nextSelectedCells,
          chartAxisSnapshot,
        };
      }),
    toggleRowSelection: (rowIndex) =>
      set((state) => {
        if (rowIndex < 0 || rowIndex >= state.rows.length) {
          return state;
        }
        const exists = state.selectedRows.includes(rowIndex);
        const next = exists
          ? state.selectedRows.filter((idx) => idx !== rowIndex)
          : [...state.selectedRows, rowIndex];
        const chartAxisSnapshot = computeChartAxisSnapshot({
          columns: state.columns,
          rows: state.rows,
          contentType: state.contentType,
          selectedRows: next,
          selectedColumns: state.selectedColumns,
          selectedCells: state.selectedCells,
          chartPivotMode: state.chartPivotMode,
        });
        return {
          ...state,
          selectedRows: next,
          chartAxisSnapshot,
        };
      }),
    toggleColumnSelection: (columnId) =>
      set((state) => {
        if (!state.columns.includes(columnId)) {
          return state;
        }
        const exists = state.selectedColumns.includes(columnId);
        const next = exists
          ? state.selectedColumns.filter((col) => col !== columnId)
          : [...state.selectedColumns, columnId];
        const chartAxisSnapshot = computeChartAxisSnapshot({
          columns: state.columns,
          rows: state.rows,
          contentType: state.contentType,
          selectedRows: state.selectedRows,
          selectedColumns: next,
          selectedCells: state.selectedCells,
          chartPivotMode: state.chartPivotMode,
        });
        return {
          ...state,
          selectedColumns: next,
          chartAxisSnapshot,
        };
      }),
    toggleCellSelection: (rowIndex, columnId) =>
      set((state) => {
        if (
          rowIndex < 0 ||
          rowIndex >= state.rows.length ||
          !state.columns.includes(columnId)
        ) {
          return state;
        }
        const nextCells = state.selectedCells.slice();
        const targetIndex = nextCells.findIndex(
          (cell) => cell.rowIndex === rowIndex && cell.columnId === columnId
        );
        if (targetIndex >= 0) {
          nextCells.splice(targetIndex, 1);
        } else {
          nextCells.push({ rowIndex, columnId });
        }
        const chartAxisSnapshot = computeChartAxisSnapshot({
          columns: state.columns,
          rows: state.rows,
          contentType: state.contentType,
          selectedRows: state.selectedRows,
          selectedColumns: state.selectedColumns,
          selectedCells: nextCells,
          chartPivotMode: state.chartPivotMode,
        });
        return {
          ...state,
          selectedCells: nextCells,
          chartAxisSnapshot,
        };
      }),
    clearSelection: () =>
      set((state) => {
        const clearedRows: number[] = [];
        const clearedColumns: string[] = [];
        const clearedCells: DetailTableCellSelection[] = [];
        const chartAxisSnapshot = computeChartAxisSnapshot({
          columns: state.columns,
          rows: state.rows,
          contentType: state.contentType,
          selectedRows: clearedRows,
          selectedColumns: clearedColumns,
          selectedCells: clearedCells,
          chartPivotMode: state.chartPivotMode,
        });
        return {
          ...state,
          selectedRows: clearedRows,
          selectedColumns: clearedColumns,
          selectedCells: clearedCells,
          chartAxisSnapshot,
        };
      }),
    incrementDetailContextKey: () =>
      set((state) => ({
        ...state,
        detailContextResetKey: state.detailContextResetKey + 1,
      })),
    setChartPivotMode: (mode) =>
      set((state) => {
        if (state.chartPivotMode === mode) {
          return state;
        }
        const chartAxisSnapshot = computeChartAxisSnapshot({
          columns: state.columns,
          rows: state.rows,
          contentType: state.contentType,
          selectedRows: state.selectedRows,
          selectedColumns: state.selectedColumns,
          selectedCells: state.selectedCells,
          chartPivotMode: mode,
        });
        return {
          ...state,
          chartPivotMode: mode,
          chartAxisSnapshot,
        };
      }),
    toggleChartPivotMode: () =>
      set((state) => {
        const nextMode =
          state.chartPivotMode === WORKSPACE_CHART_PIVOT_MODE.ROW_AS_X
            ? WORKSPACE_CHART_PIVOT_MODE.COLUMN_AS_X
            : WORKSPACE_CHART_PIVOT_MODE.ROW_AS_X;
        const chartAxisSnapshot = computeChartAxisSnapshot({
          columns: state.columns,
          rows: state.rows,
          contentType: state.contentType,
          selectedRows: state.selectedRows,
          selectedColumns: state.selectedColumns,
          selectedCells: state.selectedCells,
          chartPivotMode: nextMode,
        });
        return {
          ...state,
          chartPivotMode: nextMode,
          chartAxisSnapshot,
        };
      }),
  }));
