/**
 * VirtualizedRecordsTable stub for labeling-canvas.
 *
 * This is a simplified re-export of types and constants.
 * The actual VirtualizedRecordsTable rendering logic is complex and
 * requires @tanstack/react-table and @tanstack/react-virtual.
 * The host app should provide these if the table is rendered.
 */
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";

export type VirtualizedRowCellValue = string | number;

export interface VirtualizedRowMeta {
  columnRefs: Record<string, unknown>;
  rowRef?: unknown;
  rowId?: string;
}

export const VIRTUALIZED_RECORDS_ROW_META_SYMBOL = Symbol(
  "VIRTUALIZED_RECORDS_TABLE_ROW_META"
);

export type VirtualizedRecordsTableRow = Record<
  string,
  VirtualizedRowCellValue
> & {
  [VIRTUALIZED_RECORDS_ROW_META_SYMBOL]?: VirtualizedRowMeta;
};

export type SelectionMode = "row" | "column" | "cell";

export interface VirtualizedRecordsTableSelection {
  modes: SelectionMode[];
  selectedItems: string[];
  setSelectedItems: (items: string[]) => void;
}

export interface VirtualizedRecordsTableProps {
  rows: VirtualizedRecordsTableRow[];
  schemaNameToContentType?: Record<string, string>;
  onCellClick?: (payload: VirtualizedRecordsTableCellClickPayload) => void;
  selection?: VirtualizedRecordsTableSelection;
}

export interface VirtualizedRecordsTableCellClickPayload {
  columnId: string;
  value: VirtualizedRowCellValue;
  row: VirtualizedRecordsTableRow;
  rowIndex: number;
  reference?: unknown;
  event: ReactMouseEvent<HTMLDivElement> | ReactKeyboardEvent<HTMLDivElement>;
}

export const ROW_SELECTION_KEY_PREFIX = "row:";
export const COLUMN_SELECTION_KEY_PREFIX = "col:";
export const CELL_SELECTION_KEY_PREFIX = "cell:";

export const getVirtualizedCellKey = (rowId: string, columnId: string) =>
  `${CELL_SELECTION_KEY_PREFIX}${rowId}::${columnId}`;

/**
 * Stub VirtualizedRecordsTable component.
 * The actual implementation requires @tanstack/react-table and @tanstack/react-virtual.
 */
function VirtualizedRecordsTable(_props: VirtualizedRecordsTableProps) {
  return null;
}

export default VirtualizedRecordsTable;
