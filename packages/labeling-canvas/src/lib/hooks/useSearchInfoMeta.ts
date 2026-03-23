import { useCallback } from "react";
import { create } from "zustand";

import type {
  SearchOperatorValue,
  SearchRequest,
} from "@/features/content-group/queries";
import type { FilterFieldMeta, SearchInfoField } from "@/types/search";

interface UseSearchInfoMetaOptions {
  service: string | undefined;
  baseUrl: string;
  scope: string;
  staleTime?: number;
  getQueryKey?: (service: string | undefined) => readonly unknown[];
  fetcher?: (service: string) => Promise<SearchInfoField[]>;
}

/**
 * Stub useSearchInfoMeta hook.
 * Returns empty filter meta. The host app should provide a real implementation.
 */
export function useSearchInfoMeta(_options: UseSearchInfoMetaOptions) {
  return {
    data: [] as FilterFieldMeta[],
    isLoading: false,
    isError: false,
    error: null,
  };
}

/* ------------------------------------------------------------------ */
/*  Configurable filter store (replaces hardcoded empty filter)       */
/* ------------------------------------------------------------------ */

interface FilterState {
  filter: Record<string, unknown>;
  setFilter: (patch: Record<string, unknown>) => void;
  resetFilter: () => void;
}

const DEFAULT_FILTER: Record<string, unknown> = {
  pageNumber: 1,
  pageSize: 14,
  policyIds: { operator: "IN", value: [] },
  datasetId: { operator: "EQ", value: "" },
  datasetVersion: { operator: "EQ", value: "" },
};

export const useFilterStore = create<FilterState>((set) => ({
  filter: { ...DEFAULT_FILTER },
  setFilter: (patch) =>
    set((state) => ({ filter: { ...state.filter, ...patch } })),
  resetFilter: () => set({ filter: { ...DEFAULT_FILTER } }),
}));

/**
 * Configurable filter hook backed by Zustand store.
 * Use `useFilterStore.getState().setFilter(...)` to configure from outside.
 */
export function useFilterBySearchParams(_defaultPageSize?: number) {
  const filter = useFilterStore((s) => s.filter);
  const storeSetFilter = useFilterStore((s) => s.setFilter);
  const resetFilter = useFilterStore((s) => s.resetFilter);

  const setFilter = useCallback(
    (
      nextFilter: Record<
        string,
        SearchOperatorValue | SearchRequest["orderBy"] | number
      >,
      _pathnameOrOptions?:
        | string
        | { pathname?: string; replace?: boolean },
      _options?: { pathname?: string; replace?: boolean }
    ) => {
      storeSetFilter(nextFilter);
    },
    [storeSetFilter]
  );

  return { router: null, filter, setFilter, resetFilter };
}
