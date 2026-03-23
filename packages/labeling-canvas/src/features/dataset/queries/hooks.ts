/**
 * Bridge hooks — read from Context providers instead of react-query.
 *
 * Parameter signatures are kept for backward-compat at call sites;
 * values are ignored because the host provides data via LabelingProviders.
 */

import { useLabelingDataset } from "@/providers/LabelingDatasetProvider";
import type { DatasetContentDetailParams } from "../types/domain";

export type DatasetContentVersion = string | null | undefined;

interface UseDatasetDetailOptions {
  enabled?: boolean;
}

interface UseDatasetContentDetailOptions {
  enabled?: boolean;
}

export function useDatasetDetail(
  _datasetId?: string,
  _options?: UseDatasetDetailOptions,
) {
  const { datasetDetail } = useLabelingDataset();
  return datasetDetail;
}

export function useDatasetContents(
  _datasetId?: string,
  _version?: DatasetContentVersion,
  _options?: { pageNumber?: number; pageSize?: number },
) {
  const { datasetContents } = useLabelingDataset();
  return datasetContents;
}

export function useDatasetContentDetail(
  _params?: DatasetContentDetailParams | null,
  _options?: UseDatasetContentDetailOptions,
) {
  const { datasetContentDetail } = useLabelingDataset();
  return datasetContentDetail;
}
