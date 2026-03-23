import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  type DatasetContentVersion,
  useDatasetContents,
  useDatasetDetail,
} from "../queries";
import { useDatasetSelectionStore } from "../store/datasetSelection.store";
import { useSelectedDatasetStore } from "../store/selectedDataset.store";
import type {
  DatasetContentRecord,
  DatasetDTO,
  SchemaItemDTO,
  VersionDTO,
} from "../types/domain";

interface UseDatasetDetailPageDataOptions {
  datasetId: string;
  version?: DatasetContentVersion;
}

interface UseDatasetDetailPageDataResult {
  dataset: DatasetDTO | null;
  datasetName: string | null;
  schemaList: SchemaItemDTO[];
  versions: VersionDTO[];
  selectedVersion: string | null;
  setSelectedVersion: Dispatch<SetStateAction<string | null>>;
  contentRecords: DatasetContentRecord[];
  isDatasetLoading: boolean;
  isDatasetFetching: boolean;
  isDatasetError: boolean;
  datasetError: unknown;
  isContentsLoading: boolean;
  isContentsFetching: boolean;
  isContentsError: boolean;
  contentsError: unknown;
}

export function useDatasetDetailPageData({
  datasetId,
  version,
}: UseDatasetDetailPageDataOptions): UseDatasetDetailPageDataResult {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const selectDataset = useSelectedDatasetStore((state) => state.selectDataset);
  const clearSelection = useDatasetSelectionStore((state) => state.clearAll);

  useEffect(() => {
    if (datasetId) {
      selectDataset(datasetId);
    }
    clearSelection();
  }, [datasetId, clearSelection, selectDataset]);

  const {
    data: dataset,
    isLoading: isDatasetLoading,
    isFetching: isDatasetFetching,
    isError: isDatasetError,
    error: datasetError,
  } = useDatasetDetail(datasetId, { enabled: Boolean(datasetId) });

  const schemaList = useMemo<SchemaItemDTO[]>(
    () => dataset?.schema ?? [],
    [dataset?.schema]
  );

  const versions = useMemo<VersionDTO[]>(
    () => dataset?.versionList ?? [],
    [dataset?.versionList]
  );

  const activeVersion =
    version ?? selectedVersion ?? dataset?.currentVersion ?? null;

  const {
    data: contentsResponse,
    isLoading: isContentsLoading,
    isFetching: isContentsFetching,
    isError: isContentsError,
    error: contentsError,
  } = useDatasetContents(datasetId, activeVersion);

  const contentRecords = useMemo<DatasetContentRecord[]>(
    () => contentsResponse?.data.list ?? [],
    [contentsResponse?.data.list]
  );

  useEffect(() => {
    setSelectedVersion(null);
  }, [datasetId]);

  useEffect(() => {
    if (!dataset) {
      setSelectedVersion(null);
      return;
    }
    setSelectedVersion((prev) => {
      if (prev == null) return prev;
      const exists = versions.some((item) => item.version === prev);
      return exists ? prev : null;
    });
  }, [dataset, versions]);

  useEffect(() => {
    clearSelection();
  }, [selectedVersion, clearSelection]);

  return {
    dataset: dataset ?? null,
    datasetName: dataset?.name ?? null,
    schemaList,
    versions,
    selectedVersion,
    setSelectedVersion,
    contentRecords,
    isDatasetLoading,
    isDatasetFetching,
    isDatasetError,
    datasetError,
    isContentsLoading,
    isContentsFetching,
    isContentsError,
    contentsError,
  };
}

export default useDatasetDetailPageData;
