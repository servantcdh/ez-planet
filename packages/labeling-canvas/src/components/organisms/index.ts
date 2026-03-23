/**
 * Stub organism components for library compilation.
 */
import React, { type ReactNode } from "react";

/* ------------------------------------------------------------------ */
/*  FilterToolbar                                                     */
/* ------------------------------------------------------------------ */

export interface FilterToolbarProps {
  fields?: unknown;
  isLoading?: boolean;
  filter?: Record<string, unknown>;
  onChangeFilter?: (filter: Record<string, unknown>) => void;
  className?: string;
  children?: ReactNode;
}

export function FilterToolbar({ children, className }: FilterToolbarProps) {
  return React.createElement("div", { className }, children);
}
