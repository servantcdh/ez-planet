import { createContext, useContext } from "react";

import type { MutationState, MutationSuccessHint } from "@/types/asyncData";
import { IDLE_MUTATION } from "@/types/asyncData";
import type {
  ApiResponse,
  BulkLabelCreateResponse,
  LabelBatchUpdateResponse,
  LabelContextCreateRequest,
  LabelContextResponse,
  LabelCopyRequest,
  LabelCopyResponse,
  LabelResponse,
  LabelStatusCreateRequest,
  LabelStatusResponse,
  ValidResultBulkDeleteRequest,
  ValidResultBulkDeleteResponse,
  ValidResultCreateRequest,
  ValidResultResponse,
  ValidResultUpdateRequest,
} from "@/types/domain";

// ─── Variable types (match existing hook interfaces) ───────────────

export interface LabelContextUpdateVariables {
  labelContextId: string;
  body: import("@/types/domain").LabelContextUpdateRequest;
}

export interface LabelBulkCreateVariables {
  labelContextId: string;
  body: import("@/types/domain").BulkLabelCreateRequest;
}

export interface LabelBatchUpdateVariables {
  labelContextId?: string | null;
  labelContextRequest?: LabelContextCreateRequest;
  labelContextUpdateRequest?: import("@/types/domain").LabelContextUpdateRequest;
  body: import("@/types/domain").LabelBatchUpdateRequest;
}

export interface FileLabelUploadVariables {
  labelContextId?: string | null;
  labelContextRequest?: LabelContextCreateRequest;
  body: import("@/types/domain").FileLabelUploadRequest;
}

export interface ValidResultUpdateVariables {
  id: string;
  body: ValidResultUpdateRequest;
}

// ─── Context value ─────────────────────────────────────────────────

export interface LabelingMutationContextValue {
  // Mutations — each is an async function the host implements
  batchUpdateLabels: (vars: LabelBatchUpdateVariables) => Promise<LabelBatchUpdateResponse>;
  batchUpdateLabelsState: MutationState;

  bulkCreateLabels: (vars: LabelBulkCreateVariables) => Promise<BulkLabelCreateResponse>;
  bulkCreateLabelsState: MutationState;

  createLabelContext: (body: LabelContextCreateRequest) => Promise<LabelContextResponse>;
  createLabelContextState: MutationState;

  updateLabelContext: (vars: LabelContextUpdateVariables) => Promise<LabelContextResponse>;
  updateLabelContextState: MutationState;

  createLabelStatus: (body: LabelStatusCreateRequest) => Promise<ApiResponse<LabelStatusResponse>>;
  createLabelStatusState: MutationState;

  uploadFileLabel: (vars: FileLabelUploadVariables) => Promise<LabelResponse>;
  uploadFileLabelState: MutationState;

  copyLabels: (body: LabelCopyRequest) => Promise<LabelCopyResponse>;
  copyLabelsState: MutationState;

  createValidResult: (body: ValidResultCreateRequest) => Promise<ValidResultResponse>;
  createValidResultState: MutationState;

  updateValidResult: (vars: ValidResultUpdateVariables) => Promise<ValidResultResponse>;
  updateValidResultState: MutationState;

  bulkDeleteValidResults: (body: ValidResultBulkDeleteRequest) => Promise<ValidResultBulkDeleteResponse>;
  bulkDeleteValidResultsState: MutationState;

  /**
   * Called by the library after a successful mutation.
   * The host should use the hint to invalidate / refetch the right caches.
   */
  onMutationSuccess: (hint: MutationSuccessHint) => void;
}

const NOOP_ASYNC = () => Promise.reject(new Error("LabelingMutationProvider not mounted"));
const NOOP = () => {};

const defaultValue: LabelingMutationContextValue = {
  batchUpdateLabels: NOOP_ASYNC as never,
  batchUpdateLabelsState: IDLE_MUTATION,
  bulkCreateLabels: NOOP_ASYNC as never,
  bulkCreateLabelsState: IDLE_MUTATION,
  createLabelContext: NOOP_ASYNC as never,
  createLabelContextState: IDLE_MUTATION,
  updateLabelContext: NOOP_ASYNC as never,
  updateLabelContextState: IDLE_MUTATION,
  createLabelStatus: NOOP_ASYNC as never,
  createLabelStatusState: IDLE_MUTATION,
  uploadFileLabel: NOOP_ASYNC as never,
  uploadFileLabelState: IDLE_MUTATION,
  copyLabels: NOOP_ASYNC as never,
  copyLabelsState: IDLE_MUTATION,
  createValidResult: NOOP_ASYNC as never,
  createValidResultState: IDLE_MUTATION,
  updateValidResult: NOOP_ASYNC as never,
  updateValidResultState: IDLE_MUTATION,
  bulkDeleteValidResults: NOOP_ASYNC as never,
  bulkDeleteValidResultsState: IDLE_MUTATION,
  onMutationSuccess: NOOP,
};

export const LabelingMutationContext =
  createContext<LabelingMutationContextValue>(defaultValue);

export function LabelingMutationProvider({
  value,
  children,
}: {
  value: LabelingMutationContextValue;
  children: React.ReactNode;
}) {
  return (
    <LabelingMutationContext.Provider value={value}>
      {children}
    </LabelingMutationContext.Provider>
  );
}

export function useLabelingMutations() {
  return useContext(LabelingMutationContext);
}
