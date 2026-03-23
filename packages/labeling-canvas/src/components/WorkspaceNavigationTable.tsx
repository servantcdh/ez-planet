import {
  Fragment,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  type Row,
  useReactTable,
} from "@tanstack/react-table";

import { Badge, Icon } from "@/components";
import Tip from "@/components/molecules/Tip";
import {
  VIRTUALIZED_RECORDS_ROW_META_SYMBOL,
  type VirtualizedRowMeta,
} from "@/components/organisms/VirtualizedRecordsTable";
import { useDatasetContentDetail } from "@/features/dataset/queries";
import type {
  DatasetContentDetailParams,
  DatasetContentRecord,
} from "@/features/dataset/types/domain";
import { getContentTypeMeta } from "@/lib/ui/contentType";

import { LABELING_SYSTEM_COLUMN_IDS } from "../constants/hiddenColumns";
import {
  useLabelWorkspaceDirty,
  WORKSPACE_DIRTY_CONFIRM_MESSAGE,
} from "../hooks/useLabelWorkspaceDirty";
import { useWorkspaceNavigationDetailSelectionStore } from "../store/workspaceNavigationDetailSelection.store";
import type { SchemaStatus } from "../types/domain";
import type { LabelingDatasetCellReference } from "../types/recordSelection";
import {
  LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL,
  type LabelingRecordsCellAccessories,
  type LabelingRecordsCellAccessoriesMap,
  type LabelingRecordsTableRow,
} from "./LabelingRecordsTable";
import WorkspaceNavigationDetailTable from "./WorkspaceNavigationDetailTable";

interface WorkspaceNavigationTableProps {
  rows: LabelingRecordsTableRow[];
  schemaNameToContentType: Record<string, string>;
  schemaStatusMap?: Map<string, Map<string, SchemaStatus>>;
  disableAutoExpand?: boolean;
  initialSelectedRowId?: string | null;
}

interface ExpandedContext {
  rowId: string;
  columnId: string;
  reference: LabelingDatasetCellReference;
  schemaAccessory?: LabelingRecordsCellAccessories | null;
}

function formatSummaryValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? "-" : value.toLocaleString();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string") {
    return value.trim().length > 0 ? value : "-";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function renderAccessories(accessories?: LabelingRecordsCellAccessories) {
  if (!accessories) {
    return null;
  }
  if (
    !accessories.badges?.length &&
    !accessories.hasIssue &&
    !accessories.hasValidationCompleted
  ) {
    return null;
  }
  return (
    <div className="table-td__content-util">
      {accessories.badges?.map((badge, idx) => (
        <Badge
          key={`${badge.title}-${idx}`}
          title={badge.title}
          style={badge.style}
          size="lg"
        />
      ))}
      {accessories.hasValidationCompleted ? (
        <Icon iconType="icon-validated" style="primary" />
      ) : null}
      {accessories.hasIssue ? (
        <Icon iconType="icon-issue" style="accent" />
      ) : null}
    </div>
  );
}

function getRowIdFromMeta(row: LabelingRecordsTableRow, index: number): string {
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
  return `row-${index}`;
}

function resolveColumnReference(
  row: LabelingRecordsTableRow,
  columnId: string
): LabelingDatasetCellReference | undefined {
  const meta = row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
    | VirtualizedRowMeta
    | undefined;
  const columnRefs = meta?.columnRefs as
    | Record<string, LabelingDatasetCellReference | undefined>
    | undefined;
  return columnRefs?.[columnId];
}

function resolveDetailParams(
  reference: LabelingDatasetCellReference | undefined
): DatasetContentDetailParams | null {
  if (!reference) {
    return null;
  }
  const legacyContentSetId = (
    reference as {
      contentSetsId?: string;
    }
  ).contentSetsId;
  const contentSetId =
    reference.contentSetId ??
    (typeof legacyContentSetId === "string" ? legacyContentSetId : undefined);

  if (!contentSetId) {
    return null;
  }

  return {
    datasetId: reference.datasetId,
    version: reference.version,
    contentSetId,
    schemaNames: reference.schemaNames,
    showIntProps: reference.showIntProps ?? true,
  };
}

function normalizeDetailValues(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value == null) {
    return [];
  }
  return [value];
}

function mergeAccessories(
  base?: LabelingRecordsCellAccessories | null,
  extra?: LabelingRecordsCellAccessories | null
): LabelingRecordsCellAccessories | null {
  if (!base && !extra) {
    return null;
  }
  const seen = new Set<string>();
  const mergedBadges: NonNullable<LabelingRecordsCellAccessories["badges"]> =
    [];
  const pushBadge = (
    badge: NonNullable<LabelingRecordsCellAccessories["badges"]>[number]
  ) => {
    const key = `${badge.title}::${badge.style ?? ""}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    mergedBadges.push(badge);
  };
  (base?.badges ?? []).forEach(pushBadge);
  (extra?.badges ?? []).forEach(pushBadge);
  const hasIssue = Boolean(base?.hasIssue || extra?.hasIssue);
  const hasValidationCompleted = Boolean(
    base?.hasValidationCompleted || extra?.hasValidationCompleted
  );
  if (!mergedBadges.length && !hasIssue && !hasValidationCompleted) {
    return null;
  }
  return {
    badges: mergedBadges.length ? mergedBadges : undefined,
    hasIssue: hasIssue || undefined,
    hasValidationCompleted: hasValidationCompleted || undefined,
  };
}

function resolveDetailContentSetId(
  detailRecord: DatasetContentRecord | null,
  reference: LabelingDatasetCellReference | undefined
): string | null {
  const resolvedContentSetIdCandidate =
    detailRecord?.contentSetId ??
    (detailRecord as { contentsetId?: string | number } | undefined)
      ?.contentsetId ??
    reference?.contentSetId ??
    null;
  if (typeof resolvedContentSetIdCandidate === "number") {
    return String(resolvedContentSetIdCandidate);
  }
  return resolvedContentSetIdCandidate ?? null;
}

function resolveReferenceSchemaNames(
  reference: LabelingDatasetCellReference | undefined
): string[] {
  if (!reference) {
    return [];
  }
  const schemaNames = (reference.schemaNames ?? []).filter(
    (name): name is string => typeof name === "string" && name.length > 0
  );
  if (!schemaNames.length && reference.schemaLabel) {
    schemaNames.push(reference.schemaLabel);
  }
  return schemaNames;
}

function formatDetailValue(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }
  if (value == null) {
    return "-";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function buildDetailRows(
  detailRecord: DatasetContentRecord | null,
  reference: LabelingDatasetCellReference | undefined,
  schemaAccessory?: LabelingRecordsCellAccessories | null,
  labeledElementIds?: ReadonlySet<string> | null,
  issueElementIds?: ReadonlySet<string> | null,
  validatedElementIds?: ReadonlySet<string> | null
): Array<
  Record<string, string> & {
    [LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL]?: LabelingRecordsCellAccessoriesMap;
  }
> {
  if (!detailRecord || !reference) {
    return [];
  }
  const contents = (detailRecord.contents ?? {}) as Record<string, unknown>;
  const targetKey = getDetailTargetKey(contents, reference);
  if (!targetKey) {
    return [];
  }
  const rawValue = contents[targetKey];
  const values = normalizeDetailValues(rawValue);
  return values.map((entry) => {
    const baseRow: Record<string, string> = {};
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      Object.entries(entry as Record<string, unknown>).forEach(
        ([key, value]) => {
          baseRow[key] = formatDetailValue(value);
        }
      );
    } else {
      baseRow.value = formatDetailValue(entry);
    }

    const elementId =
      entry && typeof entry === "object" && !Array.isArray(entry)
        ? typeof (entry as { elementId?: string }).elementId === "string"
          ? (entry as { elementId?: string }).elementId
          : undefined
        : undefined;
    const isLabeled = elementId ? labeledElementIds?.has(elementId) : false;
    const hasIssue = elementId ? issueElementIds?.has(elementId) : false;
    const isValidationCompleted = elementId
      ? validatedElementIds?.has(elementId)
      : false;
    const elementAccessory: LabelingRecordsCellAccessories | null =
      isLabeled || hasIssue || isValidationCompleted
        ? {
            ...(isLabeled
              ? { badges: [{ title: "Labeled", style: "primary-light" }] }
              : {}),
            ...(hasIssue ? { hasIssue: true } : {}),
            ...(isValidationCompleted ? { hasValidationCompleted: true } : {}),
          }
        : null;
    const isTableType =
      (reference?.contentType ?? "").toUpperCase() === "TABLE";
    const baseAccessory = isTableType
      ? null
      : labeledElementIds
        ? null
        : (schemaAccessory ?? null);
    const rowAccessory = mergeAccessories(baseAccessory, elementAccessory);
    const accessories: LabelingRecordsCellAccessoriesMap | undefined =
      rowAccessory
        ? {
            __rownum: rowAccessory,
          }
        : undefined;

    return accessories
      ? { ...baseRow, [LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL]: accessories }
      : baseRow;
  });
}

function buildDetailColumns(rows: Array<Record<string, string>>): string[] {
  const set = new Set<string>();
  rows.forEach((row) => {
    Object.keys(row).forEach((key) => set.add(key));
  });
  return Array.from(set).filter((key) => !LABELING_SYSTEM_COLUMN_IDS.has(key));
}

function getDetailTargetKey(
  contents: Record<string, unknown>,
  reference: LabelingDatasetCellReference | undefined
): string | null {
  if (!reference) {
    return null;
  }
  return (
    reference.schemaNames.find((name) =>
      Object.prototype.hasOwnProperty.call(contents, name)
    ) ??
    reference.schemaNames[0] ??
    null
  );
}

function extractDetailElementId(
  detailRecord: DatasetContentRecord | null,
  reference: LabelingDatasetCellReference | undefined
): string | null {
  if (!detailRecord || !reference) {
    return null;
  }
  const contents = (detailRecord.contents ?? {}) as Record<string, unknown>;
  const targetKey = getDetailTargetKey(contents, reference);
  if (!targetKey) {
    return null;
  }

  const values = normalizeDetailValues(contents[targetKey]);
  for (const entry of values) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const elementId =
      typeof (entry as { elementId?: string }).elementId === "string"
        ? (entry as { elementId?: string }).elementId
        : undefined;
    if (elementId && elementId.length > 0) {
      return elementId;
    }
  }

  return (detailRecord as { elementId?: string }).elementId ?? null;
}

function findFirstExpandableContext(
  rows: LabelingRecordsTableRow[],
  columnIds: string[],
  schemaNameToContentType: Record<string, string>,
  selectedRowIdSet: ReadonlySet<string>
): ExpandedContext | null {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const rowId = getRowIdFromMeta(row, rowIndex);
    if (selectedRowIdSet.size > 0 && !selectedRowIdSet.has(rowId)) {
      continue;
    }
    for (const columnId of columnIds) {
      const reference = resolveColumnReference(row, columnId);
      if (reference) {
        const mappedType = schemaNameToContentType[columnId];
        const contentType =
          typeof reference.contentType === "string"
            ? reference.contentType
            : typeof mappedType === "string"
              ? mappedType
              : "";
        if (contentType.toUpperCase() === "TABLE") {
          continue;
        }
        const accessories = row[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] as
          | LabelingRecordsCellAccessoriesMap
          | undefined;
        return {
          rowId,
          columnId,
          reference,
          schemaAccessory: accessories?.[columnId],
        };
      }
    }
  }
  return null;
}

function deriveRecordName(
  detailRecord: DatasetContentRecord | null,
  context: ExpandedContext | null
): string | null {
  const candidates = [
    detailRecord?.id,
    detailRecord?.contentSetId,
    (detailRecord as { contentsetId?: string | number } | undefined)
      ?.contentsetId,
    context?.rowId,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function deriveColumnLabel(context: ExpandedContext | null): string | null {
  const reference = context?.reference;
  const candidates = [
    reference?.schemaLabel,
    reference?.schemaNames?.[0],
    context?.columnId,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return null;
}

interface DetailPanelProps {
  context: ExpandedContext | null;
  autoSelectEnabled: boolean;
  schemaStatusMap?: Map<string, Map<string, SchemaStatus>>;
}

function DetailPanel({
  context,
  autoSelectEnabled,
  schemaStatusMap,
}: DetailPanelProps) {
  const detailParams = useMemo(
    () => resolveDetailParams(context?.reference),
    [context]
  );
  const {
    data: detailRecord,
    isLoading,
    isError,
    error,
  } = useDatasetContentDetail(detailParams);
  const resolvedContentSetId = useMemo(
    () => resolveDetailContentSetId(detailRecord ?? null, context?.reference),
    [context?.reference, detailRecord]
  );
  const detailElementStatusSets = useMemo(() => {
    if (!schemaStatusMap || !context?.reference || !resolvedContentSetId) {
      return {
        labeledElementIds: null as Set<string> | null,
        issueElementIds: null as Set<string> | null,
        validatedElementIds: null as Set<string> | null,
      };
    }
    const schemaMap = schemaStatusMap.get(resolvedContentSetId);
    if (!schemaMap) {
      return {
        labeledElementIds: null as Set<string> | null,
        issueElementIds: null as Set<string> | null,
        validatedElementIds: null as Set<string> | null,
      };
    }
    const schemaNames = resolveReferenceSchemaNames(context.reference);
    if (!schemaNames.length) {
      return {
        labeledElementIds: null as Set<string> | null,
        issueElementIds: null as Set<string> | null,
        validatedElementIds: null as Set<string> | null,
      };
    }

    const labeledElementIds = new Set<string>();
    const issueElementIds = new Set<string>();
    const validatedElementIds = new Set<string>();

    schemaNames.forEach((schemaName) => {
      const status = schemaMap.get(schemaName);
      status?.elements?.forEach((element) => {
        const elementId = element.elementId;
        if (typeof elementId === "string" && elementId.length > 0) {
          labeledElementIds.add(elementId);
        }

        const elementStatuses = element.elementStatus ?? [];
        if (
          typeof elementId === "string" &&
          elementId.length > 0 &&
          elementStatuses.includes("VALIDATION_ERROR")
        ) {
          issueElementIds.add(elementId);
        }
        if (
          typeof elementId === "string" &&
          elementId.length > 0 &&
          elementStatuses.includes("VALIDATION_COMPLETED")
        ) {
          validatedElementIds.add(elementId);
        }
      });
    });

    return {
      labeledElementIds: labeledElementIds.size > 0 ? labeledElementIds : null,
      issueElementIds: issueElementIds.size > 0 ? issueElementIds : null,
      validatedElementIds:
        validatedElementIds.size > 0 ? validatedElementIds : null,
    };
  }, [context?.reference, resolvedContentSetId, schemaStatusMap]);

  const detailRows = useMemo(
    () =>
      buildDetailRows(
        detailRecord ?? null,
        context?.reference,
        context?.schemaAccessory,
        detailElementStatusSets.labeledElementIds,
        detailElementStatusSets.issueElementIds,
        detailElementStatusSets.validatedElementIds
      ),
    [
      detailRecord,
      context?.reference,
      context?.schemaAccessory,
      detailElementStatusSets,
    ]
  );
  const detailColumns = useMemo(
    () => buildDetailColumns(detailRows),
    [detailRows]
  );
  const setDetailContext = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.setContext
  );
  const detailStoreRowCount = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.rows.length
  );

  useLayoutEffect(() => {
    if (!context?.reference) {
      setDetailContext(null);
      return;
    }
    const recordName = deriveRecordName(detailRecord ?? null, context);
    const columnLabel = deriveColumnLabel(context);
    const resolvedElementId = extractDetailElementId(
      detailRecord ?? null,
      context?.reference
    );
    const resolvedSchemaName =
      context.reference.schemaNames?.find(
        (name) => typeof name === "string" && name.length > 0
      ) ??
      context.reference.schemaLabel ??
      null;
    setDetailContext({
      columns: detailColumns,
      rows: detailRows,
      recordName,
      columnName: columnLabel,
      contentType: context.reference.contentType ?? null,
      contentSetId: resolvedContentSetId,
      schemaName: resolvedSchemaName,
      elementId: resolvedElementId,
    });
  }, [
    context,
    detailColumns,
    detailRecord,
    detailRows,
    resolvedContentSetId,
    setDetailContext,
  ]);

  let content: ReactNode;
  if (!context?.reference) {
    content = (
      <Tip
        title="No Selection"
        content="Choose a cell to view its details."
        isClosable={false}
      />
    );
  } else if (!detailParams) {
    content = (
      <Tip
        title="Unavailable"
        content="Detail parameters could not be resolved for this cell."
        isClosable={false}
      />
    );
  } else if (isLoading) {
    content = (
      <Tip
        title="Loading"
        content="Fetching detail data..."
        isClosable={false}
      />
    );
  } else if (isError) {
    const message = error instanceof Error ? error.message : "Unknown error";
    content = (
      <Tip
        title="Failed to Load"
        content={`Unable to fetch details: ${message}`}
        isClosable={false}
        style="accent"
      />
    );
  } else if (!detailRows.length && detailStoreRowCount === 0) {
    content = (
      <Tip
        title="No Data"
        content="This cell does not contain any displayable data."
        isClosable={false}
      />
    );
  } else {
    content = (
      <WorkspaceNavigationDetailTable autoSelectEnabled={autoSelectEnabled} />
    );
  }

  return <>{content}</>;
}

interface SchemaCellProps {
  value: unknown;
  accessories?: LabelingRecordsCellAccessories;
  isExpanded: boolean;
  canExpand: boolean;
  onToggle: () => void;
}

function SchemaCell({
  value,
  accessories,
  isExpanded,
  canExpand,
  onToggle,
}: SchemaCellProps) {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!canExpand) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      className={`table-td__content workspace-navigation-table__cell${
        canExpand ? " is-expandable" : ""
      }`}
      tabIndex={canExpand ? 0 : undefined}
      onClick={canExpand ? onToggle : undefined}
      onKeyDown={canExpand ? handleKeyDown : undefined}
    >
      {canExpand ? (
        <span
          style={{
            transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.15s ease",
          }}
        >
          <Icon iconType="icon-arrow-down" size="xxs" />
        </span>
      ) : (
        <span className="workspace-navigation-table__cell-placeholder" />
      )}
      <span>{formatSummaryValue(value)}</span>
      {renderAccessories(accessories)}
    </div>
  );
}

export default function WorkspaceNavigationTable({
  rows,
  schemaNameToContentType,
  schemaStatusMap,
  disableAutoExpand = false,
  initialSelectedRowId = null,
}: WorkspaceNavigationTableProps) {
  const [expandedContext, setExpandedContext] =
    useState<ExpandedContext | null>(null);
  const activeRowId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.activeRowId
  );
  const setActiveRowId = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.setActiveRowId
  );
  const detailSelectedRows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.selectedRows
  );
  const detailRowsLength = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.rows.length
  );
  const detailRows = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.rows
  );
  const detailContentType = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.contentType
  );
  const setDetailSelectionSnapshot = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.setSelectionSnapshot
  );
  const detailContextResetKey = useWorkspaceNavigationDetailSelectionStore(
    (state) => state.detailContextResetKey
  );
  const { confirmIfDirty } = useLabelWorkspaceDirty();
  const [autoExpandSuppressed, setAutoExpandSuppressed] = useState(false);
  const [hasPendingDetailSelection, setHasPendingDetailSelection] =
    useState(false);
  const pendingDetailSelectionRef = useRef<"first" | "last" | null>(null);

  const getContextKey = useCallback(
    (context: ExpandedContext | null) =>
      context ? `${context.rowId}::${context.columnId}` : null,
    []
  );

  const trySetExpandedContext = useCallback(
    (
      nextContext: ExpandedContext | null,
      options: { force?: boolean } = {}
    ) => {
      const { force = false } = options;
      if (!force) {
        const currentKey = getContextKey(expandedContext);
        const nextKey = getContextKey(nextContext);
        if (
          nextKey !== currentKey &&
          !confirmIfDirty(WORKSPACE_DIRTY_CONFIRM_MESSAGE)
        ) {
          return false;
        }
      }
      setExpandedContext(nextContext);
      return true;
    },
    [confirmIfDirty, expandedContext, getContextKey]
  );
  useEffect(() => {
    if (!rows.length) {
      setActiveRowId(null);
      return;
    }
    if (
      activeRowId &&
      rows.some((row, index) => getRowIdFromMeta(row, index) === activeRowId)
    ) {
      return;
    }
    if (
      initialSelectedRowId &&
      rows.some(
        (row, index) => getRowIdFromMeta(row, index) === initialSelectedRowId
      )
    ) {
      setActiveRowId(initialSelectedRowId);
      return;
    }
    setActiveRowId(getRowIdFromMeta(rows[0], 0));
  }, [activeRowId, initialSelectedRowId, rows, setActiveRowId]);

  const detailContextResetRef = useRef(detailContextResetKey);
  useEffect(() => {
    if (detailContextResetRef.current === detailContextResetKey) {
      return;
    }
    detailContextResetRef.current = detailContextResetKey;
    trySetExpandedContext(null, { force: true });
    setAutoExpandSuppressed(false);
  }, [detailContextResetKey, trySetExpandedContext]);

  const selectedRowIdSet = useMemo(
    () => (activeRowId ? new Set([activeRowId]) : new Set<string>()),
    [activeRowId]
  );

  const columnKeys = useMemo(() => {
    if (!rows.length) {
      return [];
    }
    const keys = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, [rows]);

  const handleCellToggle = useCallback(
    (
      row: Row<LabelingRecordsTableRow>,
      columnId: string,
      reference?: LabelingDatasetCellReference
    ) => {
      if (!reference) {
        return;
      }
      const accessories = row.original[
        LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL
      ] as LabelingRecordsCellAccessoriesMap | undefined;
      const schemaAccessory = accessories?.[columnId];
      const rowId = row.id;
      const isSameContext =
        expandedContext &&
        expandedContext.rowId === rowId &&
        expandedContext.columnId === columnId;
      if (isSameContext) {
        setExpandedContext(null);
        setAutoExpandSuppressed(true);
        return;
      }

      const nextContext: ExpandedContext = {
        rowId,
        columnId,
        reference,
        schemaAccessory,
      };
      if (!trySetExpandedContext(nextContext)) {
        return;
      }
      if (activeRowId !== rowId) {
        setActiveRowId(rowId);
      }
      setAutoExpandSuppressed(false);
    },
    [activeRowId, expandedContext, setActiveRowId, trySetExpandedContext]
  );
  const handleRowSelect = useCallback(
    (rowId: string) => {
      if (rowId === activeRowId) {
        return;
      }
      if (!confirmIfDirty(WORKSPACE_DIRTY_CONFIRM_MESSAGE)) {
        return;
      }
      setActiveRowId(rowId);
    },
    [activeRowId, confirmIfDirty, setActiveRowId]
  );

  const columns = useMemo<ColumnDef<LabelingRecordsTableRow>[]>(() => {
    return [
      {
        id: "__rownum",
        header: () => <span className="table__column-index" />,
        cell: (info) => {
          const accessories = (
            info.row.original[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] as
              | LabelingRecordsCellAccessoriesMap
              | undefined
          )?.__rownum;
          return (
            <div className="table-td__content">
              <span className="table__row-index">{info.row.index + 1}</span>
              {renderAccessories(accessories)}
            </div>
          );
        },
      },
      ...columnKeys.map((columnId) => ({
        id: columnId,
        accessorFn: (row: LabelingRecordsTableRow) => row[columnId],
        header: () => {
          const { iconType } = getContentTypeMeta(
            schemaNameToContentType[columnId]
          );
          return (
            <div className="table-th__content">
              {iconType ? <Icon iconType={iconType} size="sm" /> : null}
              <span>{columnId}</span>
            </div>
          );
        },
        cell: (info: {
          row: Row<LabelingRecordsTableRow>;
          getValue: () => unknown;
        }) => {
          const row = info.row;
          const reference = resolveColumnReference(row.original, columnId);
          const accessories = (
            row.original[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] as
              | LabelingRecordsCellAccessoriesMap
              | undefined
          )?.[columnId];
          const isExpanded =
            expandedContext?.rowId === row.id &&
            expandedContext?.columnId === columnId;
          return (
            <SchemaCell
              value={info.getValue()}
              accessories={accessories}
              isExpanded={Boolean(isExpanded)}
              canExpand={Boolean(reference)}
              onToggle={() => handleCellToggle(row, columnId, reference)}
            />
          );
        },
      })),
    ];
  }, [columnKeys, schemaNameToContentType, expandedContext, handleCellToggle]);

  const expandedState = useMemo(
    () => (expandedContext ? { [expandedContext.rowId]: true } : {}),
    [expandedContext]
  );

  const table = useReactTable({
    data: rows,
    columns,
    manualExpanding: true,
    state: { expanded: expandedState },
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowId: (row, index) => getRowIdFromMeta(row, index),
  });

  useEffect(() => {
    if (!expandedContext) {
      return;
    }
    let matchedRow: LabelingRecordsTableRow | null = null;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowId = getRowIdFromMeta(row, index);
      if (rowId === expandedContext.rowId) {
        matchedRow = row;
        break;
      }
    }
    if (!matchedRow) {
      trySetExpandedContext(null, { force: true });
      return;
    }
    const reference = resolveColumnReference(
      matchedRow,
      expandedContext.columnId
    );
    if (!reference) {
      trySetExpandedContext(null, { force: true });
      setAutoExpandSuppressed(false);
    }
  }, [rows, expandedContext, trySetExpandedContext]);

  const findAdjacentContext = useCallback(
    (direction: 1 | -1): ExpandedContext | null => {
      if (!expandedContext) {
        return null;
      }
      const columnId = expandedContext.columnId;
      const startIndex = rows.findIndex(
        (row, index) => getRowIdFromMeta(row, index) === expandedContext.rowId
      );
      if (startIndex === -1) {
        return null;
      }
      for (
        let index = startIndex + direction;
        index >= 0 && index < rows.length;
        index += direction
      ) {
        const row = rows[index];
        const reference = resolveColumnReference(row, columnId);
        const mappedType = schemaNameToContentType[columnId] ?? "";
        const contentType =
          typeof reference?.contentType === "string"
            ? reference.contentType
            : mappedType;
        if (
          reference &&
          (contentType ?? "").toUpperCase() !== "TABLE" &&
          reference.schemaNames?.length
        ) {
          const accessories = row[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] as
            | LabelingRecordsCellAccessoriesMap
            | undefined;
          return {
            rowId: getRowIdFromMeta(row, index),
            columnId,
            reference,
            schemaAccessory: accessories?.[columnId],
          };
        }
      }
      return null;
    },
    [expandedContext, rows, schemaNameToContentType]
  );

  const findAdjacentColumnContext = useCallback(
    (direction: 1 | -1): ExpandedContext | null => {
      if (!expandedContext) {
        return null;
      }
      const currentColumnIndex = columnKeys.indexOf(expandedContext.columnId);
      if (currentColumnIndex === -1) {
        return null;
      }
      const currentRowIndex = rows.findIndex(
        (row, index) => getRowIdFromMeta(row, index) === expandedContext.rowId
      );
      const rowSearchOrder = [
        ...(currentRowIndex >= 0 ? [currentRowIndex] : []),
        ...rows.map((_, idx) => idx).filter((idx) => idx !== currentRowIndex),
      ];

      for (
        let colIndex = currentColumnIndex + direction;
        colIndex >= 0 && colIndex < columnKeys.length;
        colIndex += direction
      ) {
        const candidateColumn = columnKeys[colIndex];
        for (const rowIndex of rowSearchOrder) {
          const row = rows[rowIndex];
          const reference = resolveColumnReference(row, candidateColumn);
          const mappedType = schemaNameToContentType[candidateColumn] ?? "";
          const contentType =
            typeof reference?.contentType === "string"
              ? reference.contentType
              : mappedType;
          if (
            reference &&
            (contentType ?? "").toUpperCase() !== "TABLE" &&
            reference.schemaNames?.length
          ) {
            const accessories = row[
              LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL
            ] as LabelingRecordsCellAccessoriesMap | undefined;
            return {
              rowId: getRowIdFromMeta(row, rowIndex),
              columnId: candidateColumn,
              reference,
              schemaAccessory: accessories?.[candidateColumn],
            };
          }
        }
      }
      return null;
    },
    [columnKeys, expandedContext, rows, schemaNameToContentType]
  );

  useEffect(() => {
    if (disableAutoExpand || expandedContext || autoExpandSuppressed) {
      return;
    }
    const nextContext = findFirstExpandableContext(
      rows,
      columnKeys,
      schemaNameToContentType,
      selectedRowIdSet
    );
    if (nextContext) {
      trySetExpandedContext(nextContext, { force: true });
    }
  }, [
    autoExpandSuppressed,
    rows,
    columnKeys,
    expandedContext,
    disableAutoExpand,
    schemaNameToContentType,
    selectedRowIdSet,
    trySetExpandedContext,
  ]);

  const performArrowNavigation = useCallback(
    (
      direction: "ArrowLeft" | "ArrowRight",
      { forceRecordJump = false } = {}
    ) => {
      if (!expandedContext) {
        return;
      }
      const isTableType = (detailContentType ?? "").toUpperCase() === "TABLE";
      if (isTableType) {
        return;
      }
      const currentIndex = detailSelectedRows[0] ?? 0;
      const hasDetailRows = detailRowsLength > 0;
      const isLast = hasDetailRows && currentIndex >= detailRowsLength - 1;
      const isFirst = currentIndex <= 0;

      if (direction === "ArrowRight") {
        if (hasDetailRows && !isLast && !forceRecordJump) {
          if (!confirmIfDirty(WORKSPACE_DIRTY_CONFIRM_MESSAGE)) {
            return;
          }
          setDetailSelectionSnapshot({ selectedRows: [currentIndex + 1] });
          return;
        }
        const nextContext = findAdjacentContext(1);
        if (nextContext && trySetExpandedContext(nextContext)) {
          setActiveRowId(nextContext.rowId);
          setAutoExpandSuppressed(false);
          pendingDetailSelectionRef.current = "first";
          setHasPendingDetailSelection(true);
        }
        return;
      }

      if (direction === "ArrowLeft") {
        if (hasDetailRows && !isFirst && !forceRecordJump) {
          if (!confirmIfDirty(WORKSPACE_DIRTY_CONFIRM_MESSAGE)) {
            return;
          }
          setDetailSelectionSnapshot({ selectedRows: [currentIndex - 1] });
          return;
        }
        const prevContext = findAdjacentContext(-1);
        if (prevContext && trySetExpandedContext(prevContext)) {
          setActiveRowId(prevContext.rowId);
          setAutoExpandSuppressed(false);
          pendingDetailSelectionRef.current = "last";
          setHasPendingDetailSelection(true);
        }
      }
    },
    [
      confirmIfDirty,
      detailContentType,
      detailRowsLength,
      detailSelectedRows,
      expandedContext,
      findAdjacentContext,
      setActiveRowId,
      setDetailSelectionSnapshot,
      trySetExpandedContext,
    ]
  );

  useEffect(() => {
    if (!expandedContext) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (event.metaKey) {
        event.preventDefault(); // block browser history
        if (
          target &&
          (target.isContentEditable ||
            ["input", "textarea", "select"].includes(
              target.tagName.toLowerCase()
            ))
        ) {
          return;
        }
        if (event.shiftKey) {
          performArrowNavigation(
            event.key === "ArrowRight" ? "ArrowRight" : "ArrowLeft",
            { forceRecordJump: true }
          );
          return;
        }
        const nextContext =
          event.key === "ArrowRight"
            ? findAdjacentColumnContext(1)
            : findAdjacentColumnContext(-1);
        if (nextContext && trySetExpandedContext(nextContext)) {
          setActiveRowId(nextContext.rowId);
          setAutoExpandSuppressed(false);
          pendingDetailSelectionRef.current = "first";
          setHasPendingDetailSelection(true);
        }
        return;
      }
      if (
        target &&
        (target.isContentEditable ||
          ["input", "textarea", "select"].includes(
            target.tagName.toLowerCase()
          ))
      ) {
        return;
      }
      event.preventDefault();
      performArrowNavigation(
        event.key === "ArrowRight" ? "ArrowRight" : "ArrowLeft"
      );
    };

    const handleCustomNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ direction: "left" | "right" }>)[
        "detail"
      ];
      if (!detail) {
        return;
      }
      performArrowNavigation(
        detail.direction === "right" ? "ArrowRight" : "ArrowLeft"
      );
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener(
      "workspace-nav-arrow",
      handleCustomNavigation as EventListener
    );
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(
        "workspace-nav-arrow",
        handleCustomNavigation as EventListener
      );
    };
  }, [
    expandedContext,
    findAdjacentColumnContext,
    performArrowNavigation,
    setActiveRowId,
    trySetExpandedContext,
  ]);

  useEffect(() => {
    if (!hasPendingDetailSelection) {
      return;
    }
    // Wait until the new context clears previous selection
    if (detailSelectedRows.length > 0) {
      return;
    }
    const pending = pendingDetailSelectionRef.current;
    if (!pending) {
      setHasPendingDetailSelection(false);
      return;
    }
    const isTableType = (detailContentType ?? "").toUpperCase() === "TABLE";
    if (isTableType) {
      pendingDetailSelectionRef.current = null;
      setHasPendingDetailSelection(false);
      return;
    }
    const rowCount = detailRows.length;
    if (rowCount <= 0) {
      return;
    }
    const targetIndex = pending === "first" ? 0 : Math.max(rowCount - 1, 0);
    setDetailSelectionSnapshot({ selectedRows: [targetIndex] });
    pendingDetailSelectionRef.current = null;
    setHasPendingDetailSelection(false);
  }, [
    detailContentType,
    detailRows,
    detailSelectedRows,
    expandedContext?.rowId,
    expandedContext?.columnId,
    hasPendingDetailSelection,
    setDetailSelectionSnapshot,
  ]);

  useEffect(() => {
    const isTableType = (detailContentType ?? "").toUpperCase() === "TABLE";
    if (!expandedContext || isTableType) {
      window.dispatchEvent(
        new CustomEvent("workspace-nav-availability", {
          detail: { canLeft: false, canRight: false },
        })
      );
      return;
    }
    const currentIndex = detailSelectedRows[0] ?? 0;
    const hasDetailRows = detailRowsLength > 0;
    const hasPrevDetail = hasDetailRows && currentIndex > 0;
    const hasNextDetail = hasDetailRows && currentIndex < detailRowsLength - 1;
    const hasPrevContext = Boolean(findAdjacentContext(-1));
    const hasNextContext = Boolean(findAdjacentContext(1));
    window.dispatchEvent(
      new CustomEvent("workspace-nav-availability", {
        detail: {
          canLeft: hasPrevDetail || hasPrevContext,
          canRight: hasNextDetail || hasNextContext,
        },
      })
    );
  }, [
    detailContentType,
    detailRowsLength,
    detailSelectedRows,
    expandedContext,
    findAdjacentContext,
  ]);

  return (
    <div className="workspace-navigation-table">
      <table className="table-content table-content-default table-content-record">
        <thead className="table__header-wrapper">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="table__header-tr table-tr">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="table__header-th table-th">
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="table__body-wrapper">
          {table.getRowModel().rows.map((row) => {
            const isRowSelected =
              !expandedContext && selectedRowIdSet.has(row.id);
            return (
              <Fragment key={row.id}>
                <tr
                  className={`table__body-tr table-tr${
                    isRowSelected ? " selected" : ""
                  }`}
                  onClick={() => handleRowSelect(row.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="table__body-td table-td">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
                {row.getIsExpanded() ? (
                  <tr
                    className={`workspace-navigation-table__expand table__body-tr table-tr${
                      isRowSelected ? " selected" : ""
                    }`}
                  >
                    <td
                      className="table__body-td table-td"
                      colSpan={row.getVisibleCells().length}
                    >
                      <DetailPanel
                        context={expandedContext}
                        autoSelectEnabled={
                          !disableAutoExpand && !hasPendingDetailSelection
                        }
                        schemaStatusMap={schemaStatusMap}
                      />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
