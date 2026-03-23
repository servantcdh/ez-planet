import {
  type ComponentProps,
  type KeyboardEvent as ReactKeyboardEvent,
  memo,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type CellContext,
  type ColumnDef,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  type HeaderContext,
  type Row,
  type RowSelectionState,
  type Updater,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";

import { Badge, Checkbox, Icon } from "@/components";
import {
  CELL_SELECTION_KEY_PREFIX,
  COLUMN_SELECTION_KEY_PREFIX,
  getVirtualizedCellKey,
  ROW_SELECTION_KEY_PREFIX,
  VIRTUALIZED_RECORDS_ROW_META_SYMBOL,
  type VirtualizedRecordsTableCellClickPayload,
  type VirtualizedRecordsTableRow,
  type VirtualizedRecordsTableSelection,
  type VirtualizedRowMeta,
} from "@/components/organisms/VirtualizedRecordsTable";
import { LABELING_SYSTEM_COLUMN_IDS } from "@/constants/hiddenColumns";
import { getContentTypeMeta } from "@/lib/ui/contentType";

export const LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL = Symbol(
  "LABELING_RECORDS_CELL_ACCESSORIES"
);

type BadgeStyle = ComponentProps<typeof Badge>["style"];

export interface LabelingRecordsCellBadge {
  title: string;
  style: BadgeStyle;
}

export interface LabelingRecordsCellAccessories {
  badges?: LabelingRecordsCellBadge[];
  hasIssue?: boolean;
  hasValidationCompleted?: boolean;
}

export type LabelingRecordsCellAccessoriesMap = Record<
  string,
  LabelingRecordsCellAccessories
>;

export type LabelingRecordsTableRow = VirtualizedRecordsTableRow & {
  [LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL]?: LabelingRecordsCellAccessoriesMap;
};

type RowData = LabelingRecordsTableRow;

function getCellAccessories(
  row: RowData,
  columnId: string
): LabelingRecordsCellAccessories | undefined {
  return row[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL]?.[columnId];
}

function renderCellUtil(
  accessories?: LabelingRecordsCellAccessories
): JSX.Element | null {
  if (!accessories) {
    return null;
  }
  const { badges, hasIssue, hasValidationCompleted } = accessories;
  if (!badges?.length && !hasIssue && !hasValidationCompleted) {
    return null;
  }

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

const NON_DATA_COLUMN_IDS = new Set(["__select_rownum", "__rownum"]);
const EMPTY_SELECTION_SET: ReadonlySet<string> = new Set<string>();
const RESIZE_HANDLE_SELECTOR = 'button[aria-label="Resize column"]';
const CONTENT_SELECTION_ANCHOR_SELECTOR = "[data-content-selection-anchor]";

const CELL_SELECTION_KEY_SEPARATOR = "::";
const createRowSelectionKey = (rowId: string) =>
  `${ROW_SELECTION_KEY_PREFIX}${rowId}`;
const parseRowSelectionKey = (key: string): string | null =>
  key.startsWith(ROW_SELECTION_KEY_PREFIX)
    ? key.slice(ROW_SELECTION_KEY_PREFIX.length)
    : null;
const createColumnSelectionKey = (columnId: string) =>
  `${COLUMN_SELECTION_KEY_PREFIX}${columnId}`;
const isRowSelectionKey = (key: string) =>
  key.startsWith(ROW_SELECTION_KEY_PREFIX);
const isColumnSelectionKey = (key: string) =>
  key.startsWith(COLUMN_SELECTION_KEY_PREFIX);
const isCellSelectionKey = (key: string) =>
  key.startsWith(CELL_SELECTION_KEY_PREFIX);
const parseCellSelectionKey = (
  key: string
): { rowId: string; columnId: string } | null => {
  if (!isCellSelectionKey(key)) {
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
};

export interface LabelingRecordsTableProps {
  rows: RowData[];
  schemaNameToContentType?: Record<string, string>;
  onCellClick?: (payload: VirtualizedRecordsTableCellClickPayload) => void;
  selection?: VirtualizedRecordsTableSelection;
}

function HeaderSelectCheckbox({
  ctx,
}: {
  ctx: HeaderContext<RowData, unknown>;
}) {
  return (
    <div className="table-th__content">
      <Checkbox
        id="select-all"
        name="select-all"
        size="sm"
        checked={ctx.table.getIsAllRowsSelected()}
        indeterminate={
          ctx.table.getIsSomeRowsSelected() && !ctx.table.getIsAllRowsSelected()
        }
        onChange={(e) =>
          ctx.table.toggleAllRowsSelected(!!e.currentTarget.checked)
        }
      />
    </div>
  );
}

function RowSelectCheckbox({ row }: { row: Row<RowData> }) {
  const meta = row.original[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
    | VirtualizedRowMeta
    | undefined;
  if (meta?.rowId === "empty-row") {
    return <span />;
  }
  return (
    <div className="table-td__content">
      <Checkbox
        id={`select-${row.id}`}
        name={`select-${row.id}`}
        size="sm"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.currentTarget.checked)}
      />
    </div>
  );
}

function renderSchemaHeaderLabel(schemaKey: string, contentType?: string) {
  const { iconType } = getContentTypeMeta(contentType);

  return (
    <div className="table-th__content">
      {iconType ? <Icon iconType={iconType} size="sm" /> : null}
      <span>{schemaKey}</span>
    </div>
  );
}

function renderSchemaCellContent(
  value: string | number | undefined,
  contentType: string | undefined,
  accessories?: LabelingRecordsCellAccessories
) {
  const displayValue = String(value ?? "");
  const hasDisplayValue = displayValue.length > 0;
  const util = renderCellUtil(accessories);
  const { iconType, normalized } = getContentTypeMeta(contentType);

  return (
    <div className="table-td__content">
      {iconType ? <Icon iconType={iconType} size="sm" /> : null}
      {hasDisplayValue ? (
        <span data-content-selection-anchor="true">{displayValue}</span>
      ) : (
        <span />
      )}
      {normalized === "TABLE" && hasDisplayValue && (
        <span className="unit">rows</span>
      )}
      {util}
    </div>
  );
}

function createColumns(
  keys: string[],
  schemaNameToContentType?: Record<string, string>,
  includeSelectColumn: boolean = true
): ColumnDef<RowData, unknown>[] {
  const visibleKeys = keys.filter(
    (key) => !LABELING_SYSTEM_COLUMN_IDS.has(key)
  );
  const rowNumberColumn: ColumnDef<RowData, unknown> = {
    id: "__rownum",
    header: () => <span className="table__column-index" />,
    size: 130,
    minSize: 60,
    maxSize: 160,
    cell: (info: CellContext<RowData, unknown>) => {
      const meta = info.row.original[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
        | VirtualizedRowMeta
        | undefined;
      const label =
        meta?.rowId === "empty-row" ? "" : String(info.row.index + 1);
      const accessories = getCellAccessories(info.row.original, "__rownum");
      return (
        <div className="table-td__content">
          <span>{label}</span>
          {renderCellUtil(accessories)}
        </div>
      );
    },
    enableResizing: true,
    meta: {
      title: "Row number",
    },
  };

  const selectColumn: ColumnDef<RowData, unknown> = {
    id: "__select_rownum",
    header: (ctx: HeaderContext<RowData, unknown>) => (
      <HeaderSelectCheckbox ctx={ctx} />
    ),
    size: 30,
    cell: (info: CellContext<RowData, unknown>) => (
      <RowSelectCheckbox row={info.row} />
    ),
    enableResizing: true,
    meta: {
      title: "Select row",
    },
  };

  const dataColumns = visibleKeys.map((key) => ({
    id: key,
    accessorKey: key,
    header: () => {
      const ct = schemaNameToContentType?.[key];
      return renderSchemaHeaderLabel(key, ct);
    },
    size: 200,
    cell: (info: CellContext<RowData, unknown>) => {
      const value = info.getValue() as string | number | undefined;
      const ct = schemaNameToContentType?.[key];
      const accessories = getCellAccessories(info.row.original, key);
      return renderSchemaCellContent(value, ct, accessories);
    },
    meta: {
      title: key,
    },
  }));

  if (includeSelectColumn) {
    return [selectColumn, rowNumberColumn, ...dataColumns];
  }
  return [rowNumberColumn, ...dataColumns];
}

export default function LabelingRecordsTable({
  rows,
  schemaNameToContentType,
  onCellClick,
  selection,
}: LabelingRecordsTableProps) {
  const [internalSelectedItems, setInternalSelectedItems] = useState<string[]>(
    []
  );
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});

  const selectionModes = selection?.modes ?? [];
  const selectedItems = selection?.selectedItems ?? internalSelectedItems;
  const setSelectedItems =
    selection?.setSelectedItems ?? setInternalSelectedItems;

  const isRowSelectionEnabled = selectionModes.includes("row");
  const isColumnSelectionEnabled = selectionModes.includes("column");
  const isCellSelectionEnabled = selectionModes.includes("cell");

  const availableRowIds = useMemo(() => {
    return rows
      .map((row) => {
        const meta = row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL];
        const rowId = (meta as VirtualizedRowMeta | undefined)?.rowId;
        if (typeof rowId === "string" && rowId.length > 0) {
          return rowId;
        }
        const rowRef = (meta as VirtualizedRowMeta | undefined)?.rowRef as
          | { id?: string | number }
          | undefined;
        const fallbackId =
          typeof rowRef?.id === "string"
            ? rowRef.id
            : typeof rowRef?.id === "number"
              ? String(rowRef.id)
              : null;
        return fallbackId;
      })
      .filter((id): id is string => Boolean(id));
  }, [rows]);
  const availableRowIdSet = useMemo(
    () => new Set(availableRowIds),
    [availableRowIds]
  );
  const selectedItemsSet = useMemo(
    () => new Set(selectedItems),
    [selectedItems]
  );

  useEffect(() => {
    if (!isRowSelectionEnabled || !selectedItems.length) {
      return;
    }
    const rowKeys = selectedItems.filter(isRowSelectionKey);
    const validRowKeys = rowKeys.filter((key) => {
      const rowId = parseRowSelectionKey(key);
      return rowId ? availableRowIdSet.has(rowId) : false;
    });
    const nonRowItems = selectedItems.filter(
      (item) => !isRowSelectionKey(item)
    );

    if (validRowKeys.length !== rowKeys.length) {
      const uniqueItems = Array.from(
        new Set([...validRowKeys, ...nonRowItems])
      );
      setSelectedItems(uniqueItems);
    }
  }, [
    availableRowIdSet,
    selectedItems,
    setSelectedItems,
    isRowSelectionEnabled,
  ]);

  const rowSelection = useMemo<RowSelectionState>(() => {
    if (!isRowSelectionEnabled) {
      return {};
    }
    const rowKeys = selectedItems.filter(isRowSelectionKey);
    return rowKeys.reduce<RowSelectionState>((acc, key) => {
      const rowId = parseRowSelectionKey(key);
      if (rowId && availableRowIdSet.has(rowId)) {
        acc[rowId] = true;
      }
      return acc;
    }, {});
  }, [selectedItems, isRowSelectionEnabled, availableRowIdSet]);

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      if (!isRowSelectionEnabled) {
        return;
      }
      const nextState =
        typeof updater === "function" ? updater(rowSelection) : updater;
      const nextRowKeys = Object.entries(nextState)
        .filter(([rowId, selected]) => selected && availableRowIdSet.has(rowId))
        .map(([rowId]) => createRowSelectionKey(rowId));
      const uniqueRowKeys = Array.from(new Set(nextRowKeys));
      setSelectedItems(uniqueRowKeys);
    },
    [rowSelection, setSelectedItems, availableRowIdSet, isRowSelectionEnabled]
  );

  const columns = useMemo(() => {
    const keys =
      rows.length > 0
        ? Object.keys(rows[0] ?? {})
        : Object.keys(schemaNameToContentType ?? {});
    return createColumns(keys, schemaNameToContentType, isRowSelectionEnabled);
  }, [rows, schemaNameToContentType, isRowSelectionEnabled]);

  const selectedColumnIdsSet = useMemo<ReadonlySet<string>>(() => {
    if (!isColumnSelectionEnabled) {
      return EMPTY_SELECTION_SET;
    }
    return new Set(
      selectedItems
        .filter(isColumnSelectionKey)
        .map((item) => item.slice(COLUMN_SELECTION_KEY_PREFIX.length))
    );
  }, [isColumnSelectionEnabled, selectedItems]);

  const selectedCellKeysSet = useMemo<ReadonlySet<string>>(() => {
    if (!isCellSelectionEnabled) {
      return EMPTY_SELECTION_SET;
    }
    return new Set(
      selectedItems.filter((key) => {
        if (!isCellSelectionKey(key)) {
          return false;
        }
        const parsed = parseCellSelectionKey(key);
        return Boolean(parsed);
      })
    );
  }, [isCellSelectionEnabled, selectedItems]);
  const selectedCellCountByColumn = useMemo(() => {
    const map = new Map<string, number>();
    if (!isCellSelectionEnabled || selectedCellKeysSet.size === 0) {
      return map;
    }
    selectedCellKeysSet.forEach((key) => {
      const parsed = parseCellSelectionKey(key);
      if (!parsed) {
        return;
      }
      map.set(parsed.columnId, (map.get(parsed.columnId) ?? 0) + 1);
    });
    return map;
  }, [isCellSelectionEnabled, selectedCellKeysSet]);

  const handleColumnSelectionToggle = useCallback(
    (columnId: string) => {
      if (!isColumnSelectionEnabled) {
        return;
      }
      const columnKey = createColumnSelectionKey(columnId);
      const isColumnSelected = selectedItemsSet.has(columnKey);

      if (isColumnSelected) {
        setSelectedItems([]);
        return;
      }

      setSelectedItems([columnKey]);
    },
    [isColumnSelectionEnabled, selectedItemsSet, setSelectedItems]
  );

  const handleCellSelectionToggle = useCallback(
    (rowId: string, columnId: string) => {
      if (!isCellSelectionEnabled) {
        return;
      }
      const cellKey = getVirtualizedCellKey(rowId, columnId);
      const sanitized = selectedItems.filter((item) => {
        if (isRowSelectionKey(item) || isColumnSelectionKey(item)) {
          return false;
        }
        if (isCellSelectionKey(item)) {
          const parsed = parseCellSelectionKey(item);
          return parsed?.columnId === columnId;
        }
        return false;
      });
      const sanitizedSet = new Set(sanitized);
      const isSelected = sanitizedSet.has(cellKey);
      const nextItems = isSelected
        ? sanitized.filter((key) => key !== cellKey)
        : [...sanitized, cellKey];

      setSelectedItems(nextItems);
    },
    [isCellSelectionEnabled, selectedItems, setSelectedItems]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    enableRowSelection: isRowSelectionEnabled,
    getRowId: (row, index) => {
      const meta = row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
        | VirtualizedRowMeta
        | undefined;
      if (meta?.rowId) {
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
    },
    state: {
      rowSelection,
      columnSizing,
    },
    onRowSelectionChange: handleRowSelectionChange,
    onColumnSizingChange: setColumnSizing,
  });

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const headerInnerRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef(0);

  const visibleLeafColumns = table.getVisibleLeafColumns();
  const columnVirtualizer = useVirtualizer({
    horizontal: true,
    count: visibleLeafColumns.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: (index) => visibleLeafColumns[index]?.getSize?.() ?? 140,
    overscan: 5,
  });
  const virtualCols = columnVirtualizer.getVirtualItems();

  const rowVirtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => bodyRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  const totalTableWidth = columnVirtualizer.getTotalSize();
  const currentStart = virtualCols[0]?.start ?? 0;
  startRef.current = currentStart;

  useEffect(() => {
    const scrollLeft = bodyRef.current?.scrollLeft ?? 0;
    if (headerInnerRef.current) {
      headerInnerRef.current.style.transform = `translateX(${currentStart - scrollLeft}px)`;
    }
  }, [currentStart]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      columnVirtualizer.measure();
    });
    return () => cancelAnimationFrame(id);
  }, [columnSizing, columnVirtualizer]);

  return (
    <div className="content-wrapper">
      <div className="table-content table-content-record">
        <div
          className="table__header-wrapper"
          ref={wrapperRef}
          style={{
            overflow: "hidden",
            width: "100%",
          }}
        >
          <div
            style={{
              width: totalTableWidth,
            }}
          >
            <div
              className="table__header"
              ref={headerInnerRef}
              style={{
                display: "inline-flex",
                willChange: "transform",
              }}
            >
              {table.getHeaderGroups().map((headerGroup) => (
                <div
                  className="table__header-tr table-tr"
                  key={headerGroup.id}
                  style={{
                    display: "inline-flex",
                  }}
                >
                  {virtualCols.map((vc) => {
                    const header = headerGroup.headers[vc.index];
                    if (!header) return null;
                    const w = header.getSize();
                    const columnId = header.column.id;
                    const isSelectableColumn =
                      !NON_DATA_COLUMN_IDS.has(columnId);
                    const isColumnSelected =
                      isSelectableColumn && selectedColumnIdsSet.has(columnId);

                    let isIndeterminate = false;
                    if (
                      isSelectableColumn &&
                      isColumnSelectionEnabled &&
                      isCellSelectionEnabled
                    ) {
                      const selectedCellsInColumn =
                        selectedCellCountByColumn.get(columnId) ?? 0;
                      const totalCellsInColumn = availableRowIds.length;
                      isIndeterminate =
                        !isColumnSelected &&
                        selectedCellsInColumn > 0 &&
                        selectedCellsInColumn < totalCellsInColumn;
                    }

                    const canSelectColumn =
                      isColumnSelectionEnabled && isSelectableColumn;
                    const headerClassName = `table__header-th table-th${
                      isColumnSelected ? " selected" : ""
                    }${isIndeterminate ? " indeterminate" : ""}`;
                    const handleHeaderClick = canSelectColumn
                      ? (event: ReactMouseEvent<HTMLDivElement>) => {
                          const target = event.target as HTMLElement | null;
                          if (
                            target?.closest(RESIZE_HANDLE_SELECTOR) ||
                            target?.closest("button")
                          ) {
                            return;
                          }
                          handleColumnSelectionToggle(columnId);
                        }
                      : undefined;
                    const handleHeaderKeyDown = canSelectColumn
                      ? (event: ReactKeyboardEvent<HTMLDivElement>) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleColumnSelectionToggle(columnId);
                          }
                        }
                      : undefined;
                    return (
                      <div
                        className={headerClassName}
                        key={header.id}
                        style={{
                          width: w,
                          minWidth: w,
                          maxWidth: w,
                          position: "relative",
                        }}
                        title={String(
                          header.column.columnDef.meta?.title ??
                            header.column.id
                        )}
                        {...(canSelectColumn && {
                          role: "button",
                          tabIndex: 0,
                          "aria-pressed": isColumnSelected,
                          onClick: handleHeaderClick,
                          onKeyDown: handleHeaderKeyDown,
                        })}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getCanResize() ? (
                          <button
                            type="button"
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            aria-label="Resize column"
                            tabIndex={-1}
                            style={{
                              position: "absolute",
                              right: 0,
                              top: 0,
                              height: "100%",
                              width: 4,
                              cursor: "col-resize",
                              userSelect: "none",
                              touchAction: "none",
                              opacity: header.column.getIsResizing() ? 1 : 0,
                              backgroundColor: header.column.getIsResizing()
                                ? "rgba(0,0,0,0.2)"
                                : "transparent",
                              border: 0,
                              padding: 0,
                              margin: 0,
                              outline: "none",
                              backgroundClip: "padding-box",
                            }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="table__body-wrapper"
          ref={bodyRef}
          onScroll={(event) => {
            const scrollLeft = event.currentTarget.scrollLeft;
            const start = startRef.current;
            if (headerInnerRef.current) {
              headerInnerRef.current.style.transform = `translateX(${start - scrollLeft}px)`;
            }
          }}
          style={{
            overflowY: "auto",
            overflowX: "auto",
          }}
        >
          <div style={{ width: totalTableWidth }}>
            <div
              className="table__body"
              style={{
                height: rowVirtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = table.getRowModel().rows[
                  virtualRow.index
                ] as Row<RowData>;
                return (
                  <VirtualizedRow
                    key={row.id}
                    top={virtualRow.start}
                    height={virtualRow.size}
                    virtualCols={virtualCols}
                    row={row}
                    selected={row.getIsSelected()}
                    onCellClick={onCellClick}
                    columnSelectionSet={selectedColumnIdsSet}
                    cellSelectionSet={selectedCellKeysSet}
                    onToggleCellSelection={
                      isCellSelectionEnabled
                        ? handleCellSelectionToggle
                        : undefined
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const VirtualizedRow = memo(function VirtualizedRow(props: {
  top: number;
  height: number;
  virtualCols: VirtualItem[];
  row: Row<RowData>;
  selected: boolean;
  onCellClick?: LabelingRecordsTableProps["onCellClick"];
  columnSelectionSet: ReadonlySet<string>;
  cellSelectionSet: ReadonlySet<string>;
  onToggleCellSelection?: (rowId: string, columnId: string) => void;
}) {
  const {
    top,
    height,
    virtualCols,
    row,
    selected,
    onCellClick,
    columnSelectionSet,
    cellSelectionSet,
    onToggleCellSelection,
  } = props;
  const cells = row.getVisibleCells();
  const rowMeta = row.original[VIRTUALIZED_RECORDS_ROW_META_SYMBOL];
  const rowId = row.id;

  return (
    <div
      className={`table__body-tr table-tr${selected ? " selected" : ""}`}
      style={{
        position: "absolute",
        top,
        left: 0,
        height,
        width: "100%",
      }}
    >
      <div
        style={{
          position: "absolute",
          transform: `translateX(${virtualCols[0]?.start ?? 0}px)`,
          display: "inline-flex",
          height: "100%",
        }}
      >
        {virtualCols.map((virtualCell) => {
          const cell = cells[virtualCell.index];
          if (!cell) return null;
          const w = cell.column.getSize();
          const columnId = cell.column.id;
          const isSelectableColumn = !NON_DATA_COLUMN_IDS.has(columnId);
          const cellKey = getVirtualizedCellKey(rowId, columnId);
          const isColumnSelected =
            isSelectableColumn && columnSelectionSet.has(columnId);
          const isCellSelected =
            isSelectableColumn && cellSelectionSet.has(cellKey);
          const canToggleCellSelection =
            isSelectableColumn && Boolean(onToggleCellSelection);
          const canEmitCellClick = Boolean(onCellClick);
          const shouldHandleInteraction =
            canEmitCellClick || canToggleCellSelection;

          const resolveContentSelectionAnchor = (
            eventTarget: EventTarget | null
          ) => {
            if (!(eventTarget instanceof HTMLElement)) {
              return null;
            }
            return eventTarget.closest(CONTENT_SELECTION_ANCHOR_SELECTOR);
          };

          const isContentSelectionEvent = (eventTarget: EventTarget | null) => {
            if (!onCellClick) {
              return false;
            }
            return Boolean(resolveContentSelectionAnchor(eventTarget));
          };

          const emitCellEvent = (
            event:
              | ReactMouseEvent<HTMLDivElement>
              | ReactKeyboardEvent<HTMLDivElement>
          ) => {
            if (!onCellClick) return;
            const value = cell.getValue() as string | number | undefined;
            const reference = (rowMeta as VirtualizedRowMeta | undefined)
              ?.columnRefs?.[columnId];
            onCellClick({
              columnId,
              value: value ?? "",
              row: row.original,
              rowIndex: row.index,
              reference,
              event,
            });
          };

          const handleCellClick = shouldHandleInteraction
            ? (event: ReactMouseEvent<HTMLDivElement>) => {
                const contentSelectionTriggered = isContentSelectionEvent(
                  event.target
                );
                if (contentSelectionTriggered) {
                  if (canEmitCellClick) {
                    emitCellEvent(event);
                  }
                  return;
                }
                if (canToggleCellSelection && onToggleCellSelection) {
                  onToggleCellSelection(rowId, columnId);
                }
              }
            : undefined;

          const handleKeyDown = shouldHandleInteraction
            ? (event: ReactKeyboardEvent<HTMLDivElement>) => {
                if (event.key === "Enter" || event.key === " ") {
                  const contentSelectionTriggered = isContentSelectionEvent(
                    event.target
                  );
                  if (contentSelectionTriggered) {
                    if (canEmitCellClick) {
                      event.preventDefault();
                      emitCellEvent(event);
                    }
                    return;
                  }
                  if (canToggleCellSelection && onToggleCellSelection) {
                    event.preventDefault();
                    onToggleCellSelection(rowId, columnId);
                  }
                }
              }
            : undefined;

          const cellClassName = `table__body-td table-td${
            isColumnSelected || isCellSelected ? " selected" : ""
          }`;

          return (
            <div
              className={cellClassName}
              key={cell.id}
              style={{
                width: w,
                minWidth: w,
                maxWidth: w,
              }}
              title={String(cell.getValue() ?? "")}
              tabIndex={shouldHandleInteraction ? 0 : undefined}
              onClick={handleCellClick}
              onKeyDown={handleKeyDown}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext()) ??
                String(cell.getValue() ?? "")}
            </div>
          );
        })}
      </div>
    </div>
  );
});
