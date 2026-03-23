import type { DatasetContentRecord, SchemaItemDTO } from "../types/domain";

function getCandidateKeys(schema: SchemaItemDTO): string[] {
  const {
    baseInfo: { schemaId, schemaName },
  } = schema;
  return [schemaId, schemaName].filter((key): key is string => Boolean(key));
}

export function extractSchemaEntries(
  record: DatasetContentRecord,
  schema: SchemaItemDTO
): unknown[] {
  const contents = record.contents ?? {};
  const candidateKeys = getCandidateKeys(schema);
  for (const key of candidateKeys) {
    if (key in contents) {
      const value = contents[key];
      if (Array.isArray(value)) return value;
      return value != null ? [value] : [];
    }
  }
  return [];
}

export function getSchemaSummaryCount(
  record: DatasetContentRecord,
  schema: SchemaItemDTO
): number | null {
  const summary = record.summary ?? {};
  const candidateKeys = getCandidateKeys(schema);
  for (const key of candidateKeys) {
    if (key in summary) {
      const value = summary[key];
      if (typeof value === "number") return value;
      if (typeof value === "string") {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) return parsed;
      }
    }
  }
  const fallbackEntries = extractSchemaEntries(record, schema);
  if (fallbackEntries.length > 0) return fallbackEntries.length;
  return null;
}

export function resolveRecordRowId(
  record: DatasetContentRecord,
  fallback: string
): string {
  const recordWithContentSet = record as {
    contentSetId?: string;
    contentSetsId?: string;
  };
  const primary = recordWithContentSet.contentSetId;
  if (typeof primary === "string" && primary.trim().length > 0) {
    return primary.trim();
  }
  if (
    typeof recordWithContentSet.contentSetsId === "string" &&
    recordWithContentSet.contentSetsId.trim().length > 0
  ) {
    return recordWithContentSet.contentSetsId.trim();
  }
  if (typeof record.id === "string" && record.id.length > 0) {
    return record.id;
  }
  return fallback;
}
