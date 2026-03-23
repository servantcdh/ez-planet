/**
 * Bridge hooks — read from Context providers instead of react-query.
 *
 * Parameter signatures are kept for backward-compat at call sites;
 * values are ignored because the host provides data via LabelingProviders.
 */

import { useLabelingData } from "@/providers/LabelingDataProvider";
import { useLabelingMutations } from "@/providers/LabelingMutationProvider";
import type { MutationState } from "@/types/asyncData";
import type {
  LabelContextQueryParams,
  LabelContextStatusRequest,
  LabelingApiHeaders,
  LabelSearchRequest,
  ValidResultSearchRequest,
} from "@/types/domain";
import type { PolicyApiHeaders } from "@/features/policy/types/domain";

// Re-export variable types consumed by components
export type {
  LabelContextUpdateVariables,
  LabelBulkCreateVariables,
  LabelBatchUpdateVariables,
  FileLabelUploadVariables,
  ValidResultUpdateVariables,
} from "@/providers/LabelingMutationProvider";

export interface LabelContextStatusQueryParams {
  labelContextId?: string | null;
  request?: LabelContextStatusRequest;
}

// ─── Mutation bridge helper ──────────────────────────────────────────

interface MutationCallbackOptions<R = unknown> {
  onSuccess?: (data: R) => void;
  onError?: (error: unknown) => void;
}

function bridgeMutation<V, R>(
  fn: (vars: V) => Promise<R>,
  state: MutationState,
) {
  return {
    mutate: (vars: V, opts?: MutationCallbackOptions<R>) => {
      fn(vars)
        .then((data) => opts?.onSuccess?.(data))
        .catch((error: unknown) => opts?.onError?.(error));
    },
    mutateAsync: fn,
    ...state,
  };
}

// ─── Query hooks ─────────────────────────────────────────────────────

export function useLabelingPoliciesBatch(
  _ids?: readonly string[],
  _h?: Partial<PolicyApiHeaders>,
) {
  const { policiesBatch } = useLabelingData();
  return policiesBatch;
}

export function useLabelContext(
  _params?: LabelContextQueryParams,
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { labelContext } = useLabelingData();
  return labelContext;
}

export function useLabelContextStatus(
  _params?: LabelContextStatusQueryParams,
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { labelContextStatus } = useLabelingData();
  return labelContextStatus;
}

export function useLabelContextInLabeling(
  _labelContextId?: string | null,
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { labelContextInLabeling } = useLabelingData();
  return labelContextInLabeling;
}

export function useLabelContextEnable(
  _labelContextId?: string | null,
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { labelContextEnable } = useLabelingData();
  return labelContextEnable;
}

export function useLabelSearch(
  _request?: LabelSearchRequest,
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { labelSearch } = useLabelingData();
  return labelSearch;
}

export function usePreviousLabelContextsWithLabels(
  _params?: LabelContextQueryParams,
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { previousLabelContexts } = useLabelingData();
  return previousLabelContexts;
}

export function useValidResultSearch(
  _request?: ValidResultSearchRequest,
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { validResultSearch } = useLabelingData();
  return validResultSearch;
}

// ─── Mutation hooks ──────────────────────────────────────────────────

export function useCreateLabelStatus(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { createLabelStatus, createLabelStatusState } = useLabelingMutations();
  return bridgeMutation(createLabelStatus, createLabelStatusState);
}

export function useCreateLabelContext(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { createLabelContext, createLabelContextState } = useLabelingMutations();
  return bridgeMutation(createLabelContext, createLabelContextState);
}

export function useUpdateLabelContext(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { updateLabelContext, updateLabelContextState } = useLabelingMutations();
  return bridgeMutation(updateLabelContext, updateLabelContextState);
}

export function useBulkCreateLabels(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { bulkCreateLabels, bulkCreateLabelsState } = useLabelingMutations();
  return bridgeMutation(bulkCreateLabels, bulkCreateLabelsState);
}

export function useBatchUpdateLabelsMutation(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { batchUpdateLabels, batchUpdateLabelsState } = useLabelingMutations();
  return bridgeMutation(batchUpdateLabels, batchUpdateLabelsState);
}

export function useUploadFileLabelMutation(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { uploadFileLabel, uploadFileLabelState } = useLabelingMutations();
  return bridgeMutation(uploadFileLabel, uploadFileLabelState);
}

export function useCopyLabels(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { copyLabels, copyLabelsState } = useLabelingMutations();
  return bridgeMutation(copyLabels, copyLabelsState);
}

export function useCreateValidResult(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { createValidResult, createValidResultState } = useLabelingMutations();
  return bridgeMutation(createValidResult, createValidResultState);
}

export function useUpdateValidResult(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { updateValidResult, updateValidResultState } = useLabelingMutations();
  return bridgeMutation(updateValidResult, updateValidResultState);
}

export function useBulkDeleteValidResults(
  _headers?: Partial<LabelingApiHeaders>,
) {
  const { bulkDeleteValidResults, bulkDeleteValidResultsState } =
    useLabelingMutations();
  return bridgeMutation(bulkDeleteValidResults, bulkDeleteValidResultsState);
}
