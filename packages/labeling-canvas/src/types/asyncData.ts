/**
 * AsyncData<T> — a lightweight wrapper that mirrors the surface of
 * react-query's UseQueryResult so that consumer components need zero
 * changes when we swap the data source from react-query to host-provided
 * context.
 */
export interface AsyncData<T> {
  data: T | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
  dataUpdatedAt: number;
}

/**
 * Mutation state — tracks the status of a single mutation call.
 */
export interface MutationState {
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

/**
 * Hint the library sends to the host after a successful mutation so
 * the host can invalidate / refetch the appropriate caches.
 */
export type MutationSuccessHint =
  | { type: "labels-saved"; labelContextId: string | null }
  | { type: "labels-copied" }
  | { type: "labels-bulk-created"; labelContextId: string }
  | { type: "label-context-created"; labelContextId: string }
  | { type: "label-context-updated"; labelContextId: string }
  | { type: "label-status-created" }
  | { type: "valid-result-created" }
  | { type: "valid-result-updated" }
  | { type: "valid-results-deleted" }
  | { type: "file-uploaded"; labelContextId: string };

// ─── Helpers ───────────────────────────────────────────────────────

const NOOP = () => {};

/** Wrap an already-resolved value as AsyncData (no loading, no error). */
export function staticData<T>(data: T): AsyncData<T> {
  return {
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: NOOP,
    dataUpdatedAt: Date.now(),
  };
}

/** A loading-state placeholder. */
export function loadingData<T>(): AsyncData<T> {
  return {
    data: undefined,
    isLoading: true,
    isFetching: true,
    isError: false,
    error: null,
    refetch: NOOP,
    dataUpdatedAt: 0,
  };
}

/** An error-state placeholder. */
export function errorData<T>(error: unknown): AsyncData<T> {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: true,
    error,
    refetch: NOOP,
    dataUpdatedAt: 0,
  };
}

/** Idle mutation state (not pending, no error). */
export const IDLE_MUTATION: MutationState = {
  isPending: false,
  isError: false,
  error: null,
};
