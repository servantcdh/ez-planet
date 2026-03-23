import { useMemo } from "react";

import type { DatasetContentVersion } from "@/features/dataset/queries";
import {
  useLabelContext,
  useLabelContextStatus,
} from "@/queries";

import type { ContentsetStatus, SchemaStatus } from "../types/domain";

interface UseLabelContextStatusMapOptions {
  datasetId?: string | null;
  datasetVersion?: DatasetContentVersion | null;
}

export function useLabelContextStatusMap({
  datasetId,
  datasetVersion,
}: UseLabelContextStatusMapOptions) {
  const normalizedDatasetId = datasetId?.trim() ?? "";
  const normalizedVersion =
    datasetVersion !== undefined && datasetVersion !== null
      ? datasetVersion
      : null;

  const shouldFetchContext =
    normalizedDatasetId.length > 0 && normalizedVersion !== null;

  const labelContextQuery = useLabelContext(
    shouldFetchContext
      ? {
          datasetId: normalizedDatasetId,
          datasetVersion: normalizedVersion,
        }
      : undefined
  );

  const labelContextId = labelContextQuery.data?.id;

  const labelContextStatusQuery = useLabelContextStatus(
    labelContextId
      ? {
          labelContextId,
        }
      : undefined
  );

  const statusUpdatedAt = labelContextStatusQuery.dataUpdatedAt;

  const contentSetStatusMap = useMemo(() => {
    const map = new Map<string, ContentsetStatus>();
    const contentSets =
      labelContextStatusQuery.data?.contentSets ??
      (labelContextStatusQuery.data as { contentsets?: ContentsetStatus[] })
        ?.contentsets ??
      [];
    contentSets.forEach((item) => {
      const legacy = (item as { contentsetId?: string }).contentsetId;
      const resolvedContentSetId = item.contentSetId ?? legacy ?? null;
      if (resolvedContentSetId) {
        map.set(resolvedContentSetId, item);
      }
    });
    return map;
  }, [labelContextStatusQuery.data, statusUpdatedAt]);

  const schemaStatusMap = useMemo(() => {
    const map = new Map<string, Map<string, SchemaStatus>>();
    const contentSets =
      labelContextStatusQuery.data?.contentSets ??
      (labelContextStatusQuery.data as { contentsets?: ContentsetStatus[] })
        ?.contentsets ??
      [];
    contentSets.forEach((contentset) => {
      const contentSetId =
        contentset.contentSetId ??
        (contentset as { contentsetId?: string }).contentsetId;
      if (!contentSetId) return;

      const schemaMap = new Map<string, SchemaStatus>();
      contentset.schemas?.forEach((schema) => {
        if (!schema?.name) return;
        schemaMap.set(schema.name, schema);
      });
      map.set(contentSetId, schemaMap);
    });
    return map;
  }, [labelContextStatusQuery.data, statusUpdatedAt]);

  return {
    labelContext: labelContextQuery.data,
    labelContextStatus: labelContextStatusQuery.data,
    contentSetStatusMap,
    schemaStatusMap,
    isLoading:
      labelContextQuery.isLoading || labelContextStatusQuery.isLoading,
    isFetching:
      labelContextQuery.isFetching || labelContextStatusQuery.isFetching,
    refetch: labelContextStatusQuery.refetch,
  };
}
