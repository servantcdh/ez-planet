import { createContext, useContext } from "react";

import type { AsyncData } from "@/types/asyncData";
import { loadingData } from "@/types/asyncData";
import type {
  DatasetApiResponse,
  DatasetContentRecord,
  DatasetContentSearchResponse,
  DatasetDTO,
} from "@/features/dataset/types/domain";

/**
 * Dataset-related data the host feeds into the labeling workspace.
 * Separated from LabelingDataContext because it changes at a different
 * frequency (on record selection vs. on every label operation).
 */
export interface LabelingDatasetContextValue {
  datasetDetail: AsyncData<DatasetDTO>;
  datasetContents: AsyncData<DatasetApiResponse<DatasetContentSearchResponse>>;
  datasetContentDetail: AsyncData<DatasetContentRecord | null>;
}

const defaultValue: LabelingDatasetContextValue = {
  datasetDetail: loadingData(),
  datasetContents: loadingData(),
  datasetContentDetail: loadingData(),
};

export const LabelingDatasetContext =
  createContext<LabelingDatasetContextValue>(defaultValue);

export function LabelingDatasetProvider({
  value,
  children,
}: {
  value: LabelingDatasetContextValue;
  children: React.ReactNode;
}) {
  return (
    <LabelingDatasetContext.Provider value={value}>
      {children}
    </LabelingDatasetContext.Provider>
  );
}

export function useLabelingDataset() {
  return useContext(LabelingDatasetContext);
}
