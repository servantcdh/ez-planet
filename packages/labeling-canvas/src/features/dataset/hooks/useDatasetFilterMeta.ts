import { useSearchInfoMeta } from "@/lib/hooks/useSearchInfoMeta";

const DATASET_SEARCH_INFO_BASE_URL =
  "/datacuration/dataset-management/search-info";

export function useDatasetFilterMeta(service: string | undefined) {
  return useSearchInfoMeta({
    service,
    baseUrl: DATASET_SEARCH_INFO_BASE_URL,
    scope: "dataset",
  });
}
