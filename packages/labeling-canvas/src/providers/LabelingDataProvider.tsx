import { createContext, useContext } from "react";

import type { AsyncData } from "@/types/asyncData";
import { loadingData } from "@/types/asyncData";
import type {
  ContentsetStatusResponse,
  InLabelingStatusResponse,
  LabelContextEnableResponse,
  LabelContextResponse,
  LabelSearchResult,
  PreviousLabelContextWithLabelsResponse,
  ValidResultSearchResult,
} from "@/types/domain";
import type { PolicyDetail } from "@/features/policy/types/domain";

/**
 * Data that the host feeds into the labeling workspace.
 * Each field mirrors one of the former react-query hooks.
 */
export interface LabelingDataContextValue {
  policiesBatch: AsyncData<PolicyDetail[]>;
  labelContext: AsyncData<LabelContextResponse>;
  labelContextStatus: AsyncData<ContentsetStatusResponse>;
  labelContextInLabeling: AsyncData<InLabelingStatusResponse>;
  labelContextEnable: AsyncData<LabelContextEnableResponse>;
  labelSearch: AsyncData<LabelSearchResult>;
  previousLabelContexts: AsyncData<PreviousLabelContextWithLabelsResponse[]>;
  validResultSearch: AsyncData<ValidResultSearchResult>;
}

const defaultValue: LabelingDataContextValue = {
  policiesBatch: loadingData(),
  labelContext: loadingData(),
  labelContextStatus: loadingData(),
  labelContextInLabeling: loadingData(),
  labelContextEnable: loadingData(),
  labelSearch: loadingData(),
  previousLabelContexts: loadingData(),
  validResultSearch: loadingData(),
};

export const LabelingDataContext =
  createContext<LabelingDataContextValue>(defaultValue);

export function LabelingDataProvider({
  value,
  children,
}: {
  value: LabelingDataContextValue;
  children: React.ReactNode;
}) {
  return (
    <LabelingDataContext.Provider value={value}>
      {children}
    </LabelingDataContext.Provider>
  );
}

export function useLabelingData() {
  return useContext(LabelingDataContext);
}
