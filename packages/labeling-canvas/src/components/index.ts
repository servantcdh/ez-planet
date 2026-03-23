/**
 * Re-export real atom components for @/components barrel.
 * Only components without atom implementations use inline stubs.
 */
import React, { type ReactNode } from "react";

/* ---- Real atom re-exports ---- */
export { default as Badge } from "./atoms/Badge";
export { default as Button } from "./atoms/Button";
export { default as Checkbox } from "./atoms/Checkbox";
export { default as Icon } from "./atoms/Icon";
export { default as Input } from "./atoms/Input";
export { default as LabeledField } from "./atoms/LabeledField";
export { default as Select } from "./atoms/Select";
export { default as Status } from "./atoms/Status";
export { default as Step } from "./atoms/Step";
export { default as Tabs } from "./atoms/Tabs";
export { default as Title } from "./atoms/Title";
export { default as Wrapper } from "./atoms/Wrapper";

/* ---- Molecule re-exports ---- */
export { default as Tip } from "./molecules/Tip";

/* ------------------------------------------------------------------ */
/*  Pagination (no atom implementation – keep stub)                   */
/* ------------------------------------------------------------------ */

export interface PaginationProps {
  page?: number;
  total?: number;
  fields?: unknown;
  isLoading?: boolean;
  defaultPageSize?: number;
  filter?: Record<string, unknown>;
  onChange?: (page: number) => void;
  onChangeFilter?: (filter: Record<string, unknown>) => void;
  className?: string;
}

export function Pagination({ className }: PaginationProps) {
  return React.createElement("div", { className });
}
