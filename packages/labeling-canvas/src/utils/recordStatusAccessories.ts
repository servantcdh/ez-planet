import {
  VIRTUALIZED_RECORDS_ROW_META_SYMBOL,
  type VirtualizedRowMeta,
} from "@/components/organisms/VirtualizedRecordsTable";
import type { DatasetContentRecord } from "@/features/dataset/types/domain";

import {
  LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL,
  type LabelingRecordsCellAccessories,
  type LabelingRecordsCellAccessoriesMap,
  type LabelingRecordsCellBadge,
  type LabelingRecordsTableRow,
} from "../components/LabelingRecordsTable";
import type {
  ContentsetStatus,
  ContentsetStatusState,
  SchemaStatus,
} from "../types/domain";
import type { LabelingSchemaEntry } from "../types/recordSelection";

const LABELED_BADGE: LabelingRecordsCellBadge = {
  title: "Labeled",
  style: "primary-light",
};

function resolveRowContentSetId(row: LabelingRecordsTableRow): string | null {
  const meta = row[VIRTUALIZED_RECORDS_ROW_META_SYMBOL] as
    | VirtualizedRowMeta
    | undefined;
  const rowRef = meta?.rowRef as
    | (DatasetContentRecord & { contentsetId?: string })
    | undefined;
  return (
    rowRef?.contentSetId ??
    rowRef?.contentsetId ??
    (typeof rowRef?.id === "string" ? rowRef.id : null)
  );
}

function createStatusAccessory(
  status: ContentsetStatusState
): LabelingRecordsCellAccessories | null {
  switch (status) {
    case "IN_LABELING":
      return {
        badges: [{ title: "in Progress", style: "secondary-light" }],
      };
    case "COMPLETED":
    case "VALIDATION_COMPLETED":
      return {
        badges: [LABELED_BADGE],
      };
    case "VALIDATION_ERROR":
      return {
        hasIssue: true,
      };
    default:
      return null;
  }
}

function mergeAccessories(
  base: LabelingRecordsCellAccessories | undefined,
  incoming: LabelingRecordsCellAccessories
): LabelingRecordsCellAccessories {
  return {
    badges: [...(base?.badges ?? []), ...(incoming.badges ?? [])],
    hasIssue: incoming.hasIssue || base?.hasIssue,
    hasValidationCompleted:
      incoming.hasValidationCompleted || base?.hasValidationCompleted,
  };
}

function resolveSchemaSummaryTotal(
  schemaSummaryMap: ReadonlyMap<string, number> | undefined,
  schemaNames: string[]
): number | undefined {
  if (!schemaSummaryMap) {
    return undefined;
  }
  for (const schemaName of schemaNames) {
    const total = schemaSummaryMap.get(schemaName);
    if (typeof total === "number") {
      return total;
    }
  }
  return undefined;
}

function resolveSchemaAccessory(
  entry: LabelingSchemaEntry,
  schemaStatus: SchemaStatus,
  schemaNames: string[],
  schemaSummaryMap: ReadonlyMap<string, number> | undefined
): LabelingRecordsCellAccessories | null {
  const elements = schemaStatus.elements ?? [];
  const hasValidationCompleted = elements.some((element) =>
    (element.elementStatus ?? []).includes("VALIDATION_COMPLETED")
  );
  const schemaSummaryTotal = resolveSchemaSummaryTotal(
    schemaSummaryMap,
    schemaNames
  );

  let derivedStatus: "IN_LABELING" | "COMPLETED" | null = null;
  let hasValidationError = false;

  if (schemaSummaryTotal !== undefined) {
    const labeledCount =
      typeof schemaStatus.totalCount === "number" ? schemaStatus.totalCount : 0;

    let policyStatusCount = 0;
    let areAllPolicyStatusesCompleted = true;

    elements.forEach((element) => {
      const elementStatuses = element.elementStatus ?? [];
      if (elementStatuses.includes("VALIDATION_ERROR")) {
        hasValidationError = true;
      }
      (element.policyStatuses ?? []).forEach((policyStatus) => {
        policyStatusCount += 1;
        const statuses = policyStatus.status ?? [];
        const hasCompletedState = statuses.some(
          (status) =>
            status === "COMPLETED" || status === "VALIDATION_COMPLETED"
        );
        if (!hasCompletedState) {
          areAllPolicyStatusesCompleted = false;
        }
        if (
          policyStatus.hasValidationError === true ||
          statuses.includes("VALIDATION_ERROR")
        ) {
          hasValidationError = true;
        }
      });
    });

    if (schemaSummaryTotal > 0 && labeledCount >= schemaSummaryTotal) {
      derivedStatus = "COMPLETED";
    } else if (labeledCount > 0 && labeledCount < schemaSummaryTotal) {
      derivedStatus = "IN_LABELING";
    } else if (policyStatusCount > 0 && areAllPolicyStatusesCompleted) {
      derivedStatus = "COMPLETED";
    }
  }

  if (!derivedStatus && !hasValidationError && !hasValidationCompleted) {
    return null;
  }

  const isTableSchema = (entry.contentType ?? "").toUpperCase() === "TABLE";
  const badgeStatus =
    isTableSchema && derivedStatus === "IN_LABELING"
      ? "COMPLETED"
      : derivedStatus;
  const baseAccessory = badgeStatus ? createStatusAccessory(badgeStatus) : null;
  const hasBadges = Boolean(baseAccessory?.badges?.length);
  if (!hasBadges && !hasValidationError && !hasValidationCompleted) {
    return null;
  }

  return {
    badges: baseAccessory?.badges,
    hasIssue: hasValidationError || undefined,
    hasValidationCompleted: hasValidationCompleted || undefined,
  };
}

function buildContentSetStatuses(status?: ContentsetStatus): ContentsetStatusState[] {
  const fromArray = status?.contentSetStatus ?? [];
  const legacy = status?.contentsetStatus;
  const legacyNormalized =
    legacy && legacy !== "NONE" ? [legacy as ContentsetStatusState] : [];
  return [...fromArray, ...legacyNormalized];
}

function buildContentSetAccessory(
  status: ContentsetStatus | undefined
): LabelingRecordsCellAccessories | null {
  const contentSetStatuses = buildContentSetStatuses(status);
  const hasContentSetLabel =
    typeof status?.totalCount === "number"
      ? status.totalCount > 0
      : contentSetStatuses.some(
          (item) =>
            item === "IN_LABELING" ||
            item === "COMPLETED" ||
            item === "VALIDATION_COMPLETED"
        );
  const hasContentSetIssue = contentSetStatuses.some(
    (item) => item === "VALIDATION_ERROR"
  );

  if (!hasContentSetLabel && !hasContentSetIssue) {
    return null;
  }

  return {
    badges: hasContentSetLabel ? [LABELED_BADGE] : undefined,
    hasIssue: hasContentSetIssue || undefined,
  };
}

interface ApplyLabelingRecordStatusAccessoriesParams {
  rows: LabelingRecordsTableRow[];
  schemaEntries: LabelingSchemaEntry[];
  contentSetStatusMap: ReadonlyMap<string, ContentsetStatus>;
  schemaStatusMap: ReadonlyMap<string, ReadonlyMap<string, SchemaStatus>>;
  schemaSummaryCountMap: ReadonlyMap<string, ReadonlyMap<string, number>>;
}

export function buildSchemaSummaryCountMap(
  records: DatasetContentRecord[]
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  records.forEach((record) => {
    const contentSetId =
      (record as { contentsetId?: string }).contentsetId ??
      record.contentSetId ??
      (typeof record.id === "string" ? record.id : undefined);
    if (!contentSetId) {
      return;
    }

    const schemaMap =
      map.get(contentSetId) ??
      (() => {
        const created = new Map<string, number>();
        map.set(contentSetId, created);
        return created;
      })();
    Object.entries(record.summary ?? {}).forEach(([key, value]) => {
      if (typeof value === "number") {
        schemaMap.set(key, value);
      }
    });
  });
  return map;
}

export function applyLabelingRecordStatusAccessories({
  rows,
  schemaEntries,
  contentSetStatusMap,
  schemaStatusMap,
  schemaSummaryCountMap,
}: ApplyLabelingRecordStatusAccessoriesParams): LabelingRecordsTableRow[] {
  if (!rows.length || !schemaEntries.length) {
    return rows;
  }

  const labelToSchemaNames = new Map<string, string[]>();
  schemaEntries.forEach((entry) => {
    labelToSchemaNames.set(entry.label, entry.detailSchemaNames ?? [entry.label]);
  });

  const rowContentSetIds = new Set<string>();
  rows.forEach((row) => {
    const contentSetId = resolveRowContentSetId(row);
    if (contentSetId) {
      rowContentSetIds.add(contentSetId);
    }
  });

  const contentSetAccessoryMap = new Map<
    string,
    LabelingRecordsCellAccessories | null
  >();
  const contentSetSchemaAccessoryMap = new Map<
    string,
    Map<string, LabelingRecordsCellAccessories>
  >();

  rowContentSetIds.forEach((contentSetId) => {
    contentSetAccessoryMap.set(
      contentSetId,
      buildContentSetAccessory(contentSetStatusMap.get(contentSetId))
    );

    const schemaMapForContentSet = schemaStatusMap.get(contentSetId);
    if (!schemaMapForContentSet) {
      return;
    }

    const summaryMap = schemaSummaryCountMap.get(contentSetId);
    const schemaAccessoryMap = new Map<string, LabelingRecordsCellAccessories>();
    schemaEntries.forEach((entry) => {
      const schemaNames = labelToSchemaNames.get(entry.label) ?? [entry.label];

      let schemaStatus: SchemaStatus | undefined;
      for (const schemaName of schemaNames) {
        const found = schemaMapForContentSet.get(schemaName);
        if (found) {
          schemaStatus = found;
          break;
        }
      }
      if (!schemaStatus) {
        return;
      }

      const accessory = resolveSchemaAccessory(
        entry,
        schemaStatus,
        schemaNames,
        summaryMap
      );
      if (accessory) {
        schemaAccessoryMap.set(entry.label, accessory);
      }
    });

    if (schemaAccessoryMap.size > 0) {
      contentSetSchemaAccessoryMap.set(contentSetId, schemaAccessoryMap);
    }
  });

  return rows.map((row) => {
    const contentSetId = resolveRowContentSetId(row);
    if (!contentSetId) {
      return row;
    }

    const rowAccessory = contentSetAccessoryMap.get(contentSetId);
    const schemaAccessoryMap = contentSetSchemaAccessoryMap.get(contentSetId);
    if (!rowAccessory && !schemaAccessoryMap) {
      return row;
    }

    const existingAccessories =
      row[LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL] ?? {};
    const updatedAccessories: LabelingRecordsCellAccessoriesMap = {
      ...existingAccessories,
    };

    if (rowAccessory) {
      updatedAccessories.__rownum = mergeAccessories(
        updatedAccessories.__rownum,
        rowAccessory
      );
    }

    schemaAccessoryMap?.forEach((accessory, label) => {
      updatedAccessories[label] = mergeAccessories(
        updatedAccessories[label],
        accessory
      );
    });

    if (Object.keys(updatedAccessories).length === 0) {
      return row;
    }

    return {
      ...row,
      [LABELING_RECORDS_CELL_ACCESSORIES_SYMBOL]: updatedAccessories,
    };
  });
}
