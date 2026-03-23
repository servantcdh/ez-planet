import type { FilterFieldMeta } from "@/types/search";

interface FilterToolbarProps {
  className?: string;
  fields?: FilterFieldMeta[];
  isLoading?: boolean;
  filter?: Record<string, unknown>;
  onChangeFilter?: (filter: Record<string, unknown>) => void;
}

/**
 * Stub FilterToolbar component.
 */
function FilterToolbar(_props: FilterToolbarProps) {
  return null;
}

export default FilterToolbar;
