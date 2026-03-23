import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFilterBySearchParams } from "@/lib/hooks/useSearchInfoMeta";
import type { FilterFieldMeta } from "@/types/search";
import { debounce } from "@/utils/debounce";

import { Button, Icon, Input, Select } from "../atoms";

export const DEFAULT_ORDER_BY: Record<string, "ASC" | "DESC"> = {
  modifiedDate: "DESC",
  createdDate: "ASC",
};

export const DEFAULT_PAGE_SIZE = 14;
export const DEFAULT_PAGE_SIZE_OPTIONS = [
  {
    value: DEFAULT_PAGE_SIZE,
    label: DEFAULT_PAGE_SIZE.toString(),
  },
].concat(
  Array.from({ length: 5 }, (_, i) => ({
    value: ((i + 3) * DEFAULT_PAGE_SIZE) / 2,
    label: `${((i + 3) * DEFAULT_PAGE_SIZE) / 2}`,
  }))
);
interface PaginationProps {
  className?: string;
  fields?: FilterFieldMeta[];
  isLoading?: boolean;
  defaultPageSize?: number;
  filter?: Record<string, unknown>;
  onChangeFilter?: (filter: Record<string, unknown>) => void;
}

function Pagination({
  className,
  fields,
  isLoading,
  defaultPageSize,
  filter,
  onChangeFilter,
}: PaginationProps) {
  const { filter: routeFilter, setFilter: setRouteFilter } =
    useFilterBySearchParams(defaultPageSize);
  const useExternalFilter =
    typeof onChangeFilter === "function" || filter !== undefined;
  const activeFilter = useExternalFilter ? (filter ?? {}) : routeFilter;
  const setActiveFilter = useCallback(
    (nextFilter: Record<string, unknown>) => {
      if (useExternalFilter) {
        onChangeFilter?.(nextFilter);
        return;
      }
      setRouteFilter(nextFilter as Parameters<typeof setRouteFilter>[0]);
    },
    [onChangeFilter, setRouteFilter, useExternalFilter]
  );

  const [isInitialized, setIsInitialized] = useState(false);
  const [isPageNumberInputFocused, setIsPageNumberInputFocused] =
    useState(false);
  const [sortMetaItems, setSortMetaItems] = useState<
    {
      label: string;
      field: string;
      sortState: "ASC" | "DESC";
      show: boolean;
    }[]
  >([]);

  const defaultPageSizeOptions = [
    {
      value: defaultPageSize ?? DEFAULT_PAGE_SIZE,
      label: (defaultPageSize ?? DEFAULT_PAGE_SIZE).toString(),
    },
  ].concat(
    Array.from({ length: 5 }, (_, i) => ({
      value: ((i + 3) * (defaultPageSize ?? DEFAULT_PAGE_SIZE)) / 2,
      label: `${((i + 3) * (defaultPageSize ?? DEFAULT_PAGE_SIZE)) / 2}`,
    }))
  );

  const pageNumberInputRef = useRef<HTMLInputElement>(null);

  const pageNumber = (activeFilter.pageNumber as number) ?? 1;
  const pageSize =
    (activeFilter.pageSize as number) ?? defaultPageSizeOptions[0].value;
  const totalCount = (activeFilter.totalCount as number) ?? 0;

  const getLabel = useCallback(
    (field: string) => {
      const display = fields?.find((f) => f.field === field)?.display;
      const fallback = field
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      return display ?? fallback;
    },
    [fields]
  );

  const orderBy = useMemo(
    () =>
      (fields ?? []).reduce(
        (acc, f) => {
          if (f.order) {
            acc[f.field] = "DESC";
          }
          return acc;
        },
        { ...(activeFilter.orderBy as Record<string, "ASC" | "DESC">) }
      ),
    [activeFilter, fields]
  );

  const debouncedSetPageNumber = useMemo(
    () =>
      debounce((pageNumber: number) => {
        setActiveFilter({
          ...activeFilter,
          pageNumber,
        });
      }, 200),
    [activeFilter, setActiveFilter]
  );

  const debouncedSetPageSize = useMemo(
    () =>
      debounce((pageSize: number) => {
        setActiveFilter({
          ...activeFilter,
          pageNumber: 1,
          pageSize,
        });
      }, 200),
    [activeFilter, setActiveFilter]
  );

  const debouncedSetSort = useMemo(
    () =>
      debounce((orderBy: Record<string, "ASC" | "DESC">) => {
        setActiveFilter({ ...activeFilter, orderBy });
      }, 200),
    [activeFilter, setActiveFilter]
  );

  const totalPages = useMemo(() => {
    return Math.ceil(totalCount / pageSize) || 1;
  }, [totalCount, pageSize]);

  const fallbackSortItem = useMemo(() => {
    const [activeField, activeSortState] =
      Object.entries(activeFilter.orderBy ?? {})[0] ??
      Object.entries(DEFAULT_ORDER_BY)[0] ??
      [];
    if (!activeField || !activeSortState) {
      return null;
    }
    return {
      field: activeField,
      sortState: activeSortState,
      label: getLabel(activeField),
    };
  }, [activeFilter.orderBy, getLabel]);

  const isSortMetaReady = Boolean(fields?.length) && !isLoading;
  const hasVisibleSortItem = sortMetaItems.some((item) => item.show);
  const shouldShowFallbackSort =
    !hasVisibleSortItem && fallbackSortItem !== null;

  const toggleFallbackSort = useCallback(() => {
    if (!fallbackSortItem || !isSortMetaReady) {
      return;
    }
    const nextSortState = fallbackSortItem.sortState === "ASC" ? "DESC" : "ASC";
    debouncedSetSort({
      [fallbackSortItem.field]: nextSortState,
    });
  }, [debouncedSetSort, fallbackSortItem, isSortMetaReady]);

  const toSortMetaItems = useCallback(
    (orderBy: Record<string, "ASC" | "DESC">) => {
      const items: {
        label: string;
        field: string;
        sortState: "ASC" | "DESC";
        show: boolean;
      }[] = [];
      Object.entries(orderBy).forEach(([field]) => {
        const label = getLabel(field);
        items.push({
          label,
          field,
          sortState: "DESC",
          show: false,
        });
        items.push({
          label,
          field,
          sortState: "ASC",
          show: false,
        });
      });
      Object.entries(activeFilter.orderBy ?? {}).forEach(
        ([field, sortState]) => {
          const item = items.find(
            (item) => item.field === field && item.sortState === sortState
          );
          if (item) {
            item.show = true;
            setIsInitialized(true);
          }
        }
      );
      return items;
    },
    [activeFilter, getLabel]
  );

  const toggleSortMetaItem = useCallback(
    (currentItem: (typeof sortMetaItems)[number]) => {
      const items = sortMetaItems.map((item) => ({ ...item, show: false }));
      const nextSortState = currentItem.sortState === "ASC" ? "DESC" : "ASC";
      const nextItem =
        items.find(
          (item) =>
            item.field === currentItem.field && item.sortState === nextSortState
        ) ?? items.find((item) => item.field === currentItem.field);
      if (!nextItem) {
        return;
      }
      nextItem.show = true;
      setSortMetaItems(items);
      debouncedSetSort({
        [nextItem.field]: nextItem.sortState,
      });
    },
    [debouncedSetSort, sortMetaItems]
  );

  useEffect(() => {
    if (isLoading || Object.keys(orderBy).length === 0 || isInitialized) {
      return;
    }
    setSortMetaItems(toSortMetaItems(orderBy));
  }, [isLoading, isInitialized, orderBy, toSortMetaItems]);

  return (
    <div className={`pagination${className ? ` ${className}` : ""}`}>
      <Button
        style="transparent"
        onClick={() => {
          debouncedSetPageNumber(pageNumber - 1);
        }}
        disabled={pageNumber === 1}
      >
        <Icon iconType="icon-left" size="sm" />
      </Button>
      {!isPageNumberInputFocused && (
        <Input
          className="pagination__page-input"
          border="underline"
          value={`${pageNumber} / ${totalPages}`}
          onChange={() => {}}
          onClick={() => {
            setIsPageNumberInputFocused(true);
            const timeout = setTimeout(() => {
              pageNumberInputRef.current?.focus();
              clearTimeout(timeout);
            }, 0);
          }}
        />
      )}
      {isPageNumberInputFocused && (
        <Input
          inputRef={pageNumberInputRef}
          type="number"
          className="pagination__page-input"
          border="underline"
          defaultValue={pageNumber.toString()}
          min={1}
          max={totalPages}
          onPressReturn={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const newPageNumber = parseInt(e.currentTarget.value);
            if (newPageNumber > totalPages) {
              debouncedSetPageNumber(totalPages);
            } else if (newPageNumber < 1) {
              debouncedSetPageNumber(1);
            } else {
              debouncedSetPageNumber(newPageNumber);
            }
            setIsPageNumberInputFocused(false);
          }}
          onBlur={() => {
            setIsPageNumberInputFocused(false);
          }}
        />
      )}
      <Button
        style="transparent"
        onClick={() => {
          debouncedSetPageNumber(pageNumber + 1);
        }}
        disabled={pageNumber === totalPages}
      >
        <Icon iconType="icon-right" size="sm" />
      </Button>
      {sortMetaItems.map(
        (item) =>
          item.show && (
            <Button
              key={`${item.field}_${item.sortState}`}
              className="button__sort"
              style="transparent"
              title={item.label}
              disabled={!isSortMetaReady}
              onClick={() => {
                toggleSortMetaItem(item);
              }}
            >
              <Icon
                iconType={
                  item.sortState === "ASC" ? "icon-sort-up" : "icon-sort-down"
                }
              />
            </Button>
          )
      )}
      {shouldShowFallbackSort && fallbackSortItem && (
        <Button
          className="button__sort"
          style="transparent"
          title={fallbackSortItem.label}
          disabled={!isSortMetaReady}
          onClick={toggleFallbackSort}
        >
          <Icon
            iconType={
              fallbackSortItem.sortState === "ASC"
                ? "icon-sort-up"
                : "icon-sort-down"
            }
          />
        </Button>
      )}
      <Select
        options={defaultPageSizeOptions}
        value={pageSize}
        onChange={(e) => {
          debouncedSetPageSize(parseInt(e.target.value));
        }}
        className="pagination__page-size-select"
      />
      <label>Items per page</label>
    </div>
  );
}

export default Pagination;
