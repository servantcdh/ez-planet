/**
 * Stub for VirtualizedRecordsTable and associated types/constants.
 */
import React, { type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  Symbols & Constants                                               */
/* ------------------------------------------------------------------ */

export const VIRTUALIZED_RECORDS_ROW_META_SYMBOL: unique symbol = Symbol(
  "VIRTUALIZED_RECORDS_ROW_META",
);

export const ROW_SELECTION_KEY_PREFIX = "row::";
export const COLUMN_SELECTION_KEY_PREFIX = "column::";
export const CELL_SELECTION_KEY_PREFIX = "cell::";

export function getVirtualizedCellKey(
  rowId: string,
  columnId: string,
): string {
  return `${CELL_SELECTION_KEY_PREFIX}${rowId}::${columnId}`;
}

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface VirtualizedRowMeta {
  columnRefs: Record<string, unknown>;
  rowRef: unknown;
  rowId: string;
}

export type VirtualizedRecordRowMeta = VirtualizedRowMeta;

export type RecordMetaSymbol = typeof VIRTUALIZED_RECORDS_ROW_META_SYMBOL;

export type VirtualizedRecordsTableRow = Record<string, unknown> & {
  [VIRTUALIZED_RECORDS_ROW_META_SYMBOL]?: VirtualizedRowMeta;
};

export type VirtualizedRecordsRowAction = {
  type: string;
  payload?: unknown;
};

export interface VirtualizedRecordsTableCellClickPayload {
  columnId: string;
  value: string | number;
  row: VirtualizedRecordsTableRow;
  rowIndex: number;
  reference?: unknown;
  event?: React.MouseEvent | React.KeyboardEvent;
}

export type VirtualizedRecordsTableSelectionMode = "row" | "column" | "cell";

export interface VirtualizedRecordsTableSelection {
  modes: VirtualizedRecordsTableSelectionMode[];
  selectedItems: string[];
  setSelectedItems: (items: string[]) => void;
}

export interface VirtualizedRecordsTableProps {
  rows?: VirtualizedRecordsTableRow[];
  columns?: unknown[];
  onCellClick?: (payload: VirtualizedRecordsTableCellClickPayload) => void;
  selection?: VirtualizedRecordsTableSelection;
  className?: string;
  children?: ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function VirtualizedRecordsTable({
  children,
  className,
}: VirtualizedRecordsTableProps) {
  return React.createElement("div", { className }, children);
}

export default VirtualizedRecordsTable;
