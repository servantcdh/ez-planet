import {
  LabelingDataProvider,
  type LabelingDataContextValue,
} from "./LabelingDataProvider";
import {
  LabelingMutationProvider,
  type LabelingMutationContextValue,
} from "./LabelingMutationProvider";
import {
  LabelingDatasetProvider,
  type LabelingDatasetContextValue,
} from "./LabelingDatasetProvider";

export interface LabelingProvidersProps {
  data: LabelingDataContextValue;
  mutations: LabelingMutationContextValue;
  dataset: LabelingDatasetContextValue;
  children: React.ReactNode;
}

/**
 * Composite provider that wraps the three labeling contexts.
 *
 * Usage (host app):
 * ```tsx
 * <LabelingProviders data={dataCtx} mutations={mutationCtx} dataset={datasetCtx}>
 *   <LabelingWorkspace />
 * </LabelingProviders>
 * ```
 */
export function LabelingProviders({
  data,
  mutations,
  dataset,
  children,
}: LabelingProvidersProps) {
  return (
    <LabelingDataProvider value={data}>
      <LabelingMutationProvider value={mutations}>
        <LabelingDatasetProvider value={dataset}>
          {children}
        </LabelingDatasetProvider>
      </LabelingMutationProvider>
    </LabelingDataProvider>
  );
}
