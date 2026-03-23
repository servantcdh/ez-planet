import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Button, Icon, LabeledField } from "@/components";
import FloatingCard from "@/components/molecules/FloatingCard";
import {
  VIRTUALIZED_RECORDS_ROW_META_SYMBOL,
  type VirtualizedRecordsTableSelection,
} from "@/components/organisms/VirtualizedRecordsTable";
import { useDatasetContentDetail } from "@/features/dataset/queries";
import type {
  DatasetContentDetailParams,
  DatasetContentRecord,
} from "@/features/dataset/types/domain";
import { getContentTypeMeta } from "@/lib/ui/contentType";

import { useLabelContextStatusMap } from "../hooks/useLabelContextStatusMap";
import { useLabelingRecordSelectionStore } from "../store/labelingRecordSelection.store";
import type { LabelingDatasetCellReference } from "../types/recordSelection";
import LabelingRecordsTable, {
  LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL,
  type LabelingRecordsCellAccessories,
  type LabelingRecordsTableRow,
} from "./LabelingRecordsTable";

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

function formatDetailCellValue(value: unknown): string | number {
  if (typeof value === "number" || typeof value === "string") {
    return value;
  }
  if (value == null) {
    return "";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function mapDetailValuesToRows(
  values: unknown[],
  baseAccessory?: LabelingRecordsCellAccessories | null,
  labeledElementIds?: ReadonlySet<string> | null,
  issueElementIds?: ReadonlySet<string> | null,
  validatedElementIds?: ReadonlySet<string> | null
): LabelingRecordsTableRow[] {
  return values.map((entry, index) => {
    const row: LabelingRecordsTableRow = {};
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      Object.entries(entry as Record<string, unknown>).forEach(
        ([key, value]) => {
          row[key] = formatDetailCellValue(value);
        }
      );
    } else {
      row.value = formatDetailCellValue(entry);
    }

    row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] = {
      columnRefs: {},
      rowRef: entry,
      rowId: `detail-${index}`,
    };
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
            ...(isValidationCompleted
              ? { hasValidationCompleted: true }
              : {}),
          }
        : null;
    const rowAccessory = mergeAccessories(baseAccessory, elementAccessory);
    if (rowAccessory) {
      row[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] = {
        __rownum: rowAccessory,
      };
    }
    return row;
  });
}

function buildDetailRows(
  detailRecord: DatasetContentRecord | null,
  reference: LabelingDatasetCellReference | undefined,
  accessory?: LabelingRecordsCellAccessories | null,
  labeledElementIds?: ReadonlySet<string> | null,
  issueElementIds?: ReadonlySet<string> | null,
  validatedElementIds?: ReadonlySet<string> | null
): LabelingRecordsTableRow[] {
  if (!detailRecord || !reference) {
    return [];
  }

  const contents = (detailRecord.contents ?? {}) as Record<string, unknown>;
  const targetKey =
    reference.schemaNames.find((name) =>
      Object.prototype.hasOwnProperty.call(contents, name)
    ) ?? reference.schemaNames[0];

  if (!targetKey) {
    return [];
  }

  const rawValue = contents[targetKey];
  const values = normalizeDetailValues(rawValue);
  const isTableType =
    (reference.contentType ?? "").toUpperCase() === "TABLE";
  const baseAccessory = isTableType
    ? null
    : labeledElementIds
      ? null
      : accessory ?? null;
  return mapDetailValuesToRows(
    values,
    baseAccessory,
    labeledElementIds,
    issueElementIds,
    validatedElementIds
  );
}

function formatContentTypeLabel(contentType?: string): string {
  if (!contentType) {
    return "";
  }
  const lower = contentType.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export default function LabelingRecordSelectionCard() {
  const selection = useLabelingRecordSelectionStore((state) => state.selection);
  const setSelection = useLabelingRecordSelectionStore(
    (state) => state.setSelection
  );
  const [isMounted, setIsMounted] = useState(false);
  const accessories =
    selection?.displayRow?.[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] ??
    selection?.accessories;
  const schemaAccessoryKey =
    selection?.detailReference?.schemaLabel ??
    selection?.detailReference?.schemaNames?.[0] ??
    null;
  const schemaAccessory =
    schemaAccessoryKey && accessories
      ? accessories[schemaAccessoryKey]
      : undefined;

  const { schemaStatusMap } = useLabelContextStatusMap({
    datasetId: selection?.detailReference?.datasetId,
    datasetVersion: selection?.detailReference?.version,
  });

  const detailParams = useMemo<DatasetContentDetailParams | null>(() => {
    const reference = selection?.detailReference;
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
  }, [selection?.detailReference]);

  const labeledElementIds = useMemo(() => {
    if (
      !detailParams?.contentSetId ||
      !selection?.detailReference
    ) {
      return null;
    }
    const schemaMap = schemaStatusMap.get(detailParams.contentSetId);
    if (!schemaMap) {
      return null;
    }
    const schemaNames = (selection.detailReference.schemaNames ?? []).filter(
      (name) => typeof name === "string" && name.length > 0
    );
    if (!schemaNames.length && selection.detailReference.schemaLabel) {
      schemaNames.push(selection.detailReference.schemaLabel);
    }
    if (!schemaNames.length) {
      return null;
    }
    const ids = new Set<string>();
    schemaNames.forEach((name) => {
      const status = schemaMap.get(name);
      status?.elements?.forEach((element) => {
        const elementId = element.elementId;
        if (typeof elementId === "string" && elementId.length > 0) {
          ids.add(elementId);
        }
      });
    });
    return ids.size > 0 ? ids : null;
  }, [
    detailParams?.contentSetId,
    schemaStatusMap,
    selection?.detailReference,
  ]);
  const issueElementIds = useMemo(() => {
    if (
      !detailParams?.contentSetId ||
      !selection?.detailReference
    ) {
      return null;
    }
    const schemaMap = schemaStatusMap.get(detailParams.contentSetId);
    if (!schemaMap) {
      return null;
    }
    const schemaNames = (selection.detailReference.schemaNames ?? []).filter(
      (name) => typeof name === "string" && name.length > 0
    );
    if (!schemaNames.length && selection.detailReference.schemaLabel) {
      schemaNames.push(selection.detailReference.schemaLabel);
    }
    if (!schemaNames.length) {
      return null;
    }
    const ids = new Set<string>();
    schemaNames.forEach((name) => {
      const status = schemaMap.get(name);
      status?.elements?.forEach((element) => {
        if (!(element.elementStatus ?? []).includes("VALIDATION_ERROR")) {
          return;
        }
        const elementId = element.elementId;
        if (typeof elementId === "string" && elementId.length > 0) {
          ids.add(elementId);
        }
      });
    });
    return ids.size > 0 ? ids : null;
  }, [
    detailParams?.contentSetId,
    schemaStatusMap,
    selection?.detailReference,
  ]);
  const validatedElementIds = useMemo(() => {
    if (
      !detailParams?.contentSetId ||
      !selection?.detailReference
    ) {
      return null;
    }
    const schemaMap = schemaStatusMap.get(detailParams.contentSetId);
    if (!schemaMap) {
      return null;
    }
    const schemaNames = (selection.detailReference.schemaNames ?? []).filter(
      (name) => typeof name === "string" && name.length > 0
    );
    if (!schemaNames.length && selection.detailReference.schemaLabel) {
      schemaNames.push(selection.detailReference.schemaLabel);
    }
    if (!schemaNames.length) {
      return null;
    }
    const ids = new Set<string>();
    schemaNames.forEach((name) => {
      const status = schemaMap.get(name);
      status?.elements?.forEach((element) => {
        if ((element.elementStatus ?? []).includes("VALIDATION_COMPLETED")) {
          const elementId = element.elementId;
          if (typeof elementId === "string" && elementId.length > 0) {
            ids.add(elementId);
          }
        }
      });
    });
    return ids.size > 0 ? ids : null;
  }, [
    detailParams?.contentSetId,
    schemaStatusMap,
    selection?.detailReference,
  ]);

  const {
    data: detailRecord,
    isLoading,
    isError,
    error,
  } = useDatasetContentDetail(detailParams);

  useEffect(() => {
    if (selection) {
      const timer = setTimeout(() => setIsMounted(true), 0);
      return () => {
        clearTimeout(timer);
        setIsMounted(false);
      };
    }
    setIsMounted(false);
    return undefined;
  }, [selection]);

  const rows = useMemo(
    () =>
      buildDetailRows(
        detailRecord ?? null,
        selection?.detailReference,
        schemaAccessory,
        labeledElementIds,
        issueElementIds,
        validatedElementIds
      ),
    [
      detailRecord,
      labeledElementIds,
      issueElementIds,
      schemaAccessory,
      selection?.detailReference,
      validatedElementIds,
    ]
  );

  const tableSelection = useMemo<VirtualizedRecordsTableSelection>(
    () => ({
      modes: [],
      selectedItems: [],
      setSelectedItems: (_items: string[]) => {},
    }),
    []
  );

  const handleClose = () => {
    setSelection(null);
  };

  if (!selection || !isMounted) {
    return null;
  }

  let bodyContent: ReactNode;
  if (!selection.detailReference) {
    bodyContent = <p>Select a record to view detail.</p>;
  } else if (isLoading) {
    bodyContent = <p>Loading detail…</p>;
  } else if (isError) {
    const message = error instanceof Error ? error.message : "Unknown error";
    bodyContent = <p>Failed to load detail: {message}</p>;
  } else if (!rows.length) {
    bodyContent = <p>No detail available for this record.</p>;
  } else {
    bodyContent = (
      <LabelingRecordsTable rows={rows} selection={tableSelection} />
    );
  }

  const contentTypeLabel = formatContentTypeLabel(
    selection.detailReference?.contentType
  );
  const maxItems = selection.detailReference?.maxItems;
  const maxItemsLabel =
    typeof maxItems === "number"
      ? maxItems.toLocaleString()
      : (maxItems ?? "No limit");

  const recordLabel =
    selection.rowIndex != null ? `Record ${selection.rowIndex + 1}` : null;
  const schemaLabel = selection.detailReference?.schemaLabel ?? "Record detail";
  const { iconType: detailIconType } = getContentTypeMeta(
    selection.detailReference?.contentType
  );

  return (
    <FloatingCard
      service="management"
      focusZone="labeling-content"
      focusId="labeling-record-selection-card"
      focusTakeOverOnMount
      bottom="5rem"
    >
      <div className="floating-card__title">
        <div className="title">
          <p>{recordLabel ? `${recordLabel} : ${schemaLabel}` : schemaLabel}</p>
          {detailIconType ? <Icon iconType={detailIconType} /> : null}
          {contentTypeLabel ? (
            <span className="type">{contentTypeLabel}</span>
          ) : null}
        </div>
        <div className="util">
          {selection.detailReference?.isRequired ? (
            <LabeledField label="Required" />
          ) : null}
          <LabeledField label="Size">{maxItemsLabel}</LabeledField>
          <Button style="transparent" size="sm" onClick={handleClose}>
            <Icon iconType="icon-cancel" size="xs" />
          </Button>
        </div>
      </div>
      <div className="floating-card__content">{bodyContent}</div>
    </FloatingCard>
  );
}
